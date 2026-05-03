import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { TwilioModule } from './twilio/twilio.module.js';
import { QueueModule } from './queue/queue.module.js';
import { WhisperModule } from './whisper/whisper.module.js';
import { ClaudeModule } from './claude/claude.module.js';
import { TtsModule } from './tts/tts.module.js';
import { ReferralModule } from './referral/referral.module.js';
import { ScreeningsModule } from './screenings/screenings.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global rate limit: 60 requests per 60 seconds per IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    PatientsModule,
    QueueModule,
    WhisperModule,
    ClaudeModule,
    TtsModule,
    ReferralModule,
    ScreeningsModule,
    TwilioModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
