import type { Metadata } from "next";
import {
  AlertTriangle,
  TrendingUp,
  Users,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { getPatients } from "@/lib/api";
import { MOCK_PATIENTS } from "@/lib/mock-data";
import { ScreeningFeed, type FeedRow } from "@/components/screening-feed";
import type { RiskLevel } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — VoxAID",
};

const VALID_RISK_LEVELS = new Set<string>([
  "low",
  "moderate",
  "high",
  "critical",
]);

function toRiskLevel(value: string | null | undefined): RiskLevel {
  return VALID_RISK_LEVELS.has(value ?? "") ? (value as RiskLevel) : "low";
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const apiPatients = await getPatients();
  const useApi = apiPatients.length > 0;

  let feed: FeedRow[];
  let totalPatients = 0;
  let criticalCount = 0;
  let highCount = 0;
  let screeningsThisWeek = 0;
  let screeningsLastWeek = 0;

  if (useApi) {
    totalPatients = apiPatients.length;
    feed = apiPatients.flatMap((p) =>
      p.screenings.map((s) => ({
        screeningId: s.id,
        patientId: p.id,
        patientName: p.name,
        patientPhone: p.phone,
        riskLevel: toRiskLevel(s.depressionRisk),
        depressionScore: s.depressionScore ?? 0,
        transcript: s.transcript ?? "",
        transcriptEn: s.transcriptEn ?? null,
        language: s.language ?? p.language,
        source: s.source ?? "ivr",
        createdAt: s.createdAt,
      })),
    );

    apiPatients.forEach((p) => {
      const latest = p.screenings[0];
      if (!latest) return;
      const risk = toRiskLevel(latest.depressionRisk);
      if (risk === "critical") criticalCount++;
      if (risk === "high") highCount++;
    });

    const now = Date.now();
    feed.forEach((s) => {
      const ageMs = now - new Date(s.createdAt).getTime();
      if (ageMs >= 0 && ageMs < WEEK_MS) screeningsThisWeek++;
      else if (ageMs >= WEEK_MS && ageMs < 2 * WEEK_MS) screeningsLastWeek++;
    });
  } else {
    totalPatients = MOCK_PATIENTS.length;
    feed = MOCK_PATIENTS.map((p) => ({
      screeningId: p.lastScreening.id,
      patientId: p.id,
      patientName: p.name,
      patientPhone: p.phone,
      riskLevel: p.lastScreening.riskLevel,
      depressionScore: p.lastScreening.depressionScore,
      transcript: p.lastScreening.transcript,
      transcriptEn: p.lastScreening.transcriptEn ?? null,
      language: p.language,
      source: "ivr",
      createdAt: p.lastScreening.createdAt,
    }));
    criticalCount = feed.filter((r) => r.riskLevel === "critical").length;
    highCount = feed.filter((r) => r.riskLevel === "high").length;
    screeningsThisWeek = feed.length;
  }

  // Newest first.
  feed.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const weekDelta = screeningsThisWeek - screeningsLastWeek;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Patients" value={totalPatients} />
        <StatCard
          icon={AlertTriangle}
          label="Critical"
          value={criticalCount}
          accent="text-red-600"
        />
        <StatCard
          icon={TrendingUp}
          label="High Risk"
          value={highCount}
          accent="text-orange-600"
        />
        <StatCard
          icon={CalendarDays}
          label="Screenings This Week"
          value={screeningsThisWeek}
          chip={
            useApi && weekDelta !== 0 ? <DeltaChip delta={weekDelta} /> : null
          }
        />
      </div>

      {useApi && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit border border-emerald-100">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </span>
          Live data from API
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-semibold text-slate-900">
              Recent Screenings
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {feed.length} call{feed.length === 1 ? "" : "s"} — newest first
            </p>
          </div>
          <Link
            href="/dashboard/map"
            className="hidden sm:inline-flex text-xs text-slate-500 hover:text-primary-700 transition-colors"
          >
            View on map →
          </Link>
        </div>

        <ScreeningFeed feed={feed} pageSize={20} />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  chip,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent?: string;
  chip?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary-700" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={`text-xl font-bold tabular-nums ${accent ?? "text-slate-900"}`}
            >
              {value}
            </p>
            {chip}
          </div>
          <p className="text-xs text-slate-500 truncate">{label}</p>
        </div>
      </div>
    </div>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
        positive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {positive ? "+" : ""}
      {delta}
    </span>
  );
}
