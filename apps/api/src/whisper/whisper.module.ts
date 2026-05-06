import { Module } from '@nestjs/common';
import { WhisperService } from './whisper.service.js';
import { ScreeningPipelineService } from './whisper.pipeline.js';
import { ClaudeModule } from '../claude/claude.module.js';
import { TtsModule } from '../tts/tts.module.js';

@Module({
  imports: [ClaudeModule, TtsModule],
  providers: [WhisperService, ScreeningPipelineService],
  exports: [WhisperService, ScreeningPipelineService],
})
export class WhisperModule {}
