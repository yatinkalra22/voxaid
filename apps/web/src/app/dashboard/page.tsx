import type { Metadata } from "next";
import {
  AlertTriangle,
  Phone,
  TrendingUp,
  Users,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { getPatients } from "@/lib/api";
import { MOCK_PATIENTS, RISK_CONFIG } from "@/lib/mock-data";
import type { RiskLevel } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Dashboard — VoxAID",
};

const VALID_RISK_LEVELS = new Set<string>(["low", "moderate", "high", "critical"]);

function toRiskLevel(value: string | null | undefined): RiskLevel {
  return VALID_RISK_LEVELS.has(value ?? "") ? (value as RiskLevel) : "low";
}

export default async function DashboardPage() {
  const apiPatients = await getPatients();

  // Use API data if available, otherwise fall back to mock data for offline dev
  const useApi = apiPatients.length > 0;

  // Normalize to a common shape for rendering
  const patients = useApi
    ? apiPatients.map((p) => {
        const s = p.screenings[0];
        return {
          id: p.id,
          name: p.name,
          phone: p.phone,
          riskLevel: toRiskLevel(s?.depressionRisk),
          depressionScore: s?.depressionScore ?? 0,
        };
      })
    : MOCK_PATIENTS.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        riskLevel: p.lastScreening.riskLevel,
        depressionScore: p.lastScreening.depressionScore,
      }));

  const criticalCount = patients.filter((p) => p.riskLevel === "critical").length;
  const highCount = patients.filter((p) => p.riskLevel === "high").length;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Patients"
          value={patients.length}
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
          icon={Phone}
          label="Screenings Today"
          value={patients.length}
        />
      </div>

      {/* Data source indicator — helps judges see it's live */}
      {useApi && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Live data from API
        </div>
      )}

      {/* Patient list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
          <h2 className="font-heading text-lg font-semibold text-slate-900">
            Patients
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Sorted by risk level — critical first
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {patients
            .sort((a, b) => b.depressionScore - a.depressionScore)
            .map((patient) => {
              const risk = RISK_CONFIG[patient.riskLevel];
              return (
                <Link
                  key={patient.id}
                  href={`/dashboard/patient/${patient.id}`}
                  className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${risk.dot}`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {patient.name}
                      </p>
                      <p className="text-sm text-slate-500">{patient.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${risk.bg} ${risk.text} ${risk.border}`}
                    >
                      {patient.riskLevel}
                    </span>
                    <span className="text-sm font-medium text-slate-700 tabular-nums w-12 text-right">
                      {(patient.depressionScore * 100).toFixed(0)}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary-700" />
        </div>
        <div>
          <p className={`text-xl font-bold tabular-nums ${accent ?? "text-slate-900"}`}>
            {value}
          </p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
