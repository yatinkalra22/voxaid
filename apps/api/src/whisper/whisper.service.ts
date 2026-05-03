import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    // Groq provides free Whisper API with OpenAI-compatible endpoint
    // https://console.groq.com/docs/speech-text
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('GROQ_API_KEY'),
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  /**
   * Downloads audio from URL and sends to Whisper for transcription.
   * No language hint: whisper-large-v3 auto-detects reliably on 10-30s
   * screening audio when paired with `temperature: 0` and a domain prompt,
   * and we want code-switched speech (English ↔ Tamil/Hindi/Spanish/…) to
   * survive instead of being silently dropped to match a hint.
   */
  async transcribe(audioUrl: string): Promise<{
    text: string;
    language: string;
  }> {
    this.logger.log(`Fetching audio from ${audioUrl}`);

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

    // Whisper expects a File-like object
    const file = new File([audioBuffer], 'recording.wav', {
      type: 'audio/wav',
    });

    this.logger.log(`Sending ${audioBuffer.length} bytes to Whisper`);

    const result = await this.openai.audio.transcriptions.create({
      model: 'whisper-large-v3',
      file,
      response_format: 'verbose_json', // Gives us detected language
      // Encourage clean output when audio is sparse — reduces hallucinations.
      temperature: 0,
      prompt: 'The speaker shares their name and describes how they have been feeling.',
    });

    this.logger.log(
      `Transcribed: lang=${result.language} text="${result.text.slice(0, 80)}..."`,
    );

    return {
      text: result.text,
      language: result.language ?? 'en',
    };
  }
}
