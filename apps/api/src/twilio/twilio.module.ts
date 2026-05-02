import { Module } from '@nestjs/common';
import { TwilioController } from './twilio.controller.js';

@Module({
  controllers: [TwilioController],
})
export class TwilioModule {}
