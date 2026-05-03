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

        // Step 1: Transcribe via Whisper
        const { text, language } = await this.whisperService.transcribe(
          job.data.audioUrl,
        );
        this.logger.log(
          `Transcribed: lang=${language} text="${text.slice(0, 80)}..."`,
        );

        // Step 2: Call ML service for biomarkers + classification
        const mlResult = await this.classifyAudio(job.data.audioUrl);
        this.logger.log(
          `ML result: score=${mlResult.depressionScore} risk=${mlResult.riskLevel}`,
        );

        // Step 3: Find or create patient, then persist screening
        const phone = job.data.from ?? 'unknown';
        const patient = await this.prisma.patient.upsert({
          where: { phone },
          update: {},
          create: {
            name: phone, // placeholder — updated by CHW later
            phone,
            language,
            assignedChwId: 'chw-demo-1',
          },
        });

        // Step 4: Generate action plan via Claude
        const actionPlan = await this.claudeService.generateActionPlan({
          patientName: patient.name,
          language,
          transcript: text,
          depressionScore: mlResult.depressionScore,
          riskLevel: mlResult.riskLevel,
          biomarkers: mlResult.biomarkers,
        });
        this.logger.log(`Action plan generated: urgency=${actionPlan.urgency}`);

        // Step 5: Save screening to DB
        const screening = await this.prisma.screening.create({
          data: {
            patientId: patient.id,
            audioUrl: job.data.audioUrl,
            transcript: text,
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
