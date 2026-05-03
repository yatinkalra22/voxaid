import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { WhisperService } from './whisper.service.js';
import { ClaudeService } from '../claude/claude.service.js';
import { TtsService } from '../tts/tts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TRANSCRIPTION_QUEUE } from '../queue/queue.module.js';

export interface TranscriptionJobData {
  audioUrl: string;
  source: 'ivr' | 'whatsapp';
  callSid?: string;
  from?: string;
  name?: string;
}

const NAME_INTROS = /(?:my name is|i am|i'm|this is|name is|call me|mera naam(?:\s+hai)?|mein hoon|main hoon)\s+([a-z][a-z'\-]*(?:\s+[a-z][a-z'\-]*)?)/i;
const FILLER_FIRST_WORDS = new Set(['i', 'hi', 'hello', 'hey', 'so', 'um', 'uh', 'well', 'okay', 'ok', 'yeah', 'yes', 'no', 'thank', 'thanks']);

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Looks-like-a-name guard: 2-30 alpha chars, not a filler. */
function isPlausibleName(s: string): boolean {
  if (!s) return false;
  const trimmed = s.trim();
  if (trimmed.length < 2 || trimmed.length > 30) return false;
  if (!/^[a-z][a-z'\- ]+$/i.test(trimmed)) return false;
  if (FILLER_FIRST_WORDS.has(trimmed.toLowerCase().split(' ')[0])) return false;
  return true;
}

/** Extract a likely caller name from the start of a Whisper transcript. */
function extractNameFromTranscript(transcript: string): string | undefined {
  if (!transcript) return undefined;
  const t = transcript.trim().replace(/^[^a-z]+/i, '');
  if (t.length < 4) return undefined; // Junk transcripts (e.g. just "hi.") never produce a real name.

  const m = t.match(NAME_INTROS);
  if (m?.[1] && isPlausibleName(m[1])) return titleCase(m[1].trim());

  // Fallback: first word if it doesn't look like a filler.
  const words = t.split(/[\s,.!?]+/).filter(Boolean).slice(0, 2);
  if (!words.length) return undefined;
  if (!isPlausibleName(words[0])) return undefined;
  return titleCase(words[0]);
}

/**
 * Map a phone number's country code to an ISO 639-1 language hint for
 * Whisper. This dramatically reduces hallucinations on short audio: without
 * a hint, Whisper auto-detect frequently picks Korean/Japanese/Vietnamese
 * for noisy English recordings.
 */
interface GeoPoint {
  latitude: number;
  longitude: number;
}

const COUNTRY_CENTERS: { prefix: string; lat: number; lng: number }[] = [
  // Longest prefixes first so +1-something doesn't shadow +1.
  { prefix: '+880', lat: 23.8103, lng: 90.4125 }, // Bangladesh — Dhaka
  { prefix: '+233', lat: 5.6037, lng: -0.187 }, // Ghana — Accra
  { prefix: '+254', lat: -1.2921, lng: 36.8219 }, // Kenya — Nairobi
  { prefix: '+91', lat: 22.5726, lng: 88.3639 }, // India — Kolkata-ish (centered between major cities)
  { prefix: '+92', lat: 33.6844, lng: 73.0479 }, // Pakistan — Islamabad
  { prefix: '+62', lat: -6.2088, lng: 106.8456 }, // Indonesia — Jakarta
  { prefix: '+52', lat: 19.4326, lng: -99.1332 }, // Mexico — Mexico City
  { prefix: '+55', lat: -23.5505, lng: -46.6333 }, // Brazil — São Paulo
  { prefix: '+86', lat: 39.9042, lng: 116.4074 }, // China — Beijing
  { prefix: '+44', lat: 51.5074, lng: -0.1278 }, // UK — London
  { prefix: '+1', lat: 38.9072, lng: -77.0369 }, // US/Canada — DC
];

/**
 * Stable hash of a string to two pseudo-random values in [-1, 1].
 * Used to jitter caller locations so multiple callers from the same
 * country don't stack on the same pixel on the map.
 */
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
 * Derive an approximate map location from the caller's phone country code,
 * with a per-caller jitter so different patients land on different pixels.
 * Returns null when we have no signal (anonymous caller, unknown country).
 */
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

function inferLanguageFromPhone(phone: string | undefined): string | undefined {
  if (!phone || !phone.startsWith('+')) return undefined;
  // Longest prefixes first so +1-something doesn't shadow +1.
  if (phone.startsWith('+880')) return 'bn'; // Bangladesh
  if (phone.startsWith('+233')) return 'en'; // Ghana (English official)
  if (phone.startsWith('+254')) return 'sw'; // Kenya — Swahili (also English)
  // India (+91): no hint. India has 22 official languages — Hindi, Marathi,
  // Punjabi, Tamil, Telugu, Bengali, etc. A blanket 'hi' hint mistranscribes
  // every non-Hindi caller. Whisper auto-detect with our temperature=0 +
  // domain prompt is reliable on 20-30s IVR audio.
  if (phone.startsWith('+92')) return 'ur'; // Pakistan
  if (phone.startsWith('+62')) return 'id'; // Indonesia
  if (phone.startsWith('+52')) return 'es'; // Mexico
  if (phone.startsWith('+55')) return 'pt'; // Brazil
  if (phone.startsWith('+86')) return 'zh'; // China
  if (phone.startsWith('+44')) return 'en'; // UK
  if (phone.startsWith('+1')) return 'en'; // US/Canada
  return undefined; // Let Whisper auto-detect when we have no signal.
}

/**
 * BullMQ worker that processes the full screening pipeline:
 * Whisper ASR → ML biomarkers → Claude action plan → DB persist → TTS callback
 */
@Injectable()
export class WhisperProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhisperProcessor.name);
  private readonly mlServiceUrl: string;
  private worker: Worker<TranscriptionJobData> | null = null;

  constructor(
    @Inject('REDIS_CONNECTION') private readonly redis: IORedis,
    private readonly whisperService: WhisperService,
    private readonly claudeService: ClaudeService,
    private readonly ttsService: TtsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mlServiceUrl =
      this.config.get<string>('ML_SERVICE_URL') || 'http://localhost:8001';
  }

  onModuleInit() {
    this.worker = new Worker<TranscriptionJobData>(
      TRANSCRIPTION_QUEUE,
      async (job: Job<TranscriptionJobData>) => {
        this.logger.log(`Processing job ${job.id}: ${job.data.source} audio`);

        // Step 1: Transcribe via Whisper. Pass a language hint based on
        // caller's country code so short/noisy audio doesn't get
        // auto-detected as Korean / random other languages.
        const languageHint = inferLanguageFromPhone(job.data.from);
        const { text, language } = await this.whisperService.transcribe(
          job.data.audioUrl,
          languageHint,
        );
        this.logger.log(
          `Transcribed: hint=${languageHint ?? 'auto'} lang=${language} text="${text.slice(0, 80)}..."`,
        );

        // Step 2: Call ML service for biomarkers + classification
        const mlResult = await this.classifyAudio(job.data.audioUrl);
        this.logger.log(
          `ML result: score=${mlResult.depressionScore} risk=${mlResult.riskLevel}`,
        );

        // Step 3: Find or create patient, then persist screening.
        // IVR uses a single combined prompt ("say your name and how you've been
        // feeling"), so we extract the name from the transcript itself rather
        // than from a separate Gather step.
        const extractedName = job.data.name ?? extractNameFromTranscript(text);
        // - Known caller (from is set) → one patient row, many screenings.
        // - Anonymous caller (no from) → unique row per call so they don't
        //   all collapse into a single "unknown" patient.
        const phone = job.data.from ?? `anon-${job.data.callSid ?? Date.now()}`;
        const displayName = extractedName ?? job.data.from ?? 'Anonymous Caller';
        // Country-code → approx coords, jittered per phone so multiple callers
        // from the same country don't stack on the same map pixel.
        const geo = inferLocationFromPhone(job.data.from);
        const patient = await this.prisma.patient.upsert({
          where: { phone },
          // Update the name on a return call only when a fresh name was captured.
          // Don't touch lat/long on update — preserves any CHW-curated location.
          update: extractedName ? { name: extractedName } : {},
          create: {
            name: displayName,
            phone,
            language,
            assignedChwId: 'chw-demo-1',
            ...(geo
              ? { latitude: geo.latitude, longitude: geo.longitude }
              : {}),
          },
        });
        this.logger.log(`Patient: id=${patient.id} name="${patient.name}" phone="${patient.phone}"`);

        // Step 4: Generate action plan + translate to English in parallel.
        // Translation is best-effort — never blocks the screening.
        const [actionPlan, transcriptEn] = await Promise.all([
          this.claudeService.generateActionPlan({
            patientName: patient.name,
            language,
            transcript: text,
            depressionScore: mlResult.depressionScore,
            riskLevel: mlResult.riskLevel,
            biomarkers: mlResult.biomarkers,
          }),
          this.claudeService
            .translateToEnglish(text, language)
            .catch(() => null),
        ]);
        this.logger.log(
          `Action plan generated: urgency=${actionPlan.urgency}; translated=${transcriptEn ? 'yes' : 'no'}`,
        );

        // Step 5: Save screening to DB
        const screening = await this.prisma.screening.create({
          data: {
            patientId: patient.id,
            audioUrl: job.data.audioUrl,
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
            source: job.data.source,
            callSid: job.data.callSid ?? null,
          },
        });
        this.logger.log(`Screening saved: ${screening.id}`);

        // Step 6: TTS callback for high/critical risk patients
        if (
          phone !== 'unknown' &&
          (mlResult.riskLevel === 'high' || mlResult.riskLevel === 'critical')
        ) {
          try {
            const { callSid } = await this.ttsService.speakAndCall({
              text: actionPlan.actionPlan,
              language,
              patientPhone: phone,
            });
            this.logger.log(`Patient callback initiated: callSid=${callSid}`);
          } catch (err) {
            // Non-fatal — screening is already saved
            this.logger.warn(
              `TTS callback failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        return { text, language, screeningId: screening.id };
      },
      {
        connection: this.redis,
        concurrency: 3,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('Whisper worker started (full pipeline)');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  /**
   * Call the FastAPI ML service to extract biomarkers and classify depression risk.
   * Uses native fetch — no extra dependency needed.
   */
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

    // Fetch the audio file
    const audioRes = await fetch(audioUrl, { headers });
    if (!audioRes.ok) {
      throw new Error(`Failed to fetch audio for ML: ${audioRes.status}`);
    }
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    // Send as multipart form to ML service
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

    // Map snake_case from Python to camelCase for TypeScript/Prisma
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
