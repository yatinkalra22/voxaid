import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Downloads audio from URL and sends to Whisper for transcription.
   * Returns transcript text + detected language.
   * https://platform.openai.com/docs/guides/speech-to-text
   */
  async transcribe(audioUrl: string): Promise<{
    text: string;
    language: string;
  }> {
    this.logger.log(`Fetching audio from ${audioUrl}`);

    // Fetch the audio file as a buffer
    const response = await fetch(audioUrl);
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
      model: 'whisper-1',
      file,
      response_format: 'verbose_json', // Gives us detected language
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
