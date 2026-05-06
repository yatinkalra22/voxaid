import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranscriptionService } from './transcription.service.js';
import { ClaudeService } from '../claude/claude.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface TranscriptionJobData {
  audioUrl: string;
  source: 'ivr' | 'whatsapp';
  callSid?: string;
  from?: string;
  name?: string;
}

interface GeoPoint {
  latitude: number;
  longitude: number;
}

const COUNTRY_CENTERS: { prefix: string; lat: number; lng: number }[] = [
  // Longest prefixes first so +1-something doesn't shadow +1.
  { prefix: '+880', lat: 23.8103, lng: 90.4125 }, // Bangladesh — Dhaka
  { prefix: '+233', lat: 5.6037, lng: -0.187 }, // Ghana — Accra
  { prefix: '+254', lat: -1.2921, lng: 36.8219 }, // Kenya — Nairobi
  { prefix: '+91', lat: 22.5726, lng: 88.3639 }, // India — Kolkata-ish
  { prefix: '+92', lat: 33.6844, lng: 73.0479 }, // Pakistan — Islamabad
  { prefix: '+62', lat: -6.2088, lng: 106.8456 }, // Indonesia — Jakarta
  { prefix: '+52', lat: 19.4326, lng: -99.1332 }, // Mexico — Mexico City
  { prefix: '+55', lat: -23.5505, lng: -46.6333 }, // Brazil — São Paulo
  { prefix: '+86', lat: 39.9042, lng: 116.4074 }, // China — Beijing
  { prefix: '+44', lat: 51.5074, lng: -0.1278 }, // UK — London
  { prefix: '+1', lat: 38.9072, lng: -77.0369 }, // US/Canada — DC
];

function hashJitter(seed: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  const u = (h >>> 0) % 1024;
  const v = (h >>> 10) % 1024;
  return { lat: (u / 1024 - 0.5) * 4, lng: (v / 1024 - 0.5) * 4 }; // ±2°
}

/**
 * Map a phone number's country code to an ISO 639-1 language hint for
 * Whisper. Without a hint, whisper-large-v3 frequently hallucinates short
 * English nonsense ("It is written by Aditya") on Hindi audio.
 */
function inferLanguageFromPhone(phone: string | undefined): string | undefined {
  if (!phone || !phone.startsWith('+')) return undefined;
  if (phone.startsWith('+880')) return 'bn';
  if (phone.startsWith('+233')) return 'en';
  if (phone.startsWith('+254')) return 'sw';
  if (phone.startsWith('+91')) return 'hi';
  if (phone.startsWith('+92')) return 'ur';
  if (phone.startsWith('+62')) return 'id';
  if (phone.startsWith('+52')) return 'es';
  if (phone.startsWith('+55')) return 'pt';
  if (phone.startsWith('+86')) return 'zh';
  if (phone.startsWith('+44')) return 'en';
  if (phone.startsWith('+1')) return 'en';
  return undefined;
}

function inferLocationFromPhone(phone: string | undefined): GeoPoint | null {
  if (!phone || !phone.startsWith('+')) return null;
  const center = COUNTRY_CENTERS.find((c) => phone.startsWith(c.prefix));
  if (!center) return null;
  const j = hashJitter(phone);
  return {
    latitude: center.lat + j.lat,
    longitude: center.lng + j.lng,
  };
}

/**
 * Runs the full screening pipeline inline (no queue):
 * Whisper ASR → ML biomarkers + name extraction → action plan → DB persist.
 *
 * Previously processed via BullMQ on Upstash Redis. BullMQ's idle polling
 * burned the Upstash free-tier quota even with no traffic, so we run inline.
 * Twilio webhook handlers should call run() fire-and-forget so the webhook
 * returns within Twilio's 15s timeout.
 */
@Injectable()
export class ScreeningPipelineService {
  private readonly logger = new Logger(ScreeningPipelineService.name);
  private readonly mlServiceUrl: string;

  constructor(
    private readonly transcription: TranscriptionService,
    private readonly claudeService: ClaudeService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mlServiceUrl =
      this.config.get<string>('ML_SERVICE_URL') || 'http://localhost:8001';
  }

