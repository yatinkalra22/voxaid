import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { twiml } from 'twilio';

@Controller('twilio')
export class TwilioController {
  private readonly logger = new Logger(TwilioController.name);

  constructor(private readonly config: ConfigService) {}

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
      trim: 'trim-silence',
      recordingStatusCallback: `${this.config.get<string>('API_BASE_URL')}/twilio/recording`,
      recordingStatusCallbackMethod: 'POST',
      recordingStatusCallbackEvent: ['completed'],
    });

    // Fallback if caller doesn't speak
    response.say('We did not receive a recording. Please try again.');

    res.type('text/xml');
    res.send(response.toString());
  }

  /**
   * POST /twilio/recording — Twilio calls this when recording is ready.
   * We get the RecordingUrl to fetch the audio file.
   * https://www.twilio.com/docs/voice/api/recording-resource
   */
  @Post('recording')
  handleRecordingCallback(@Req() req: Request, @Res() res: Response) {
    const { RecordingUrl, RecordingSid, CallSid, RecordingDuration } = req.body;

    this.logger.log(
      `Recording ready: sid=${RecordingSid} call=${CallSid} duration=${RecordingDuration}s`,
    );
    this.logger.log(`Audio URL: ${RecordingUrl}.wav`);

    // TODO (Feature 3): Push to BullMQ for Whisper transcription + R2 upload
    // For now, just log — we'll wire the pipeline in later features

    res.status(200).send('OK');
  }
}
