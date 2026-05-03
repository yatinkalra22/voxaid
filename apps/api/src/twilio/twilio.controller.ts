import { Controller, Post, Req, Res, Logger, Inject, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { twiml } from 'twilio';
import { Queue } from 'bullmq';
import { TRANSCRIPTION_QUEUE } from '../queue/queue.module.js';
import type { TranscriptionJobData } from '../whisper/whisper.processor.js';
import { TwilioSignatureGuard } from '../guards/twilio-signature.guard.js';

@Controller('twilio')
@UseGuards(TwilioSignatureGuard)
export class TwilioController {
  private readonly logger = new Logger(TwilioController.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(TRANSCRIPTION_QUEUE) private readonly transcriptionQueue: Queue,
  ) {}

  /**
   * POST /twilio/voice — Twilio hits this when a call comes in.
   * Returns TwiML that greets the caller and records 30s of speech.
   * https://www.twilio.com/docs/voice/twiml/record
   */
  @Post('voice')
  handleIncomingCall(@Req() req: Request, @Res() res: Response) {
    const from = req.body?.From ?? 'unknown';
    this.logger.log(`Incoming call from ${from}`);

    const response = new twiml.VoiceResponse();

    // Brief pause so the caller is ready
    response.pause({ length: 1 });

    response.say(
      {
        voice: 'Polly.Aditi', // Hindi-accented English — works for demo
        language: 'en-IN',
      },
      'Welcome to VoxAID. Please describe how you have been feeling over the past two weeks. Speak naturally for about 30 seconds.',
    );

    // Record up to 30 seconds of speech, then POST to /twilio/recording
    response.record({
      maxLength: 30,
      playBeep: true,
      trim: 'do-not-trim',
      recordingStatusCallback: `${this.config.get<string>('API_BASE_URL')}/twilio/recording`,
      recordingStatusCallbackMethod: 'POST',
      recordingStatusCallbackEvent: ['completed'],
    });

    // After recording completes, thank and hang up
    response.say(
      {
        voice: 'Polly.Aditi',
        language: 'en-IN',
      },
      'Thank you. Your response has been recorded. A community health worker will follow up with you soon.',
    );
    response.hangup();

    res.type('text/xml');
    res.send(response.toString());
  }

  /**
   * POST /twilio/recording — Twilio calls this when recording is ready.
   * We get the RecordingUrl to fetch the audio file.
   * https://www.twilio.com/docs/voice/api/recording-resource
   */
  @Post('recording')
  async handleRecordingCallback(@Req() req: Request, @Res() res: Response) {
    const { RecordingUrl, RecordingSid, CallSid, RecordingDuration } = req.body;

    this.logger.log(
      `Recording ready: sid=${RecordingSid} call=${CallSid} duration=${RecordingDuration}s`,
    );
    const audioUrl = `${RecordingUrl}.wav`;
    this.logger.log(`Audio URL: ${audioUrl}`);

    // Enqueue for async Whisper transcription
    await this.transcriptionQueue.add('transcribe', {
      audioUrl,
      source: 'ivr',
      callSid: CallSid,
    } satisfies TranscriptionJobData);

    res.status(200).send('OK');
  }

  /**
   * POST /twilio/whatsapp — Twilio WhatsApp sandbox webhook.
   * Handles incoming WhatsApp messages with voice notes (MediaUrl0).
   * https://www.twilio.com/docs/whatsapp/api#receiving-messages
   */
  @Post('whatsapp')
  async handleWhatsAppMessage(@Req() req: Request, @Res() res: Response) {
    const { From, Body, NumMedia, MediaUrl0, MediaContentType0 } = req.body;

    this.logger.log(`WhatsApp from ${From}: "${Body}" media=${NumMedia}`);

    const response = new twiml.MessagingResponse();

    const hasAudio =
      parseInt(NumMedia || '0', 10) > 0 &&
      MediaContentType0?.startsWith('audio/');

    if (hasAudio) {
      this.logger.log(`Voice note received: ${MediaUrl0}`);

      // Enqueue for async Whisper transcription
      await this.transcriptionQueue.add('transcribe', {
        audioUrl: MediaUrl0,
        source: 'whatsapp',
        from: From,
      } satisfies TranscriptionJobData);

      response.message(
        'Thank you. We received your voice note and are analyzing it. You will receive your results shortly.',
      );
    } else {
      response.message(
        'Welcome to VoxAID. Please send a voice note (30 seconds) describing how you have been feeling over the past two weeks.',
      );
    }

    res.type('text/xml');
    res.send(response.toString());
  }
}
