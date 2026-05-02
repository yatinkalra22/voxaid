import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElevenLabsClient } from 'elevenlabs';
import { Twilio } from 'twilio';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly elevenlabs: ElevenLabsClient;
  private readonly twilio: Twilio;

  constructor(private readonly config: ConfigService) {
    this.elevenlabs = new ElevenLabsClient({
      apiKey: this.config.get<string>('ELEVENLABS_API_KEY'),
    });

    this.twilio = new Twilio(
      this.config.get<string>('TWILIO_ACCOUNT_SID'),
      this.config.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }

  /**
   * Convert action plan text to speech via ElevenLabs Multilingual v2,
   * then call the patient back via Twilio to deliver the audio.
   *
   * Flow: text -> ElevenLabs TTS -> audio buffer -> host as TwiML -> Twilio call
   * https://elevenlabs.io/docs/api-reference/text-to-speech
   */
  async speakAndCall(input: {
    text: string;
    language: string;
    patientPhone: string;
  }): Promise<{ callSid: string }> {
    this.logger.log(
      `Generating TTS for ${input.patientPhone} in ${input.language}`,
    );

    // Pick a voice that works well for multilingual content
    // "Rachel" is a good default; for Hindi/regional consider "Aria" or custom
    const voiceId = this.getVoiceForLanguage(input.language);

    // Generate speech audio via ElevenLabs
    const audioStream = await this.elevenlabs.textToSpeech.convert(voiceId, {
      text: input.text,
      model_id: 'eleven_multilingual_v2',
      output_format: 'mp3_44100_128',
    });

    // Collect the stream into a buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    this.logger.log(
      `TTS generated: ${audioBuffer.length} bytes for ${input.language}`,
    );

    // For the demo, we use Twilio's <Say> with the action plan text
    // as a fallback. In production, we'd host the MP3 on R2 and use <Play>.
    // This avoids needing a public URL for the audio file during hackathon.
    const baseUrl = this.config.get<string>('API_BASE_URL');
    const fromNumber = this.config.get<string>('TWILIO_PHONE_NUMBER');

    const call = await this.twilio.calls.create({
      to: input.patientPhone,
      from: fromNumber!,
      twiml: this.buildCallbackTwiml(input.text, input.language),
    });

    this.logger.log(`Callback initiated: callSid=${call.sid}`);

    return { callSid: call.sid };
  }

  /**
   * Build TwiML for the patient callback.
   * Uses Twilio's built-in TTS as a reliable fallback.
   * In production, we'd serve the ElevenLabs MP3 via <Play>.
   */
  private buildCallbackTwiml(text: string, language: string): string {
    // Map language codes to Twilio-supported voices
    // https://www.twilio.com/docs/voice/twiml/say#voice
    const voiceMap: Record<string, { voice: string; lang: string }> = {
      hi: { voice: 'Polly.Aditi', lang: 'hi-IN' },
      en: { voice: 'Polly.Joanna', lang: 'en-US' },
      es: { voice: 'Polly.Lupe', lang: 'es-US' },
      sw: { voice: 'Polly.Joanna', lang: 'en-US' }, // Swahili fallback to English
      bn: { voice: 'Polly.Aditi', lang: 'hi-IN' }, // Bengali fallback to Hindi
      fr: { voice: 'Polly.Lea', lang: 'fr-FR' },
      pt: { voice: 'Polly.Camila', lang: 'pt-BR' },
      ar: { voice: 'Polly.Zeina', lang: 'ar-AE' },
    };

    const v = voiceMap[language] ?? voiceMap['en'];

    // Escape XML special characters in the text
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${v.voice}" language="${v.lang}">
    This is VoxAID with your health screening results.
  </Say>
  <Pause length="1"/>
  <Say voice="${v.voice}" language="${v.lang}">
    ${escaped}
  </Say>
  <Say voice="${v.voice}" language="${v.lang}">
    If you need immediate help, please visit your nearest health center. Goodbye.
  </Say>
</Response>`;
  }

  /**
   * Map language to ElevenLabs voice ID.
   * Using pre-made voices — in production we'd use cloned voices per region.
   */
  private getVoiceForLanguage(language: string): string {
    // ElevenLabs pre-made voice IDs
    // https://elevenlabs.io/docs/voices/pre-made-voices
    const voiceMap: Record<string, string> = {
      hi: 'pFZP5JQG7iQjIQuC4Bku', // Lily
      en: '21m00Tcm4TlvDq8ikWAM', // Rachel
      es: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
      sw: '21m00Tcm4TlvDq8ikWAM', // Rachel
      bn: 'pFZP5JQG7iQjIQuC4Bku', // Lily
    };

    return voiceMap[language] ?? '21m00Tcm4TlvDq8ikWAM';
  }
}
