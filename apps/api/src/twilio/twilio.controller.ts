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

    const apiBase = this.config.get<string>('API_BASE_URL');
    const nameAction = `${apiBase}/twilio/name?from=${encodeURIComponent(from)}`;

    const response = new twiml.VoiceResponse();
    response.pause({ length: 1 });

    // Step 1: Ask for the caller's name. Gather buffers speech until they
    // pause, then POSTs SpeechResult to /twilio/name. Recording follows
    // there so the caller doesn't speak over the prompt.
    const gather = response.gather({
      input: ['speech'],
      speechTimeout: 'auto',
      timeout: 5,
      action: nameAction,
      method: 'POST',
      language: 'en-IN',
    });
    gather.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      'Welcome to VoxAID. Please say your name.',
    );

    // Fallback if no speech is detected — proceed without a name.
    response.redirect({ method: 'POST' }, nameAction);

    res.type('text/xml');
    res.send(response.toString());
  }

  /**
   * POST /twilio/name — Receives SpeechResult from the name <Gather>,
   * thanks the caller by name, and starts the 30-second screening recording.
   * Both `from` and `name` are threaded into the recording callback URL.
   */
  @Post('name')
  handleNameAndRecord(@Req() req: Request, @Res() res: Response) {
    const fromQuery = typeof req.query.from === 'string' ? req.query.from : undefined;
    const from = fromQuery && fromQuery !== 'unknown' ? fromQuery : undefined;
    const speech = String(req.body?.SpeechResult ?? '').trim();
    // Twilio sometimes returns trailing punctuation on speech-to-text.
    const name = speech.replace(/[.,!?]+$/, '').trim() || undefined;
    this.logger.log(`Name capture: "${name ?? '(none)'}" from=${from ?? 'unknown'}`);

    const apiBase = this.config.get<string>('API_BASE_URL');
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (name) params.set('name', name);
    const recordingCallback = `${apiBase}/twilio/recording${params.toString() ? `?${params.toString()}` : ''}`;

    const response = new twiml.VoiceResponse();
    response.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      name
        ? `Thank you ${name}. After the beep, please describe how you have been feeling for the past two weeks.`
        : 'After the beep, please describe how you have been feeling for the past two weeks.',
    );
    response.record({
      maxLength: 30,
      playBeep: true,
      trim: 'do-not-trim',
      recordingStatusCallback: recordingCallback,
      recordingStatusCallbackMethod: 'POST',
      recordingStatusCallbackEvent: ['completed'],
    });
    response.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      'Thank you. A community health worker will follow up with you soon.',
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
    const fromQuery = typeof req.query.from === 'string' ? req.query.from : undefined;
    const nameQuery = typeof req.query.name === 'string' ? req.query.name : undefined;
    const from = fromQuery && fromQuery !== 'unknown' ? fromQuery : undefined;
    const name = nameQuery || undefined;

    this.logger.log(
      `Recording ready: sid=${RecordingSid} call=${CallSid} from=${from ?? 'unknown'} name=${name ?? '(none)'} duration=${RecordingDuration}s`,
    );
    const audioUrl = `${RecordingUrl}.wav`;
    this.logger.log(`Audio URL: ${audioUrl}`);

    // Enqueue for async Whisper transcription
    await this.transcriptionQueue.add('transcribe', {
      audioUrl,
      source: 'ivr',
      callSid: CallSid,
      from,
      name,
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
