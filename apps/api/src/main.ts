import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Twilio sends webhooks as application/x-www-form-urlencoded
  app.use(urlencoded({ extended: true }));

  app.enableCors();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`VoxAID API running on http://localhost:${port}`);
}
bootstrap();
