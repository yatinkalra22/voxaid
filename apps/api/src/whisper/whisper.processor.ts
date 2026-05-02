import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { WhisperService } from './whisper.service.js';
import { TRANSCRIPTION_QUEUE } from '../queue/queue.module.js';

export interface TranscriptionJobData {
  audioUrl: string;
  source: 'ivr' | 'whatsapp';
  callSid?: string;
  from?: string;
}

/**
 * BullMQ worker that processes transcription jobs.
 * Picks up jobs from the 'transcription' queue, runs Whisper, and
 * stores results. Later features will chain biomarker extraction here.
 */
@Injectable()
export class WhisperProcessor implements OnModuleInit {
  private readonly logger = new Logger(WhisperProcessor.name);

  constructor(
    @Inject('REDIS_CONNECTION') private readonly redis: IORedis,
    private readonly whisperService: WhisperService,
  ) {}

  onModuleInit() {
    const worker = new Worker<TranscriptionJobData>(
      TRANSCRIPTION_QUEUE,
      async (job: Job<TranscriptionJobData>) => {
        this.logger.log(
          `Processing job ${job.id}: ${job.data.source} audio`,
        );

        const { text, language } = await this.whisperService.transcribe(
          job.data.audioUrl,
        );

        // TODO (Feature 4+): Chain to biomarker extraction + classification
        // TODO: Store transcript in DB via Prisma

        this.logger.log(
          `Job ${job.id} done: lang=${language} transcript="${text.slice(0, 80)}..."`,
        );

        return { text, language };
      },
      {
        connection: this.redis,
        concurrency: 3,
      },
    );

    worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('Whisper worker started');
  }
}
