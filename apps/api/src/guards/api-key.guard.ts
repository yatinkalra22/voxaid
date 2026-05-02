import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Protects internal API endpoints with a shared API key.
 * The Next.js frontend sends this in the x-api-key header.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('API_SECRET_KEY');
    if (!secret) {
      // If no key is configured, deny all requests (fail closed)
      throw new UnauthorizedException('API_SECRET_KEY not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-api-key'];

    if (provided !== secret) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
