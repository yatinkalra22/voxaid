import {
  AlertTriangle,
  Phone,
  TrendingUp,
  Users,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

// Demo seed data — replaced with real DB queries in production
const MOCK_PATIENTS = [
  {
    id: "p1",
    name: "Priya Sharma",
    phone: "+91-9876543210",
    language: "hi",
    lastScreening: {
      depressionScore: 0.82,
      riskLevel: "critical" as const,
      createdAt: "2026-05-02T08:30:00Z",
    },
  },
  {
    id: "p2",
    name: "Amina Osei",
    phone: "+233-244567890",
    language: "en",
    lastScreening: {
      depressionScore: 0.65,
      riskLevel: "high" as const,
      createdAt: "2026-05-02T07:15:00Z",
    },
  },
  {
    id: "p3",
    name: "Maria Garcia",
    phone: "+52-5512345678",
    language: "es",
    lastScreening: {
      depressionScore: 0.41,
      riskLevel: "moderate" as const,
      createdAt: "2026-05-01T16:45:00Z",
    },
  },
  {
    id: "p4",
    name: "Fatima Begum",
    phone: "+880-1712345678",
    language: "bn",
    lastScreening: {
      depressionScore: 0.18,
      riskLevel: "low" as const,
      createdAt: "2026-05-01T14:00:00Z",
    },
  },
  {
    id: "p5",
    name: "Grace Wanjiku",
    phone: "+254-712345678",
    language: "sw",
    lastScreening: {
      depressionScore: 0.73,
      riskLevel: "high" as const,
      createdAt: "2026-05-02T06:00:00Z",
    },
  },
];

const RISK_CONFIG = {
  critical: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  high: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  moderate: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  low: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
};

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
