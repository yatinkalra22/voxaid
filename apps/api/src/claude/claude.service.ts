import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

interface ActionPlanInput {
  patientName: string;
  language: string;
  transcript: string;
  depressionScore: number;
  riskLevel: string;
  biomarkers: {
    f0Mean: number;
    jitter: number;
    shimmer: number;
    hnr: number;
    pauseRatio: number;
    speechRate: number;
  };
}

interface ActionPlanOutput {
  actionPlan: string;
  summary: string;
  urgency: 'routine' | 'soon' | 'urgent' | 'immediate';
  recommendedActions: string[];
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly anthropic: Anthropic | null;
  private readonly groq: OpenAI | null;
  private readonly useAnthropic: boolean;

  constructor(private readonly config: ConfigService) {
    const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');

    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
      this.groq = null;
      this.useAnthropic = true;
      this.logger.log('LLM: using Anthropic Claude Sonnet');
    } else {
      // Fallback: Groq Llama 3.3 70B — free, no credit card needed
      this.anthropic = null;
      this.groq = new OpenAI({
        apiKey: this.config.get<string>('GROQ_API_KEY'),
        baseURL: 'https://api.groq.com/openai/v1',
      });
      this.useAnthropic = false;
      this.logger.log('LLM: using Groq Llama 3.3 (free fallback)');
    }
  }

  /**
   * Generate a localized action plan for a CHW based on screening results.
   * Uses Anthropic Claude if ANTHROPIC_API_KEY is set, otherwise Groq Llama 3.3.
   */
  async generateActionPlan(input: ActionPlanInput): Promise<ActionPlanOutput> {
    const languageMap: Record<string, string> = {
      hi: 'Hindi',
      en: 'English',
      es: 'Spanish',
      sw: 'Swahili',
      bn: 'Bengali',
      fr: 'French',
      pt: 'Portuguese',
      ar: 'Arabic',
    };

    const lang = languageMap[input.language] ?? 'English';

    this.logger.log(
      `Generating action plan for ${input.patientName} in ${lang} (risk: ${input.riskLevel})`,
    );

    const prompt = `Generate a clear, actionable plan based on a voice-based depression screening.

PATIENT: ${input.patientName}
LANGUAGE: ${lang}
DEPRESSION SCORE: ${(input.depressionScore * 100).toFixed(0)}% (${input.riskLevel})

VOICE BIOMARKERS:
- F0 Mean: ${input.biomarkers.f0Mean.toFixed(1)} Hz (normal: 150-250 Hz, lower suggests depression)
- Jitter: ${(input.biomarkers.jitter * 100).toFixed(2)}% (normal: <1.5%, higher suggests vocal instability)
- Shimmer: ${(input.biomarkers.shimmer * 100).toFixed(2)}% (normal: <3%, higher suggests depression)
- HNR: ${input.biomarkers.hnr.toFixed(1)} dB (normal: >15 dB, lower suggests breathier voice)
- Pause Ratio: ${(input.biomarkers.pauseRatio * 100).toFixed(0)}% (normal: <30%, higher suggests psychomotor retardation)
- Speech Rate: ${input.biomarkers.speechRate.toFixed(0)} frames/sec (normal: >90, lower suggests depression)

TRANSCRIPT (patient's own words):
"${input.transcript}"

Generate a JSON response with these exact keys:
1. "actionPlan" — A 2-3 paragraph plan written IN ${lang} that a CHW with basic training can follow. Include specific next steps, timeline, and when to escalate. Use simple, non-clinical language.
2. "summary" — A 1-sentence English summary for the dashboard.
3. "urgency" — One of: "routine" (low risk), "soon" (moderate, follow up in 2 weeks), "urgent" (high, follow up in 3 days), "immediate" (critical, same-day referral).
4. "recommendedActions" — Array of 3-5 specific actions in English for the CHW checklist.

Respond with ONLY valid JSON, no markdown.`;

    const text = this.useAnthropic
      ? await this.callAnthropic(prompt)
      : await this.callGroq(prompt);

    try {
      const parsed = JSON.parse(text) as ActionPlanOutput;
      this.logger.log(`Action plan generated: urgency=${parsed.urgency}`);
      return parsed;
    } catch {
      this.logger.warn('Failed to parse LLM response as JSON, using raw text');
      return {
        actionPlan: text,
        summary: `${input.riskLevel} risk screening for ${input.patientName}`,
        urgency: this.riskToUrgency(input.riskLevel),
        recommendedActions: [
          'Review screening results',
          'Schedule follow-up visit',
          'Document in patient record',
        ],
      };
    }
  }

  private async callAnthropic(prompt: string): Promise<string> {
    const message = await this.anthropic!.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const firstBlock = message.content[0];
    return firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
  }

  private async callGroq(prompt: string): Promise<string> {
    const message = await this.groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a clinical decision support system for community health workers. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
    });
    return message.choices[0]?.message?.content ?? '';
  }

  private riskToUrgency(
    riskLevel: string,
  ): 'routine' | 'soon' | 'urgent' | 'immediate' {
    switch (riskLevel) {
      case 'critical':
        return 'immediate';
      case 'high':
        return 'urgent';
      case 'moderate':
        return 'soon';
      default:
        return 'routine';
    }
  }
}
