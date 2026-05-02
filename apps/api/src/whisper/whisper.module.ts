import { Module } from '@nestjs/common';
import { WhisperService } from './whisper.service.js';
import { WhisperProcessor } from './whisper.processor.js';
import { ClaudeModule } from '../claude/claude.module.js';
import { TtsModule } from '../tts/tts.module.js';

@Module({
  imports: [ClaudeModule, TtsModule],
  providers: [WhisperService, WhisperProcessor],
  exports: [WhisperService],
})
export class WhisperModule {}
