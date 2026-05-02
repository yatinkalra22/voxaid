import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TwilioModule } from './twilio/twilio.module.js';
import { QueueModule } from './queue/queue.module.js';
import { WhisperModule } from './whisper/whisper.module.js';
import { ClaudeModule } from './claude/claude.module.js';
import { TtsModule } from './tts/tts.module.js';
import { ReferralModule } from './referral/referral.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QueueModule,
    WhisperModule,
    ClaudeModule,
    TtsModule,
    ReferralModule,
    TwilioModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
