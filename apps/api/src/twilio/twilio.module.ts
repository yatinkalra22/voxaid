import { Module } from '@nestjs/common';
import { TwilioController } from './twilio.controller.js';
import { WhisperModule } from '../whisper/whisper.module.js';

@Module({
  imports: [WhisperModule],
  controllers: [TwilioController],
})
export class TwilioModule {}
