import { Module } from '@nestjs/common';
import { WhisperService } from './whisper.service.js';
import { WhisperProcessor } from './whisper.processor.js';

@Module({
  providers: [WhisperService, WhisperProcessor],
  exports: [WhisperService],
})
export class WhisperModule {}
