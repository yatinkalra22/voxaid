import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import { ApiKeyGuard } from '../guards/api-key.guard.js';
import { ScreeningsService } from './screenings.service.js';

@Controller('screenings')
export class ScreeningsController {
  private readonly logger = new Logger(ScreeningsController.name);

  constructor(private readonly screenings: ScreeningsService) {}

  /**
   * GET /screenings/:id/audio-token
   * Server components hit this with x-api-key to mint a 10-min signed URL
   * the browser <audio> element can request directly.
   */
  @Get(':id/audio-token')
  @UseGuards(ApiKeyGuard)
  async getAudioToken(@Param('id') id: string) {
    await this.screenings.findById(id);
    return { ok: true, data: this.screenings.signAudioToken(id) };
  }

  /**
   * GET /screenings/:id/audio?token=...
   * Public, but only with a valid signed token. Streams the Twilio recording
   * with Basic Auth attached server-side; the client just receives audio bytes.
   */
  @Get(':id/audio')
  async streamAudio(
    @Param('id') id: string,
    @Query('token') token: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!this.screenings.verifyAudioToken(id, token)) {
      res.status(401).json({ ok: false, error: { code: 'INVALID_TOKEN' } });
      return;
    }
    const screening = await this.screenings.findById(id);
    if (!screening.audioUrl) {
      res.status(404).json({ ok: false, error: { code: 'NO_AUDIO' } });
      return;
    }

    const upstream = await this.screenings.fetchTwilioAudio(screening.audioUrl);

    res.status(200);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'audio/wav');
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=60');

    if (!upstream.body) {
      res.end();
      return;
    }

    const nodeStream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
    // Abort the upstream fetch if the client disconnects mid-stream.
    req.on('close', () => {
      if (!nodeStream.destroyed) nodeStream.destroy();
    });
    nodeStream.on('error', (err) => {
      this.logger.warn(`Stream error: ${err.message}`);
      if (!res.headersSent) res.status(502).end();
      else res.end();
    });
    nodeStream.pipe(res);
  }
}
