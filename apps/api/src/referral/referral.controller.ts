import { Controller, Post, Body, Logger, UseGuards, BadRequestException } from '@nestjs/common';
import { ReferralService } from './referral.service.js';
import { ApiKeyGuard } from '../guards/api-key.guard.js';
import { z } from 'zod';

// E.164 phone format — prevents SMS injection via malformed numbers
const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, 'Invalid E.164 phone number');

const referralSchema = z.object({
  patientName: z.string().min(1).max(200),
  patientPhone: phoneSchema,
  riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
  depressionScore: z.number().min(0).max(1),
  summary: z.string().min(1).max(2000),
  clinicPhone: phoneSchema,
  clinicName: z.string().min(1).max(200),
  chwName: z.string().min(1).max(200),
  chwPhone: phoneSchema.optional(),
});

type ReferralDto = z.infer<typeof referralSchema>;

@Controller('referral')
@UseGuards(ApiKeyGuard)
export class ReferralController {
  private readonly logger = new Logger(ReferralController.name);

  constructor(private readonly referralService: ReferralService) {}

  /**
   * POST /referral — CHW dashboard calls this to refer a patient to a clinic.
   * Sends SMS to clinic admin + optional confirmation to CHW.
   */
  @Post()
  async createReferral(@Body() body: unknown) {
    const result = referralSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        ok: false,
        error: { code: 'VALIDATION_ERROR', issues: result.error.flatten().fieldErrors },
      });
    }
    const dto = result.data;

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
