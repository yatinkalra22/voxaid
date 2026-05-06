import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeepgramClient } from '@deepgram/sdk';

function mostCommon(arr: string[]): string | undefined {
  if (arr.length === 0) return undefined;
  const counts: Record<string, number> = {};
  for (const x of arr) counts[x] = (counts[x] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

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
   * Always uses Nova-3's `multi` mode. The country-code language hint is a
   * weak demographic signal (a +1 caller can easily speak Hindi or Spanish),
   * and forcing the wrong language on Deepgram produces an empty transcript
   * — observed in production on a +1 caller speaking Hindi.
   *
   * `languageHint` is still accepted as a fallback for the returned language
   * value, used downstream for action-plan localization.
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
        // Always use Nova-3 'multi' (code-switching across en/es/hi/pt/fr/
        // de/it/nl/ja/ru). Forcing a country-code-derived language hint here
        // breaks transcription whenever the caller's spoken language differs
        // from their phone's country code.
        language: 'multi',
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

    // In Nova-3 'multi' mode, language is reported per-word rather than
    // per-channel. Pick the most-frequent word language as the dominant one.
    // Falls back to channel-level detection, then country-code hint, then 'en'.
    const wordLanguages = (alternative?.words ?? [])
      .map((w) => (w as { language?: string }).language)
      .filter((l): l is string => !!l);
    const dominantLanguage = mostCommon(wordLanguages);

    const detectedLanguage =
      dominantLanguage ??
      channel?.detected_language ??
      languageHint ??
      'en';

    this.logger.log(
      `Transcribed: lang=${detectedLanguage} text="${text.slice(0, 80)}..."`,
    );

    return { text, language: detectedLanguage };
  }
}