  async run(data: TranscriptionJobData): Promise<void> {
    this.logger.log(`Processing ${data.source} audio from ${data.from ?? 'anon'}`);

    // Step 1: Transcribe via Whisper with a country-code language hint.
    const languageHint = inferLanguageFromPhone(data.from);
    const { text, language } = await this.transcription.transcribe(
      data.audioUrl,
      languageHint,
    );
    this.logger.log(
      `Transcribed: hint=${languageHint ?? 'auto'} lang=${language} text="${text.slice(0, 80)}..."`,
    );

    // Guard: if the caller didn't actually speak (hung up, cut off, or only
    // background noise), the transcript is empty or near-empty. Skip the rest
    // of the pipeline — otherwise the ML biomarker model still produces a
    // confident score on noise, polluting the dashboard with bogus "critical
    // risk" entries on calls where nothing was said.
    const trimmedText = text.trim();
    if (trimmedText.length < 10) {
      this.logger.warn(
        `Skipping screening — transcript too short (${trimmedText.length} chars). ` +
          `Caller likely hung up or was cut off before speaking. ` +
          `from=${data.from ?? 'anon'} callSid=${data.callSid ?? '-'}`,
      );
      return;
    }

    // Step 2: ML biomarkers + name extraction in parallel.
    const [mlResult, extractedNameFromTranscript] = await Promise.all([
      this.classifyAudio(data.audioUrl),
      this.claudeService.extractName(text),
    ]);
    this.logger.log(
      `ML result: score=${mlResult.depressionScore} risk=${mlResult.riskLevel}`,
    );

    // Step 3: Find or create patient, then persist screening.
    const extractedName = data.name ?? extractedNameFromTranscript ?? undefined;
    const phone = data.from ?? `anon-${data.callSid ?? Date.now()}`;
    const displayName = extractedName ?? data.from ?? 'Anonymous Caller';
    const geo = inferLocationFromPhone(data.from);
    const patient = await this.prisma.patient.upsert({
      where: { phone },
      update: extractedName ? { name: extractedName } : {},
      create: {
        name: displayName,
        phone,
        language,
        assignedChwId: 'chw-demo-1',
        ...(geo ? { latitude: geo.latitude, longitude: geo.longitude } : {}),
      },
    });
    this.logger.log(
      `Patient: id=${patient.id} name="${patient.name}" phone="${patient.phone}"`,
    );

    // Step 4: Action plan + English translation in parallel.
    const [actionPlan, transcriptEn] = await Promise.all([
      this.claudeService.generateActionPlan({
        patientName: patient.name,
        language,
        transcript: text,
        depressionScore: mlResult.depressionScore,
        riskLevel: mlResult.riskLevel,
        biomarkers: mlResult.biomarkers,
      }),
      this.claudeService.translateToEnglish(text, language).catch(() => null),
    ]);
    this.logger.log(
      `Action plan generated: urgency=${actionPlan.urgency}; translated=${transcriptEn ? 'yes' : 'no'}`,
    );

    // Step 5: Save screening to DB.
    const screening = await this.prisma.screening.create({
      data: {
        patientId: patient.id,
        audioUrl: data.audioUrl,
        transcript: text,
        transcriptEn,
        language,
        depressionScore: mlResult.depressionScore,
        depressionRisk: mlResult.riskLevel as
          | 'low'
          | 'moderate'
          | 'high'
          | 'critical',
        biomarkers: mlResult.biomarkers,
        actionPlan: actionPlan.actionPlan,
        source: data.source,
        callSid: data.callSid ?? null,
      },
    });
    this.logger.log(`Screening saved: ${screening.id}`);

    // Step 6: TTS callback for high/critical risk — disabled for the demo.
    // Re-enable once consent capture and on-call moderation are in place.
    if (
      phone !== 'unknown' &&
      (mlResult.riskLevel === 'high' || mlResult.riskLevel === 'critical')
    ) {
      this.logger.log(
        `Patient callback skipped (disabled for demo): screening=${screening.id} risk=${mlResult.riskLevel}`,
      );
    }
  }

  private async classifyAudio(audioUrl: string): Promise<{
    depressionScore: number;
    riskLevel: string;
    biomarkers: {
      f0Mean: number;
      jitter: number;
      shimmer: number;
      hnr: number;
      pauseRatio: number;
      speechRate: number;
    };
  }> {
    // Twilio recording + WhatsApp media URLs are private — Basic Auth required.
    const headers: Record<string, string> = {};
    if (audioUrl.startsWith('https://api.twilio.com/')) {
      const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
      const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
      if (sid && token) {
        headers.Authorization = `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`;
      }
    }

    const audioRes = await fetch(audioUrl, { headers });
    if (!audioRes.ok) {
      throw new Error(`Failed to fetch audio for ML: ${audioRes.status}`);
    }
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    const formData = new FormData();
    formData.append(
      'audio',
      new Blob([audioBuffer], { type: 'audio/wav' }),
      'recording.wav',
    );

    const mlRes = await fetch(`${this.mlServiceUrl}/classify`, {
      method: 'POST',
      body: formData,
    });

    if (!mlRes.ok) {
      throw new Error(`ML service error: ${mlRes.status}`);
    }

    const result = (await mlRes.json()) as {
      depression_score: number;
      risk_level: string;
      biomarkers: {
        f0_mean: number;
        jitter_local: number;
        shimmer_local: number;
        hnr_mean: number;
        pause_ratio: number;
        speech_rate: number;
      };
    };

    return {
      depressionScore: result.depression_score,
      riskLevel: result.risk_level,
      biomarkers: {
        f0Mean: result.biomarkers.f0_mean,
        jitter: result.biomarkers.jitter_local,
        shimmer: result.biomarkers.shimmer_local,
        hnr: result.biomarkers.hnr_mean,
        pauseRatio: result.biomarkers.pause_ratio,
        speechRate: result.biomarkers.speech_rate,
      },
    };
  }
}
