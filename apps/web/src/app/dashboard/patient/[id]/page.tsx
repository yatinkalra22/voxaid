import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Globe,
  Activity,
  AlertTriangle,
  FileText,
  Sparkles,
  History,
  Languages,
} from "lucide-react";
import { getPatient, getAudioUrl } from "@/lib/api";
import type { Biomarkers } from "@/lib/api";
import { MOCK_PATIENTS, RISK_CONFIG } from "@/lib/mock-data";
import { ReferralButton } from "@/components/referral-button";
import { ScoreGauge } from "@/components/score-gauge";
import { AudioPlayer } from "@/components/audio-player";
import { BiomarkerBar } from "@/components/biomarker-bar";
import {
  ScreeningHistory,
  type HistoryScreening,
} from "@/components/screening-history";
import type { RiskLevel } from "@/lib/mock-data";
import type { BiomarkerKey } from "@/lib/biomarker-ranges";

const VALID_RISK_LEVELS = new Set<string>(["low", "moderate", "high", "critical"]);

function toRiskLevel(value: string | null | undefined): RiskLevel {
  return VALID_RISK_LEVELS.has(value ?? "") ? (value as RiskLevel) : "low";
}

const DEFAULT_BIOMARKERS: Biomarkers = {
  f0Mean: 0,
  jitter: 0,
  shimmer: 0,
  hnr: 0,
  pauseRatio: 0,
  speechRate: 0,
};

