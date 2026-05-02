// Shared types across web + api

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface Patient {
  id: string;
  name: string;
  phone: string;
  language: string;
  latitude: number;
  longitude: number;
  assignedChwId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Screening {
  id: string;
  patientId: string;
  audioUrl: string;
  transcript: string | null;
  depressionRisk: RiskLevel;
  depressionScore: number;
  actionPlan: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    hint?: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
