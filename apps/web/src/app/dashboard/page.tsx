import type { Metadata } from "next";
import {
  AlertTriangle,
  Phone,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { getPatients } from "@/lib/api";
import { MOCK_PATIENTS, RISK_CONFIG } from "@/lib/mock-data";
import { Sparkline } from "@/components/sparkline";
import { RiskPill } from "@/components/risk-pill";
import { RelativeTime } from "@/components/relative-time";
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

interface Row {
  id: string;
  name: string;
  phone: string;
  riskLevel: RiskLevel;
  depressionScore: number;
  /** scores chronological — oldest first; suitable for sparkline */
  trend: number[];
  /** Δ between latest and prior score, or 0 if only one point */
  delta: number;
  lastScreeningAt: string | null;
}

export default async function DashboardPage() {
  const apiPatients = await getPatients();
  const useApi = apiPatients.length > 0;

  let rows: Row[];
  let screeningsThisWeek = 0;
  let screeningsLastWeek = 0;

  if (useApi) {
    rows = apiPatients.map((p) => {
      const screenings = p.screenings; // newest-first from API (take: 5)
      const latest = screenings[0];
      // Sparkline wants oldest→newest
      const trend = [...screenings]
        .reverse()
        .map((s) => s.depressionScore ?? 0);
      const delta =
        screenings.length >= 2
          ? (screenings[0].depressionScore ?? 0) -
            (screenings[1].depressionScore ?? 0)
          : 0;
      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        riskLevel: toRiskLevel(latest?.depressionRisk),
        depressionScore: latest?.depressionScore ?? 0,
        trend,
        delta,
        lastScreeningAt: latest?.createdAt ?? null,
      };
    });

    // Stat: screenings this week / last week
    const now = Date.now();
    apiPatients.forEach((p) => {
      p.screenings.forEach((s) => {
        const t = new Date(s.createdAt).getTime();
        const ageMs = now - t;
        if (ageMs >= 0 && ageMs < WEEK_MS) screeningsThisWeek++;
        else if (ageMs >= WEEK_MS && ageMs < 2 * WEEK_MS)
          screeningsLastWeek++;
      });
    });
  } else {
    rows = MOCK_PATIENTS.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      riskLevel: p.lastScreening.riskLevel,
      depressionScore: p.lastScreening.depressionScore,
      trend: [p.lastScreening.depressionScore],
      delta: 0,
      lastScreeningAt: p.lastScreening.createdAt,
    }));
    screeningsThisWeek = MOCK_PATIENTS.length;
  }

  rows.sort((a, b) => b.depressionScore - a.depressionScore);

  const criticalCount = rows.filter((r) => r.riskLevel === "critical").length;
  const highCount = rows.filter((r) => r.riskLevel === "high").length;
  const weekDelta = screeningsThisWeek - screeningsLastWeek;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Patients"
          value={rows.length}
        />
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
            useApi && weekDelta !== 0 ? (
              <DeltaChip delta={weekDelta} />
            ) : null
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
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
          <h2 className="font-heading text-lg font-semibold text-slate-900">
            Patients
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Sorted by depression score — critical first
          </p>
        </div>

        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <PatientRow key={row.id} row={row} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function PatientRow({ row }: { row: Row }) {
  const risk = RISK_CONFIG[row.riskLevel];
  const isUnknown = !row.name || row.name.toLowerCase() === "unknown";

  let TrendIcon = Minus;
  let trendColor = "text-slate-400";
  if (row.trend.length >= 2) {
    if (row.delta < -0.02) {
      TrendIcon = TrendingDown;
      trendColor = "text-emerald-600";
    } else if (row.delta > 0.02) {
      TrendIcon = TrendingUp;
      trendColor = "text-red-600";
    }
  }

  return (
    <li>
      <Link
        href={`/dashboard/patient/${row.id}`}
        className="flex items-center gap-4 px-4 sm:px-6 py-3.5 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400"
      >
        {/* Left: identity */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${risk.dot}`}
            aria-hidden
          />
          <div className="min-w-0">
            <p
              className={`font-medium truncate ${
                isUnknown ? "italic text-slate-500" : "text-slate-900"
              }`}
            >
              {isUnknown ? "Unknown caller" : row.name}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              {row.phone}
            </p>
          </div>
        </div>

        {/* Middle: trend sparkline */}
        <div className="hidden sm:block shrink-0" aria-hidden>
          <Sparkline points={row.trend} color={risk.color} width={80} height={28} />
        </div>

        {/* Right: trend arrow + risk + score + relative time */}
        <div className="flex items-center gap-3 shrink-0">
          <TrendIcon className={`w-4 h-4 ${trendColor}`} aria-hidden />
          <RiskPill risk={row.riskLevel} />
          <span className="text-sm font-semibold text-slate-900 tabular-nums w-12 text-right">
            {Math.round(row.depressionScore * 100)}%
          </span>
          {row.lastScreeningAt && (
            <RelativeTime
              value={row.lastScreeningAt}
              className="hidden md:inline text-xs text-slate-400 tabular-nums w-16 text-right"
            />
          )}
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
      </Link>
    </li>
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
            <p className={`text-xl font-bold tabular-nums ${accent ?? "text-slate-900"}`}>
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
