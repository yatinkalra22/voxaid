import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ReferralService } from './referral.service.js';

// Zod validation would go here in production — keeping it simple for hackathon
interface ReferralDto {
  patientName: string;
  patientPhone: string;
  riskLevel: string;
  depressionScore: number;
  summary: string;
  clinicPhone: string;
  clinicName: string;
  chwName: string;
  chwPhone?: string;
}

@Controller('referral')
export class ReferralController {
  private readonly logger = new Logger(ReferralController.name);

  constructor(private readonly referralService: ReferralService) {}

  /**
   * POST /referral — CHW dashboard calls this to refer a patient to a clinic.
   * Sends SMS to clinic admin + optional confirmation to CHW.
   */
  @Post()
  async createReferral(@Body() dto: ReferralDto) {
    this.logger.log(
      `Referral request: ${dto.patientName} -> ${dto.clinicName}`,
    );

    const { messageSid } = await this.referralService.referToClinic(dto);

    // Notify CHW if phone provided
    if (dto.chwPhone) {
      await this.referralService.notifyChw({
        chwPhone: dto.chwPhone,
        patientName: dto.patientName,
        clinicName: dto.clinicName,
      });
    }

    return {
      ok: true,
      data: {
        messageSid,
        status: 'sent',
        message: `Referral sent to ${dto.clinicName}`,
      },
    };
  }
}
