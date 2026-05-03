import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { maskPhone } from '../lib/phone.js';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  /** All patients with their last 20 screenings, sorted by risk (critical first) */
  async findAll() {
    const patients = await this.prisma.patient.findMany({
      include: {
        screenings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    return patients
      .sort((a, b) => {
        const scoreA = a.screenings[0]?.depressionScore ?? 0;
        const scoreB = b.screenings[0]?.depressionScore ?? 0;
        return scoreB - scoreA;
      })
      .map(redactPatient);
  }

  /** Single patient with all screenings */
  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        screenings: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return patient ? redactPatient(patient) : null;
  }
}

// PHI never leaves the API in raw form — the dashboard receives a masked
// number it can render directly. The full number stays in Postgres for
// outbound flows (Twilio callback, SMS) which run server-side.
function redactPatient<T extends { phone: string }>(patient: T): T {
  return { ...patient, phone: maskPhone(patient.phone) };
}
