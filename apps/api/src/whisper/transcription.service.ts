import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeepgramClient } from '@deepgram/sdk';

/**
 * Speech-to-text service backed by Deepgram Nova-3.
 *
 * Replaced Groq's whisper-large-v3, which hallucinated short English nonsense
 * on Hindi/Spanish phone audio (e.g. "It is written by Aditya" for Hindi
 * speech). Nova-3 has substantially higher accuracy on accented and noisy
 * phone audio, native multilingual support with code-switching, and returns
 * the detected language for downstream localization.
 */
@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly deepgram: DeepgramClient;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('DEEPGRAM_API_KEY');
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY is not set');
    }
    this.deepgram = new DeepgramClient({ apiKey });
  }

  /**
   * Downloads audio from a URL and sends it to Deepgram for transcription.
   *
   * `languageHint` (ISO 639-1) — if known from the caller's country code,
   * pass it for higher accuracy. Otherwise we use Nova-3's `multi` mode,
   * which auto-detects across English, Spanish, Hindi, Portuguese, French,
   * German, Italian, Dutch, Japanese, and Russian with code-switching.
   */
  async transcribe(
    audioUrl: string,
    languageHint?: string,
  ): Promise<{ text: string; language: string }> {
    this.logger.log(
      `Fetching audio from ${audioUrl} (hint=${languageHint ?? 'auto'})`,
    );

    // Twilio recording + WhatsApp media URLs are private — Basic Auth required.
    const headers: Record<string, string> = {};
    if (audioUrl.startsWith('https://api.twilio.com/')) {
      const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
      const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
      if (sid && token) {
        headers.Authorization = `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`;
      }
    }

    const response = await fetch(audioUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    this.logger.log(`Sending ${audioBuffer.length} bytes to Deepgram Nova-3`);

    const result = await this.deepgram.listen.v1.media.transcribeFile(
      audioBuffer,
      {
        model: 'nova-3',
        // Nova-3 'multi' enables code-switching across supported languages
        // and returns the detected language per channel.
        language: languageHint ?? 'multi',
        smart_format: true,
        punctuate: true,
      },
    );

    // The accepted-response shape (just { request_id }) only happens when a
    // callback URL is configured, which we don't do — so always expect a
    // synchronous results body.
    if (!('results' in result)) {
      throw new Error('Unexpected async response from Deepgram');
    }

    const channel = result.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];
    const text = (alternative?.transcript ?? '').trim();
    const detectedLanguage =
      channel?.detected_language ?? languageHint ?? 'en';

    this.logger.log(
      `Transcribed: lang=${detectedLanguage} text="${text.slice(0, 80)}..."`,
    );

    return { text, language: detectedLanguage };
  }
}
