import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { RISK_CONFIG, type RiskLevel } from "@/lib/mock-data";
import { PrintTrigger } from "@/components/print-trigger";

const API_BASE = process.env.API_URL || "http://localhost:3001";

interface ReferralResponse {
  ok: boolean;
  data?: {
    id: string;
    createdAt: string;
    riskLevel: RiskLevel;
    depressionScore: number;
    summary: string;
    actionWindow: string;
    chwName: string;
    patient: {
      firstName: string;
      maskedPhone: string;
      language: string;
    };
    screeningAt: string;
  };
}

async function loadReferral(token: string) {
  try {
    const res = await fetch(
      `${API_BASE}/referral/by-token/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json: ReferralResponse = await res.json();
    return json.ok ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const data = await loadReferral(params.token);
  return {
    title: data
      ? `Referral for ${data.patient.firstName} — VoxAID`
      : "Referral — VoxAID",
    robots: "noindex, nofollow",
  };
}

export default async function ReferralSlipPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { print?: string };
}) {
  const data = await loadReferral(params.token);
  if (!data) return notFound();

  const cfg = RISK_CONFIG[data.riskLevel];
  const shouldPrint = searchParams.print === "1";

  return (
    <main className="min-h-screen bg-slate-50 print:bg-white py-8 px-4 print:p-0">
      {shouldPrint && <PrintTrigger />}

      <article className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 print:shadow-none print:border-0 overflow-hidden">
        <header className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary-700" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                VoxAID Referral
              </div>
              <div className="font-mono text-sm text-slate-700">
                REF-{data.id.slice(-8)}
              </div>
            </div>
          </div>
          <div
            className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}
          >
            {data.riskLevel} · {(data.depressionScore * 100).toFixed(0)}%
          </div>
        </header>

        <section className="px-6 py-5 space-y-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Patient
            </div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1">
              {data.patient.firstName}
            </h1>
            <div className="text-sm text-slate-500">
              {data.patient.maskedPhone} · {data.patient.language.toUpperCase()}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 border-t border-slate-100">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Action Window
              </dt>
              <dd className="text-sm font-semibold text-slate-900 mt-0.5">
                {data.actionWindow}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Screening Date
              </dt>
              <dd className="text-sm text-slate-700 mt-0.5">
                {new Date(data.screeningAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Referred by
              </dt>
              <dd className="text-sm text-slate-700 mt-0.5">{data.chwName}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Referred on
              </dt>
              <dd className="text-sm text-slate-700 mt-0.5">
                {new Date(data.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>

          <div className="pt-2">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
              AI-generated summary
            </div>
            <p
              className={`text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border-l-2 ${cfg.border}`}
            >
              {data.summary}
            </p>
          </div>
        </section>

        <footer className="px-6 py-4 bg-slate-50 print:bg-white text-[11px] text-slate-500 leading-relaxed border-t border-slate-100">
          This is an automated voice-biomarker screening referral. Final
          clinical judgment rests with the assessing clinician. Generated by
          VoxAID — voice-based depression screening for community health
          workers.
        </footer>
      </article>
    </main>
  );
}
