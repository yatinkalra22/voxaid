import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Twilio sends webhooks as application/x-www-form-urlencoded
  app.use(urlencoded({ extended: true }));

  // Restrict CORS to known frontends — never allow all origins
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`VoxAID API running on http://localhost:${port}`);
}
bootstrap();
