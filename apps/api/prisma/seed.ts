import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// Demo patients matching the "Priya in Bihar" narrative + global reach
const SEED_PATIENTS = [
  {
    id: 'p1',
    name: 'Priya Sharma',
    phone: '+91-9876543210',
    language: 'hi',
    latitude: 25.6093,
    longitude: 85.1376, // Patna, Bihar
    assignedChwId: 'chw-demo-1',
    screening: {
      depressionScore: 0.82,
      depressionRisk: 'critical' as const,
      transcript:
        'Main bahut thak gayi hoon... raat ko neend nahi aati. Kuch achha nahi lagta. Bachche ki chinta rehti hai. Kaam mein mann nahi lagta.',
      actionPlan:
        'Immediate referral to PHC Patna for mental health assessment. Recommend PHQ-9 screening. Follow up within 48 hours. Inform ASHA supervisor.',
      biomarkers: {
        f0Mean: 132.4,
        jitter: 0.032,
        shimmer: 0.078,
        hnr: 9.2,
        pauseRatio: 0.52,
        speechRate: 68.3,
      },
      source: 'ivr',
    },
  },
  {
    id: 'p2',
    name: 'Amina Osei',
    phone: '+233-244567890',
    language: 'en',
    latitude: 5.6037,
    longitude: -0.187, // Accra, Ghana
    assignedChwId: 'chw-demo-1',
    screening: {
      depressionScore: 0.65,
      depressionRisk: 'high' as const,
      transcript:
        "I don't feel like doing anything anymore. I used to enjoy the market but now I just stay home. My body is always tired.",
      actionPlan:
        'Schedule follow-up screening in 1 week. Recommend community support group referral. Monitor for worsening symptoms.',
      biomarkers: {
        f0Mean: 155.8,
        jitter: 0.024,
        shimmer: 0.061,
        hnr: 12.1,
        pauseRatio: 0.41,
        speechRate: 82.5,
      },
      source: 'whatsapp',
    },
  },
  {
    id: 'p3',
    name: 'Maria Garcia',
    phone: '+52-5512345678',
    language: 'es',
    latitude: 19.4326,
    longitude: -99.1332, // Mexico City
    assignedChwId: 'chw-demo-1',
    screening: {
      depressionScore: 0.41,
      depressionRisk: 'moderate' as const,
      transcript:
        'A veces me siento triste pero puedo hacer mis cosas. Duermo bien la mayoria de las noches. Mi familia me ayuda mucho.',
      actionPlan:
        'Continue monitoring. Schedule next screening in 2 weeks. Provide mental health awareness materials in Spanish.',
      biomarkers: {
        f0Mean: 192.3,
        jitter: 0.015,
        shimmer: 0.042,
        hnr: 17.4,
        pauseRatio: 0.28,
        speechRate: 105.2,
      },
      source: 'ivr',
    },
  },
  {
    id: 'p4',
    name: 'Fatima Begum',
    phone: '+880-1712345678',
    language: 'bn',
    latitude: 23.8103,
    longitude: 90.4125, // Dhaka, Bangladesh
    assignedChwId: 'chw-demo-1',
    screening: {
      depressionScore: 0.18,
      depressionRisk: 'low' as const,
      transcript:
        'Ami bhalo achi. Shobkichu thik ache. Bacchara school e jacche. Amar sharir bhalo ache.',
      actionPlan:
        'No immediate action required. Routine follow-up in 1 month. Patient appears stable.',
      biomarkers: {
        f0Mean: 210.5,
        jitter: 0.009,
        shimmer: 0.028,
        hnr: 22.3,
        pauseRatio: 0.19,
        speechRate: 118.7,
      },
      source: 'whatsapp',
    },
  },
  {
    id: 'p5',
    name: 'Grace Wanjiku',
    phone: '+254-712345678',
    language: 'sw',
    latitude: -1.2921,
    longitude: 36.8219, // Nairobi, Kenya
    assignedChwId: 'chw-demo-1',
    screening: {
      depressionScore: 0.73,
      depressionRisk: 'high' as const,
      transcript:
        'Sijisikia vizuri siku hizi. Ninajisikia mpweke sana. Watoto wangu hawanisikii. Sipati usingizi mzuri.',
      actionPlan:
        'Refer to Kenyatta National Hospital mental health clinic. Urgent follow-up in 3 days. Alert CHW supervisor for home visit.',
      biomarkers: {
        f0Mean: 148.9,
        jitter: 0.028,
        shimmer: 0.069,
        hnr: 10.8,
        pauseRatio: 0.47,
        speechRate: 74.1,
      },
      source: 'ivr',
    },
  },
  {
    id: 'p6',
    name: 'Rekha Devi',
    phone: '+91-8765432109',
    language: 'hi',
    latitude: 26.8467,
    longitude: 80.9462, // Lucknow, UP
    assignedChwId: 'chw-demo-1',
    screening: {
      depressionScore: 0.54,
      depressionRisk: 'moderate' as const,
      transcript:
        'Thoda sa mann udaas rehta hai. Khana bana leti hoon, bachche ka dhyan rakh leti hoon. Par kabhi kabhi bahut akela lagta hai.',
      actionPlan:
        'Schedule follow-up screening in 2 weeks. Recommend peer support group at local Anganwadi centre. Monitor sleep and appetite patterns.',
      biomarkers: {
        f0Mean: 174.2,
        jitter: 0.019,
        shimmer: 0.051,
        hnr: 14.6,
        pauseRatio: 0.33,
        speechRate: 92.8,
      },
      source: 'ivr',
    },
  },
];

async function main() {
  console.log('Seeding VoxAID database...');

  for (const p of SEED_PATIENTS) {
    const patient = await prisma.patient.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        phone: p.phone,
        language: p.language,
        latitude: p.latitude,
        longitude: p.longitude,
        assignedChwId: p.assignedChwId,
      },
      create: {
        id: p.id,
        name: p.name,
        phone: p.phone,
        language: p.language,
        latitude: p.latitude,
        longitude: p.longitude,
        assignedChwId: p.assignedChwId,
      },
    });

    // Upsert a screening for this patient
    const screeningId = `s-${p.id}`;
    await prisma.screening.upsert({
      where: { id: screeningId },
      update: {
        depressionScore: p.screening.depressionScore,
        depressionRisk: p.screening.depressionRisk,
        transcript: p.screening.transcript,
        actionPlan: p.screening.actionPlan,
        biomarkers: p.screening.biomarkers,
        source: p.screening.source,
      },
      create: {
        id: screeningId,
        patientId: patient.id,
        audioUrl: `https://api.twilio.com/demo/${p.id}.wav`, // placeholder
        transcript: p.screening.transcript,
        language: p.language,
        depressionScore: p.screening.depressionScore,
        depressionRisk: p.screening.depressionRisk,
        biomarkers: p.screening.biomarkers,
        actionPlan: p.screening.actionPlan,
        source: p.screening.source,
      },
    });

    console.log(`  Seeded: ${patient.name} (${p.screening.depressionRisk})`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
