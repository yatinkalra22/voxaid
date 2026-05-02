import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  /** All patients with their latest screening, sorted by risk (critical first) */
  async findAll() {
    const patients = await this.prisma.patient.findMany({
      include: {
        screenings: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Sort by depression score descending (critical first)
    return patients.sort((a, b) => {
      const scoreA = a.screenings[0]?.depressionScore ?? 0;
      const scoreB = b.screenings[0]?.depressionScore ?? 0;
      return scoreB - scoreA;
    });
  }

  /** Single patient with all screenings */
  async findOne(id: string) {
    return this.prisma.patient.findUnique({
      where: { id },
      include: {
        screenings: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}
