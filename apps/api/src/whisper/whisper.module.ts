import { Module } from '@nestjs/common';
import { TranscriptionService } from './transcription.service.js';
import { ScreeningPipelineService } from './whisper.pipeline.js';
import { ClaudeModule } from '../claude/claude.module.js';
import { TtsModule } from '../tts/tts.module.js';

@Module({
  imports: [ClaudeModule, TtsModule],
  providers: [TranscriptionService, ScreeningPipelineService],
  exports: [TranscriptionService, ScreeningPipelineService],
})
export class WhisperModule {}
