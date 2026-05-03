import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { TtsService } from '../tts/tts.service.js';
import { maskPhone } from '../lib/phone.js';

// Outbound patient callbacks place real Twilio voice calls to real phone
// numbers. For the public hackathon demo we keep the endpoint reachable but
// short-circuit it here so a misconfigured client (or a curious judge) can
// never trigger an actual call. Flip back to false once we have explicit
// patient consent and on-call moderation in place.
const PATIENT_CALLBACK_DISABLED = true;

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tts: TtsService,
  ) {}

  /**
   * Create a referral from an existing screening. Generates a public share
   * token the CHW can paste into whatever channel they already use
   * (WhatsApp, print, etc.). VoxAID does not assume the clinic's channel.
   */
  async createReferral(input: { screeningId: string; chwName: string }) {
    const screening = await this.prisma.screening.findUnique({
      where: { id: input.screeningId },
      include: { patient: true },
    });
    if (!screening) {
      throw new NotFoundException({
        ok: false,
        error: { code: 'SCREENING_NOT_FOUND' },
      });
    }
    if (!screening.depressionRisk || screening.depressionScore === null) {
      throw new BadRequestException({
        ok: false,
        error: { code: 'INCOMPLETE_SCREENING' },
      });
    }

    const shareToken = crypto.randomBytes(16).toString('base64url');
    const actionWindow = this.getTimeframe(screening.depressionRisk);

    const referral = await this.prisma.referral.create({
      data: {
        screeningId: screening.id,
        patientId: screening.patientId,
        chwName: input.chwName,
        riskLevel: screening.depressionRisk,
        depressionScore: screening.depressionScore,
        summary: (screening.actionPlan ?? '').slice(0, 1000),
        actionWindow,
        shareToken,
      },
    });

    this.logger.log(
      `Referral ${referral.id} created for ${screening.patient.name} by ${input.chwName}`,
    );
    return referral;
  }

  /** Public read by share token. Returns redacted shape for the /r/<token> page. */
  async getByToken(token: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { shareToken: token },
      include: { patient: true, screening: true },
    });
    if (!referral) {
      throw new NotFoundException({
        ok: false,
        error: { code: 'REFERRAL_NOT_FOUND' },
      });
    }

    // Redact: first name + masked phone only.
    const firstName =
      referral.patient.name.split(/\s+/)[0] || referral.patient.name;
    const maskedPhone = maskPhone(referral.patient.phone);

    return {
      id: referral.id,
      createdAt: referral.createdAt,
      riskLevel: referral.riskLevel,
      depressionScore: referral.depressionScore,
      summary: referral.summary,
      actionWindow: referral.actionWindow,
      chwName: referral.chwName,
      patient: {
        firstName,
        maskedPhone,
        language: referral.patient.language,
      },
      screeningAt: referral.screening.createdAt,
    };
  }

  /**
   * Place an outbound TTS call to the patient telling them they've been
   * referred. Closes the loop on the demo: call in -> screen -> action plan
   * -> call out. Idempotent: returns the existing callSid if already triggered.
   */
  async triggerPatientCallback(referralId: string) {
    if (PATIENT_CALLBACK_DISABLED) {
      this.logger.log(
        `Patient callback blocked (feature disabled for demo): referralId=${referralId}`,
      );
      throw new ForbiddenException({
        ok: false,
        error: {
          code: 'CALLBACK_DISABLED',
          message:
            'Patient callback is disabled for the hackathon demo. Use the shareable referral link or print slip instead.',
        },
      });
    }

    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: { patient: true },
    });
    if (!referral) {
      throw new NotFoundException({
        ok: false,
        error: { code: 'REFERRAL_NOT_FOUND' },
      });
    }
    if (referral.patientCallbackSid) {
      return {
        callSid: referral.patientCallbackSid,
        triggeredAt: referral.patientCallbackAt,
        alreadyTriggered: true,
      };
    }
    if (
      !referral.patient.phone ||
      !referral.patient.phone.startsWith('+') ||
      referral.patient.phone.startsWith('anon-')
    ) {
      throw new BadRequestException({
        ok: false,
        error: { code: 'PATIENT_PHONE_UNREACHABLE' },
      });
    }

    const message = buildCallbackMessage(
      referral.patient.language,
      referral.actionWindow,
    );

    const { callSid } = await this.tts.speakAndCall({
      text: message,
      language: referral.patient.language,
      patientPhone: referral.patient.phone,
    });

    const updated = await this.prisma.referral.update({
      where: { id: referralId },
      data: { patientCallbackSid: callSid, patientCallbackAt: new Date() },
    });

    this.logger.log(
      `Referral ${referralId} callback fired: callSid=${callSid}`,
    );
    return {
      callSid,
      triggeredAt: updated.patientCallbackAt,
      alreadyTriggered: false,
    };
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

function buildCallbackMessage(language: string, actionWindow: string): string {
  const lang = (language || 'en').toLowerCase();
  if (lang.startsWith('hi')) {
    return `नमस्ते, यह VoxAID है। आपको अपने स्थानीय क्लिनिक के लिए रेफर किया गया है। ${actionWindow} के भीतर फॉलो-अप की उम्मीद करें।`;
  }
  if (lang.startsWith('es')) {
    return `Hola, le habla VoxAID. Ha sido referido a su clínica local. Espere un seguimiento dentro de ${actionWindow}.`;
  }
  return `Hello, this is VoxAID. You have been referred to your local health clinic. Please expect a follow-up within ${actionWindow}.`;
}
