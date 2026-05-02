// Server-side data fetching for Next.js server components
// Uses the API rewrite (/api/*) which proxies to the NestJS backend

// Server-only — these env vars are NOT exposed to the browser
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = process.env.API_SECRET_KEY || '';

interface ApiResponse<T> {
  ok: boolean;
  data: T;
}

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'x-api-key': API_KEY },
      next: { revalidate: 5 },
    });

    if (!res.ok) return null;

    const json: ApiResponse<T> = await res.json();
    return json.ok ? json.data : null;
  } catch {
    // API is down — fall back to null (pages will show mock data)
    return null;
  }
}

// Types matching the Prisma schema + includes
export interface Biomarkers {
  f0Mean: number;
  jitter: number;
  shimmer: number;
  hnr: number;
  pauseRatio: number;
  speechRate: number;
}

export interface Screening {
  id: string;
  patientId: string;
  audioUrl: string;
  transcript: string | null;
  language: string;
  depressionScore: number | null;
  depressionRisk: 'low' | 'moderate' | 'high' | 'critical' | null;
  biomarkers: Biomarkers | null;
  actionPlan: string | null;
  source: string;
  callSid: string | null;
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  language: string;
  latitude: number | null;
  longitude: number | null;
  assignedChwId: string;
  createdAt: string;
  updatedAt: string;
  screenings: Screening[];
}

export async function getPatients(): Promise<Patient[]> {
  return (await fetchApi<Patient[]>('/patients')) ?? [];
}

export async function getPatient(id: string): Promise<Patient | null> {
  return fetchApi<Patient>(`/patients/${id}`);
}
