import { Controller, Post, Req, Res, Logger, Inject, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { twiml } from 'twilio';
import { Queue } from 'bullmq';
import { TRANSCRIPTION_QUEUE } from '../queue/queue.module.js';
import type { TranscriptionJobData } from '../whisper/whisper.processor.js';
import { TwilioSignatureGuard } from '../guards/twilio-signature.guard.js';

/**
 * Pick a Polly voice + prompt language based on caller's country code.
 * Polly.Aditi can speak both English (en-IN) and Hindi (hi-IN).
 */
function pickVoice(from: string) {
  if (from.startsWith('+91')) {
    return {
      voice: 'Polly.Aditi',
      language: 'hi-IN',
      welcome:
        'VoxAID में आपका स्वागत है। बीप के बाद, कृपया अपना नाम बताएं और पिछले दो हफ्तों में आप कैसा महसूस कर रहे हैं।',
      thanks: 'धन्यवाद। एक स्वास्थ्य कार्यकर्ता जल्द ही आपसे संपर्क करेगा।',
    } as const;
  }
  if (from.startsWith('+52')) {
    return {
      voice: 'Polly.Lupe',
      language: 'es-US',
      welcome:
        'Bienvenido a VoxAID. Después del tono, diga su nombre y cómo se ha sentido durante las últimas dos semanas.',
      thanks:
        'Gracias. Un trabajador de salud comunitaria se comunicará con usted pronto.',
    } as const;
  }
  return {
    voice: 'Polly.Aditi',
    language: 'en-IN',
    welcome:
      'Welcome to VoxAID. After the beep, please say your name and describe how you have been feeling for the past two weeks.',
    thanks:
      'Thank you. A community health worker will follow up with you soon.',
  } as const;
}

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
    const recordingCallback = `${apiBase}/twilio/recording?from=${encodeURIComponent(from)}`;
    // <Record> defaults its action to the current URL — without an explicit
    // action, after the recording ends Twilio POSTs back to /twilio/voice
    // and the IVR loops. Point action at /twilio/done to end the call cleanly.
    const doneAction = `${apiBase}/twilio/done`;

    const v = pickVoice(from);
    const response = new twiml.VoiceResponse();
    response.pause({ length: 1 });
    response.say({ voice: v.voice, language: v.language }, v.welcome);
    response.record({
      maxLength: 30,
      playBeep: true,
      trim: 'do-not-trim',
      action: doneAction,
      method: 'POST',
      recordingStatusCallback: recordingCallback,
      recordingStatusCallbackMethod: 'POST',
      recordingStatusCallbackEvent: ['completed'],
    });

    res.type('text/xml');
    res.send(response.toString());
  }

  /**
   * POST /twilio/done — Reached when <Record>'s action fires after the
   * recording completes. Thanks the caller and hangs up.
   */
  @Post('done')
  handleDone(@Req() req: Request, @Res() res: Response) {
    const from = req.body?.From ?? 'unknown';
    const v = pickVoice(from);
    const response = new twiml.VoiceResponse();
    response.say({ voice: v.voice, language: v.language }, v.thanks);
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
    const from = fromQuery && fromQuery !== 'unknown' ? fromQuery : undefined;

    this.logger.log(
      `Recording ready: sid=${RecordingSid} call=${CallSid} from=${from ?? 'unknown'} duration=${RecordingDuration}s`,
    );
    const audioUrl = `${RecordingUrl}.wav`;
    this.logger.log(`Audio URL: ${audioUrl}`);

    // Enqueue for async Whisper transcription. Name is extracted from the
    // transcript in the worker (combined prompt now records both).
    await this.transcriptionQueue.add('transcribe', {
      audioUrl,
      source: 'ivr',
      callSid: CallSid,
      from,
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
