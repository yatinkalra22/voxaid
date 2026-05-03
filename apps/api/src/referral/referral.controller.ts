import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ReferralService } from './referral.service.js';
import { ApiKeyGuard } from '../guards/api-key.guard.js';
import { z } from 'zod';

const createSchema = z.object({
  screeningId: z.string().min(1).max(64),
  chwName: z.string().min(1).max(200),
});

@Controller('referral')
export class ReferralController {
  private readonly logger = new Logger(ReferralController.name);

  constructor(private readonly referrals: ReferralService) {}

  /**
   * POST /referral — CHW creates a new referral from a screening.
   * Auth: api-key. Body derives everything else from the screening row.
   */
  @Post()
  @UseGuards(ApiKeyGuard)
  async create(@Body() body: unknown) {
    const result = createSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          issues: result.error.flatten().fieldErrors,
        },
      });
    }
    const referral = await this.referrals.createReferral(result.data);
    return {
      ok: true,
      data: {
        referralId: referral.id,
        shareToken: referral.shareToken,
        actionWindow: referral.actionWindow,
        riskLevel: referral.riskLevel,
        createdAt: referral.createdAt,
      },
    };
  }

  /**
   * POST /referral/:id/callback — Fires an outbound TTS call to the patient.
   * Auth: api-key. Idempotent.
   */
  @Post(':id/callback')
  @UseGuards(ApiKeyGuard)
  async callback(@Param('id') id: string) {
    const result = await this.referrals.triggerPatientCallback(id);
    return { ok: true, data: result };
  }

  /**
   * GET /referral/by-token/:token — Public read for the /r/<token> page.
   * The share token is the auth.
   */
  @Get('by-token/:token')
  async byToken(@Param('token') token: string) {
    const data = await this.referrals.getByToken(token);
    return { ok: true, data };
  }
}