function toBiomarkers(raw: unknown): Biomarkers {
  if (!raw || typeof raw !== "object") return DEFAULT_BIOMARKERS;
  const obj = raw as Record<string, unknown>;
  return {
    f0Mean: typeof obj.f0Mean === "number" ? obj.f0Mean : 0,
    jitter: typeof obj.jitter === "number" ? obj.jitter : 0,
    shimmer: typeof obj.shimmer === "number" ? obj.shimmer : 0,
    hnr: typeof obj.hnr === "number" ? obj.hnr : 0,
    pauseRatio: typeof obj.pauseRatio === "number" ? obj.pauseRatio : 0,
    speechRate: typeof obj.speechRate === "number" ? obj.speechRate : 0,
  };
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  english: "English",
  hi: "Hindi",
  hindi: "Hindi",
  mr: "Marathi",
  marathi: "Marathi",
  pa: "Punjabi",
  punjabi: "Punjabi",
  ta: "Tamil",
  tamil: "Tamil",
  te: "Telugu",
  telugu: "Telugu",
  bn: "Bengali",
  bengali: "Bengali",
  sw: "Swahili",
  swahili: "Swahili",
  es: "Spanish",
  spanish: "Spanish",
  pt: "Portuguese",
  ur: "Urdu",
  urdu: "Urdu",
  zh: "Chinese",
  id: "Indonesian",
  fr: "French",
  ar: "Arabic",
};
const LANGUAGE_NATIVE: Record<string, string> = {
  hi: "हिन्दी",
  mr: "मराठी",
  pa: "ਪੰਜਾਬੀ",
  ta: "தமிழ்",
  te: "తెలుగు",
  bn: "বাংলা",
  ur: "اردو",
  sw: "Kiswahili",
  es: "Español",
  pt: "Português",
  ar: "العربية",
  zh: "中文",
  fr: "Français",
};
function languageDisplay(code: string): string {
  if (!code) return "—";
  const key = code.toLowerCase();
  const en = LANGUAGE_NAMES[key];
  const native = LANGUAGE_NATIVE[key.slice(0, 2)];
  if (en && native) return `${en} (${native})`;
  return en ?? code.toUpperCase();
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const patient = await getPatient(params.id);
  const mock = MOCK_PATIENTS.find((p) => p.id === params.id);
  const name = patient?.name ?? mock?.name ?? "Patient";
  return { title: `${name} — VoxAID` };
}

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { screening?: string };
}) {
  const apiPatient = await getPatient(params.id);
  const mockPatient = MOCK_PATIENTS.find((p) => p.id === params.id);

  if (!apiPatient && !mockPatient) return notFound();

  const screenings: HistoryScreening[] = apiPatient
    ? apiPatient.screenings.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        depressionScore: s.depressionScore ?? 0,
        riskLevel: toRiskLevel(s.depressionRisk),
        source: s.source ?? "ivr",
        transcript: s.transcript ?? "",
        transcriptEn: s.transcriptEn ?? null,
        language: s.language ?? apiPatient.language,
        actionPlan: s.actionPlan ?? "",
      }))
    : [
        {
          id: mockPatient!.lastScreening.id,
          createdAt: mockPatient!.lastScreening.createdAt,
          depressionScore: mockPatient!.lastScreening.depressionScore,
          riskLevel: mockPatient!.lastScreening.riskLevel,
          source: "ivr",
          transcript: mockPatient!.lastScreening.transcript,
          transcriptEn: mockPatient!.lastScreening.transcriptEn ?? null,
          language: mockPatient!.language,
          actionPlan: mockPatient!.lastScreening.actionPlan,
        },
      ];

  const requestedId = searchParams?.screening;
  const selected =
    apiPatient?.screenings.find((sc) => sc.id === requestedId) ??
    apiPatient?.screenings[0];
  const latestId = apiPatient?.screenings[0]?.id;
  const isViewingLatest = !apiPatient || selected?.id === latestId;

  const patient = apiPatient
    ? {
        name: apiPatient.name,
        phone: apiPatient.phone,
        language: apiPatient.language,
        latitude: apiPatient.latitude ?? 0,
        longitude: apiPatient.longitude ?? 0,
        screening: selected
          ? {
              id: selected.id,
              depressionScore: selected.depressionScore ?? 0,
              riskLevel: toRiskLevel(selected.depressionRisk),
              transcript: selected.transcript ?? "",
              transcriptEn: selected.transcriptEn ?? null,
              actionPlan: selected.actionPlan ?? "",
              biomarkers: toBiomarkers(selected.biomarkers),
              createdAt: selected.createdAt,
              language: selected.language ?? apiPatient.language,
              hasAudio: !!selected.audioUrl,
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
          id: mockPatient!.lastScreening.id,
          depressionScore: mockPatient!.lastScreening.depressionScore,
          riskLevel: mockPatient!.lastScreening.riskLevel,
          transcript: mockPatient!.lastScreening.transcript,
          transcriptEn: mockPatient!.lastScreening.transcriptEn ?? null,
          actionPlan: mockPatient!.lastScreening.actionPlan,
          biomarkers: mockPatient!.lastScreening.biomarkers,
          createdAt: mockPatient!.lastScreening.createdAt,
          language: mockPatient!.language,
          hasAudio: false,
        },
      };

  const s = patient.screening;
  if (!s) return notFound();

  const risk = RISK_CONFIG[s.riskLevel];
  const audioUrl = s.hasAudio ? await getAudioUrl(s.id) : null;
  const isUnknownName = !patient.name || patient.name.toLowerCase() === "unknown";
  const displayName = isUnknownName ? "Unknown caller" : patient.name;
  const hasLocation = patient.latitude !== 0 || patient.longitude !== 0;

  const biomarkerKeys: BiomarkerKey[] = [
    "f0Mean",
    "jitter",
    "shimmer",
    "hnr",
    "pauseRatio",
    "speechRate",
  ];

  const otherScreenings = screenings.filter((sc) => sc.id !== s.id);
  const actionPlanLines = (s.actionPlan ?? "")
    .split(/\n+|(?:^|\s)[-•]\s+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const renderAsList = actionPlanLines.length > 1;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to patients
      </Link>

      {!isViewingLatest && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
          <span className="inline-flex items-center gap-2 text-amber-800">
            <History className="w-4 h-4" />
            Viewing a past screening from {new Date(s.createdAt).toLocaleString()}
          </span>
          <Link
            href={`/dashboard/patient/${params.id}`}
            className="text-xs font-medium text-amber-900 hover:text-amber-700 underline-offset-2 hover:underline shrink-0"
          >
            View latest →
          </Link>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="min-w-0">
            <h1
              className={`font-heading text-3xl font-bold ${
                isUnknownName ? "text-slate-500 italic" : "text-slate-900"
              }`}
            >
              {displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {patient.phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {languageDisplay(s.language)}
              </span>
              {hasLocation && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {patient.latitude.toFixed(2)}, {patient.longitude.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <ScoreGauge
              score={s.depressionScore}
              color={risk.color}
              riskLabel={s.riskLevel}
            />
          </div>
        </div>

        {audioUrl && <AudioPlayer src={audioUrl} />}
      </div>

      {/* Transcript + Biomarkers */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <header className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-700" />
              <h2 className="font-heading font-semibold text-slate-900">
                Transcript
              </h2>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              {languageDisplay(s.language)}
            </span>
          </header>
          <p
            lang={s.language}
            className="text-sm text-slate-700 leading-relaxed italic bg-slate-50 rounded-xl p-4 border-l-2 border-primary-200"
          >
            &ldquo;{s.transcript || "—"}&rdquo;
          </p>
          {s.transcriptEn && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 mb-2">
                <Languages className="w-3 h-3" />
                English translation
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {s.transcriptEn}
              </p>
            </div>
          )}
          <div className="mt-3 text-[11px] text-slate-400">
            Recorded {new Date(s.createdAt).toLocaleString()}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <header className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary-700" />
            <h2 className="font-heading font-semibold text-slate-900">
              Voice Biomarkers
            </h2>
          </header>
          <p className="text-[11px] text-slate-500 mb-5">
            Compared against typical adult speech ranges. Green band = healthy.
          </p>
          <div className="space-y-4">
            {biomarkerKeys.map((key) => (
              <BiomarkerBar key={key} metric={key} value={s.biomarkers[key]} />
            ))}
          </div>
        </section>
      </div>

      {/* Action Plan */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <header className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary-700" />
            <h2 className="font-heading font-semibold text-slate-900">
              Action Plan
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            AI generated
          </span>
        </header>

        {renderAsList ? (
          <ul className="space-y-2">
            {actionPlanLines.map((line, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-primary-700 mt-0.5">•</span>
                <span className="leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed">
            {s.actionPlan || "—"}
          </p>
        )}

        <div className="mt-6">
          <ReferralButton
            screeningId={s.id}
            patientPhone={patient.phone}
          />
        </div>
      </section>

      {/* Screening history */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <header className="flex items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary-700" />
            <h2 className="font-heading font-semibold text-slate-900">
              Other Screenings
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Click any to load its full details above
          </span>
        </header>
        {otherScreenings.length === 0 ? (
          <p className="text-sm text-slate-500">
            This is the only screening on record. History will appear here as new calls come in.
          </p>
        ) : (
          <ScreeningHistory
            screenings={otherScreenings}
            patientId={params.id}
          />
        )}
      </section>
    </div>
  );
}
