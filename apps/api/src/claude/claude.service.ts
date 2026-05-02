import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

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
  private readonly client: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Generate a localized action plan for a CHW based on screening results.
   * Uses Claude Sonnet for cost efficiency + quality balance.
   * https://docs.anthropic.com/en/docs/build-with-claude/text-generation
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

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a clinical decision support system for community health workers (CHWs) in low-resource settings. Generate a clear, actionable plan based on a voice-based depression screening.

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

Generate a JSON response with:
1. "actionPlan" — A 2-3 paragraph plan written IN ${lang} that a CHW with basic training can follow. Include specific next steps, timeline, and when to escalate. Use simple, non-clinical language.
2. "summary" — A 1-sentence English summary for the dashboard.
3. "urgency" — One of: "routine" (low risk), "soon" (moderate, follow up in 2 weeks), "urgent" (high, follow up in 3 days), "immediate" (critical, same-day referral).
4. "recommendedActions" — Array of 3-5 specific actions in English for the CHW checklist.

Respond with ONLY valid JSON, no markdown.`,
        },
      ],
    });

    const firstBlock = message.content[0];
    const text =
      firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';

    try {
      const parsed = JSON.parse(text) as ActionPlanOutput;
      this.logger.log(`Action plan generated: urgency=${parsed.urgency}`);
      return parsed;
    } catch {
      // Fallback if Claude doesn't return clean JSON
      this.logger.warn('Failed to parse Claude response as JSON, using raw text');
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
