import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Globe,
  Clock,
  Activity,
  AlertTriangle,
  FileText,
  Send,
} from "lucide-react";
import { getPatient } from "@/lib/api";
import { MOCK_PATIENTS, RISK_CONFIG } from "@/lib/mock-data";
import type { RiskLevel } from "@/lib/mock-data";

export default async function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Try API first, fall back to mock
  const apiPatient = await getPatient(params.id);
  const mockPatient = MOCK_PATIENTS.find((p) => p.id === params.id);

  if (!apiPatient && !mockPatient) return notFound();

  // Normalize to common shape
  const patient = apiPatient
    ? {
        name: apiPatient.name,
        phone: apiPatient.phone,
        language: apiPatient.language,
        latitude: apiPatient.latitude ?? 0,
        longitude: apiPatient.longitude ?? 0,
        screening: apiPatient.screenings[0]
          ? {
              depressionScore: apiPatient.screenings[0].depressionScore ?? 0,
              riskLevel: (apiPatient.screenings[0].depressionRisk ?? "low") as RiskLevel,
              transcript: apiPatient.screenings[0].transcript ?? "",
              actionPlan: apiPatient.screenings[0].actionPlan ?? "",
              biomarkers: (apiPatient.screenings[0].biomarkers ?? {}) as {
                f0Mean: number;
                jitter: number;
                shimmer: number;
                hnr: number;
                pauseRatio: number;
                speechRate: number;
              },
              createdAt: apiPatient.screenings[0].createdAt,
            }
          : null,
      }
    : {
        name: mockPatient!.name,
        phone: mockPatient!.phone,
        language: mockPatient!.language,
        latitude: mockPatient!.latitude,
        longitude: mockPatient!.longitude,
        screening: {
          depressionScore: mockPatient!.lastScreening.depressionScore,
          riskLevel: mockPatient!.lastScreening.riskLevel,
          transcript: mockPatient!.lastScreening.transcript,
          actionPlan: mockPatient!.lastScreening.actionPlan,
          biomarkers: mockPatient!.lastScreening.biomarkers,
          createdAt: mockPatient!.lastScreening.createdAt,
        },
      };

  const s = patient.screening;
  if (!s) return notFound();

  const risk = RISK_CONFIG[s.riskLevel];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to patients
      </Link>

      {/* Patient header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">
              {patient.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {patient.phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {patient.language.toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {patient.latitude.toFixed(2)}, {patient.longitude.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Risk badge large */}
          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-xl border ${risk.bg} ${risk.text} ${risk.border}`}
            >
              <div className="text-xs font-medium uppercase tracking-wider">
                Risk Level
              </div>
              <div className="text-lg font-bold capitalize">
                {s.riskLevel}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold tabular-nums text-slate-900">
                {(s.depressionScore * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500">Depression Score</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Transcript */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-primary-700" />
            <h2 className="font-heading font-semibold text-slate-900">
              Transcript
            </h2>
            <span className="text-xs text-slate-400 ml-auto">
              <Clock className="w-3 h-3 inline mr-1" />
              {new Date(s.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed italic bg-slate-50 rounded-xl p-4">
            &ldquo;{s.transcript}&rdquo;
          </p>
        </div>

        {/* Voice Biomarkers */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary-700" />
            <h2 className="font-heading font-semibold text-slate-900">
              Voice Biomarkers
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <BiomarkerCard
              label="F0 Mean"
              value={`${s.biomarkers.f0Mean.toFixed(1)} Hz`}
              hint="Lower in depression"
              warning={s.biomarkers.f0Mean < 150}
            />
            <BiomarkerCard
              label="Jitter"
              value={`${(s.biomarkers.jitter * 100).toFixed(2)}%`}
              hint="Higher in depression"
              warning={s.biomarkers.jitter > 0.02}
            />
            <BiomarkerCard
              label="Shimmer"
              value={`${(s.biomarkers.shimmer * 100).toFixed(2)}%`}
              hint="Higher in depression"
              warning={s.biomarkers.shimmer > 0.05}
            />
            <BiomarkerCard
              label="HNR"
              value={`${s.biomarkers.hnr.toFixed(1)} dB`}
              hint="Lower in depression"
              warning={s.biomarkers.hnr < 15}
            />
            <BiomarkerCard
              label="Pause Ratio"
              value={`${(s.biomarkers.pauseRatio * 100).toFixed(0)}%`}
              hint="Higher in depression"
              warning={s.biomarkers.pauseRatio > 0.35}
            />
            <BiomarkerCard
              label="Speech Rate"
              value={`${s.biomarkers.speechRate.toFixed(0)} f/s`}
              hint="Lower in depression"
              warning={s.biomarkers.speechRate < 90}
            />
          </div>
        </div>
      </div>

      {/* Action Plan */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-primary-700" />
          <h2 className="font-heading font-semibold text-slate-900">
            Action Plan
          </h2>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">
          {s.actionPlan}
        </p>

        {/* Refer to clinic CTA */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button className="inline-flex items-center justify-center gap-2 bg-primary-700 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-primary-800 transition-colors shadow-sm">
            <Send className="w-4 h-4" />
            Refer to Clinic
          </button>
          <button className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 font-medium px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
            <Phone className="w-4 h-4" />
            Call Patient
          </button>
        </div>
      </div>
    </div>
  );
}

function BiomarkerCard({
  label,
  value,
  hint,
  warning,
}: {
  label: string;
  value: string;
  hint: string;
  warning: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        warning
          ? "bg-red-50 border-red-100"
          : "bg-slate-50 border-slate-100"
      }`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`text-lg font-bold tabular-nums ${
          warning ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-slate-400">{hint}</div>
    </div>
  );
}
