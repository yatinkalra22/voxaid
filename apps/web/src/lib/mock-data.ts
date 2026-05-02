// Shared mock data for demo — replaced with real API calls in production

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface MockPatient {
  id: string;
  name: string;
  phone: string;
  language: string;
  latitude: number;
  longitude: number;
  lastScreening: {
    id: string;
    depressionScore: number;
    riskLevel: RiskLevel;
    transcript: string;
    actionPlan: string;
    biomarkers: {
      f0Mean: number;
      jitter: number;
      shimmer: number;
      hnr: number;
      pauseRatio: number;
      speechRate: number;
    };
    createdAt: string;
  };
}

export const MOCK_PATIENTS: MockPatient[] = [
  {
    id: "p1",
    name: "Priya Sharma",
    phone: "+91-9876543210",
    language: "hi",
    latitude: 25.6093,
    longitude: 85.1376, // Patna, Bihar
    lastScreening: {
      id: "s1",
      depressionScore: 0.82,
      riskLevel: "critical",
      transcript:
        "Main bahut thak gayi hoon... raat ko neend nahi aati. Kuch achha nahi lagta. Bachche ki chinta rehti hai. Kaam mein mann nahi lagta.",
      actionPlan:
        "Immediate referral to PHC Patna for mental health assessment. Recommend PHQ-9 screening. Follow up within 48 hours. Inform ASHA supervisor.",
      biomarkers: {
        f0Mean: 132.4,
        jitter: 0.032,
        shimmer: 0.078,
        hnr: 9.2,
        pauseRatio: 0.52,
        speechRate: 68.3,
      },
      createdAt: "2026-05-02T08:30:00Z",
    },
  },
  {
    id: "p2",
    name: "Amina Osei",
    phone: "+233-244567890",
    language: "en",
    latitude: 5.6037,
    longitude: -0.187, // Accra, Ghana
    lastScreening: {
      id: "s2",
      depressionScore: 0.65,
      riskLevel: "high",
      transcript:
        "I don't feel like doing anything anymore. I used to enjoy the market but now I just stay home. My body is always tired.",
      actionPlan:
        "Schedule follow-up screening in 1 week. Recommend community support group referral. Monitor for worsening symptoms.",
      biomarkers: {
        f0Mean: 155.8,
        jitter: 0.024,
        shimmer: 0.061,
        hnr: 12.1,
        pauseRatio: 0.41,
        speechRate: 82.5,
      },
      createdAt: "2026-05-02T07:15:00Z",
    },
  },
  {
    id: "p3",
    name: "Maria Garcia",
    phone: "+52-5512345678",
    language: "es",
    latitude: 19.4326,
    longitude: -99.1332, // Mexico City
    lastScreening: {
      id: "s3",
      depressionScore: 0.41,
      riskLevel: "moderate",
      transcript:
        "A veces me siento triste pero puedo hacer mis cosas. Duermo bien la mayoria de las noches. Mi familia me ayuda mucho.",
      actionPlan:
        "Continue monitoring. Schedule next screening in 2 weeks. Provide mental health awareness materials in Spanish.",
      biomarkers: {
        f0Mean: 192.3,
        jitter: 0.015,
        shimmer: 0.042,
        hnr: 17.4,
        pauseRatio: 0.28,
        speechRate: 105.2,
      },
      createdAt: "2026-05-01T16:45:00Z",
    },
  },
  {
    id: "p4",
    name: "Fatima Begum",
    phone: "+880-1712345678",
    language: "bn",
    latitude: 23.8103,
    longitude: 90.4125, // Dhaka, Bangladesh
    lastScreening: {
      id: "s4",
      depressionScore: 0.18,
      riskLevel: "low",
      transcript:
        "Ami bhalo achi. Shobkichu thik ache. Bacchara school e jacche. Amar sharir bhalo ache.",
      actionPlan:
        "No immediate action required. Routine follow-up in 1 month. Patient appears stable.",
      biomarkers: {
        f0Mean: 210.5,
        jitter: 0.009,
        shimmer: 0.028,
        hnr: 22.3,
        pauseRatio: 0.19,
        speechRate: 118.7,
      },
      createdAt: "2026-05-01T14:00:00Z",
    },
  },
  {
    id: "p5",
    name: "Grace Wanjiku",
    phone: "+254-712345678",
    language: "sw",
    latitude: -1.2921,
    longitude: 36.8219, // Nairobi, Kenya
    lastScreening: {
      id: "s5",
      depressionScore: 0.73,
      riskLevel: "high",
      transcript:
        "Sijisikia vizuri siku hizi. Ninajisikia mpweke sana. Watoto wangu hawanisikii. Sipati usingizi mzuri.",
      actionPlan:
        "Refer to Kenyatta National Hospital mental health clinic. Urgent follow-up in 3 days. Alert CHW supervisor for home visit.",
      biomarkers: {
        f0Mean: 148.9,
        jitter: 0.028,
        shimmer: 0.069,
        hnr: 10.8,
        pauseRatio: 0.47,
        speechRate: 74.1,
      },
      createdAt: "2026-05-02T06:00:00Z",
    },
  },
  {
    id: "p6",
    name: "Rekha Devi",
    phone: "+91-8765432109",
    language: "hi",
    latitude: 26.8467,
    longitude: 80.9462, // Lucknow, UP
    lastScreening: {
      id: "s6",
      depressionScore: 0.54,
      riskLevel: "moderate" as const,
      transcript:
        "Thoda sa mann udaas rehta hai. Khana bana leti hoon, bachche ka dhyan rakh leti hoon. Par kabhi kabhi bahut akela lagta hai.",
      actionPlan:
        "Schedule follow-up screening in 2 weeks. Recommend peer support group at local Anganwadi centre. Monitor sleep and appetite patterns.",
      biomarkers: {
        f0Mean: 174.2,
        jitter: 0.019,
        shimmer: 0.051,
        hnr: 14.6,
        pauseRatio: 0.33,
        speechRate: 92.8,
      },
      createdAt: "2026-05-01T11:30:00Z",
    },
  },
];

export const RISK_CONFIG = {
  critical: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
    color: "#ef4444",
  },
  high: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
    color: "#f97316",
  },
  moderate: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    color: "#f59e0b",
  },
  low: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    color: "#10b981",
  },
} as const;
