import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import twilio from 'twilio';

/**
 * Validates that incoming webhooks are genuinely from Twilio
 * using the X-Twilio-Signature header.
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
@Injectable()
export class TwilioSignatureGuard implements CanActivate {
  private readonly logger = new Logger(TwilioSignatureGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    if (!authToken) {
      this.logger.warn('TWILIO_AUTH_TOKEN not set — rejecting webhook');
      throw new ForbiddenException('Twilio auth not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers['x-twilio-signature'] as string;
    const url = `${this.config.get<string>('API_BASE_URL')}${request.originalUrl}`;
    const params = request.body ?? {};

    const isValid = twilio.validateRequest(authToken, signature, url, params);

    if (!isValid) {
      this.logger.warn(`Invalid Twilio signature for ${request.originalUrl}`);
      throw new ForbiddenException('Invalid Twilio signature');
    }

    return true;
  }
}
