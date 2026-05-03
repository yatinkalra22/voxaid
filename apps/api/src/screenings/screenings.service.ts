import {
  Injectable,
  Logger,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes — long enough for a demo session.

@Injectable()
export class ScreeningsService {
  private readonly logger = new Logger(ScreeningsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Mint a short-lived HMAC-signed token bound to a screening id. */
  signAudioToken(screeningId: string): { token: string; expiresAt: number } {
    const secret = this.config.get<string>('API_SECRET_KEY');
    if (!secret) throw new Error('API_SECRET_KEY not configured');
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const sig = crypto
      .createHmac('sha256', secret)
      .update(`${screeningId}|${expiresAt}`)
      .digest('base64url');
    return { token: `${expiresAt}.${sig}`, expiresAt };
  }

  /** Constant-time verify a token issued for `screeningId`. */
  verifyAudioToken(screeningId: string, token: string | undefined): boolean {
    if (!token) return false;
    const secret = this.config.get<string>('API_SECRET_KEY');
    if (!secret) return false;
    const dot = token.indexOf('.');
    if (dot < 1) return false;
    const expiresAt = Number(token.slice(0, dot));
    const sig = token.slice(dot + 1);
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${screeningId}|${expiresAt}`)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  async findById(id: string) {
    const screening = await this.prisma.screening.findUnique({ where: { id } });
    if (!screening) throw new NotFoundException({ ok: false, error: { code: 'NOT_FOUND' } });
    return screening;
  }

  /**
   * Fetch a Twilio recording with Basic Auth. Returns the upstream Response
   * so the caller can stream it onward without buffering.
   */
  async fetchTwilioAudio(audioUrl: string): Promise<Response> {
    const headers: Record<string, string> = {};
    if (audioUrl.startsWith('https://api.twilio.com/')) {
      const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
      const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
      if (sid && token) {
        headers.Authorization = `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`;
      }
    }
    const upstream = await fetch(audioUrl, { headers });
    if (!upstream.ok) {
      this.logger.warn(`Upstream audio fetch failed: ${upstream.status} ${audioUrl}`);
      throw new BadGatewayException({
        ok: false,
        error: { code: 'UPSTREAM_ERROR', status: upstream.status },
      });
    }
    return upstream;
  }
}
