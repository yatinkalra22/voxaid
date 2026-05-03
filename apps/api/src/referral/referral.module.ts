import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service.js';
import { ReferralController } from './referral.controller.js';
import { TtsModule } from '../tts/tts.module.js';

@Module({
  imports: [TtsModule],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
