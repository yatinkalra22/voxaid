import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

export const TRANSCRIPTION_QUEUE = 'transcription';

/**
 * Provides a shared Redis connection + BullMQ queue for async jobs.
 * Uses Upstash Redis with TLS (rediss:// protocol).
 * https://docs.bullmq.io/guide/connections
 */
@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CONNECTION',
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('UPSTASH_REDIS_URL');
        // Upstash requires TLS — ioredis handles rediss:// automatically
        return new IORedis(url!, { maxRetriesPerRequest: null });
      },
      inject: [ConfigService],
    },
    {
      provide: TRANSCRIPTION_QUEUE,
      useFactory: (redis: IORedis) => {
        return new Queue(TRANSCRIPTION_QUEUE, { connection: redis });
      },
      inject: ['REDIS_CONNECTION'],
    },
  ],
  exports: ['REDIS_CONNECTION', TRANSCRIPTION_QUEUE],
})
export class QueueModule {}
