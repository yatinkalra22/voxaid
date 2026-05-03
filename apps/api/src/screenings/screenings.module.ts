import { Module } from '@nestjs/common';
import { ScreeningsController } from './screenings.controller.js';
import { ScreeningsService } from './screenings.service.js';

@Module({
  controllers: [ScreeningsController],
  providers: [ScreeningsService],
})
export class ScreeningsModule {}
