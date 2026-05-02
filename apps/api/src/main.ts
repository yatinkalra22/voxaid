import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { urlencoded } from 'express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers (X-Frame-Options, CSP, HSTS, etc.)
  app.use(helmet());

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
  const { Logger } = await import('@nestjs/common');
  new Logger('Bootstrap').log(`VoxAID API running on port ${port}`);
}
bootstrap();
