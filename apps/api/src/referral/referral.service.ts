import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

interface ReferralInput {
  patientName: string;
  patientPhone: string;
  riskLevel: string;
  depressionScore: number;
  summary: string;
  clinicPhone: string;
  clinicName: string;
  chwName: string;
}

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private readonly twilio: Twilio;

  constructor(private readonly config: ConfigService) {
    this.twilio = new Twilio(
      this.config.get<string>('TWILIO_ACCOUNT_SID'),
      this.config.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }

  /**
   * Send SMS referral to clinic admin with patient details.
   * Closes the loop: screening -> action plan -> clinic referral.
   * https://www.twilio.com/docs/messaging/api/message-resource
   */
  async referToClinic(input: ReferralInput): Promise<{ messageSid: string }> {
    const fromNumber = this.config.getOrThrow<string>('TWILIO_PHONE_NUMBER');

    const body = [
      `[VoxAID REFERRAL - ${input.riskLevel.toUpperCase()}]`,
      ``,
      `Patient: ${input.patientName}`,
      `Phone: ${input.patientPhone}`,
      `Risk: ${input.riskLevel} (${(input.depressionScore * 100).toFixed(0)}%)`,
      `Summary: ${input.summary}`,
      ``,
      `Referred by: ${input.chwName}`,
      `Action: Please schedule assessment within ${this.getTimeframe(input.riskLevel)}.`,
      ``,
      `— VoxAID Automated Referral`,
    ].join('\n');

    this.logger.log(
      `Sending referral SMS to ${input.clinicName} (${input.clinicPhone}) for ${input.patientName}`,
    );

    const message = await this.twilio.messages.create({
      to: input.clinicPhone,
      from: fromNumber,
      body,
    });

    this.logger.log(`Referral SMS sent: sid=${message.sid}`);

    return { messageSid: message.sid };
  }

  /**
   * Send confirmation SMS to the CHW that referral was sent.
   */
  async notifyChw(input: {
    chwPhone: string;
    patientName: string;
    clinicName: string;
  }): Promise<void> {
    const fromNumber = this.config.getOrThrow<string>('TWILIO_PHONE_NUMBER');

    await this.twilio.messages.create({
      to: input.chwPhone,
      from: fromNumber,
      body: `[VoxAID] Referral sent for ${input.patientName} to ${input.clinicName}. They will be contacted for an appointment.`,
    });

    this.logger.log(`CHW notification sent to ${input.chwPhone}`);
  }

  private getTimeframe(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical':
        return '24 hours';
      case 'high':
        return '3 days';
      case 'moderate':
        return '2 weeks';
      default:
        return '1 month';
    }
  }
}
