import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TwilioModule } from './twilio/twilio.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TwilioModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
