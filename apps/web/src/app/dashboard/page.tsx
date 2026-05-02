import {
  AlertTriangle,
  Phone,
  TrendingUp,
  Users,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { MOCK_PATIENTS, RISK_CONFIG } from "@/lib/mock-data";

export default function DashboardPage() {
  const criticalCount = MOCK_PATIENTS.filter(
    (p) => p.lastScreening.riskLevel === "critical"
  ).length;
  const highCount = MOCK_PATIENTS.filter(
    (p) => p.lastScreening.riskLevel === "high"
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Patients"
          value={MOCK_PATIENTS.length}
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
          value={3}
        />
      </div>

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
          {MOCK_PATIENTS.sort(
            (a, b) =>
              b.lastScreening.depressionScore - a.lastScreening.depressionScore
          ).map((patient) => {
            const risk = RISK_CONFIG[patient.lastScreening.riskLevel];
            return (
              <Link
                key={patient.id}
                href={`/dashboard/patient/${patient.id}`}
                className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Risk dot */}
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
                  {/* Risk badge */}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${risk.bg} ${risk.text} ${risk.border}`}
                  >
                    {patient.lastScreening.riskLevel}
                  </span>

                  {/* Score */}
                  <span className="text-sm font-medium text-slate-700 tabular-nums w-12 text-right">
                    {(patient.lastScreening.depressionScore * 100).toFixed(0)}%
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
