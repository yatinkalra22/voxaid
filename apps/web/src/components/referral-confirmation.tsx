"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  PhoneOutgoing,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { RiskPill } from "./risk-pill";
import { RISK_CONFIG, type RiskLevel } from "@/lib/mock-data";

interface ReferralConfirmationProps {
  referralId: string;
  shareToken: string;
  actionWindow: string;
  riskLevel: RiskLevel;
  patientPhone: string;
}

export function ReferralConfirmation({
  referralId,
  shareToken,
  actionWindow,
  riskLevel,
  patientPhone,
}: ReferralConfirmationProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "called" | "error"
  >("idle");
  const [callError, setCallError] = useState<string | null>(null);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/r/${shareToken}`);
  }, [shareToken]);

  const cfg = RISK_CONFIG[riskLevel];
  const canCallPatient =
    !!patientPhone &&
    patientPhone.startsWith("+") &&
    !patientPhone.startsWith("anon-");

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Older browsers / iframe restrictions — pre-select the input as fallback.
    }
  }

  async function callPatient() {
    setCallStatus("calling");
    setCallError(null);
    try {
      const res = await fetch(`/api/referral/${referralId}/callback`, {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setCallError(json?.error?.code ?? `HTTP ${res.status}`);
        setCallStatus("error");
        return;
      }
      setCallStatus("called");
    } catch (err) {
      setCallError(err instanceof Error ? err.message : "Network error");
      setCallStatus("error");
    }
  }

  const whatsappHref = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(
        `VoxAID referral — ${actionWindow} action window: ${shareUrl}`,
      )}`
    : "#";

  return (
    <div
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 space-y-4 self-stretch`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl ${cfg.bg} ring-1 ${cfg.border} flex items-center justify-center shrink-0`}
          >
            <ShieldCheck className={`w-4 h-4 ${cfg.text}`} />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Referral recorded
            </div>
            <div className="text-sm font-mono text-slate-700 mt-0.5 truncate">
              REF-{referralId.slice(-8)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <RiskPill risk={riskLevel} size="md" />
          <span className="text-[11px] text-slate-500">
            Action window:{" "}
            <span className="font-semibold text-slate-700">{actionWindow}</span>
          </span>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Shareable referral link
        </label>
        <div className="mt-1 flex items-stretch gap-2">
          <input
            readOnly
            value={shareUrl}
            onClick={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          />
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
          Share this link via the channel you already use with the clinic
          (WhatsApp, SMS, paper). VoxAID does not assume the clinic&rsquo;s
          contact channel.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in WhatsApp
        </a>
        <a
          href={shareUrl ? `${shareUrl}?print=1` : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print slip
        </a>
        {canCallPatient && (
          <button
            type="button"
            onClick={callPatient}
            disabled={callStatus === "calling" || callStatus === "called"}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-70"
          >
            {callStatus === "calling" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : callStatus === "called" ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <PhoneOutgoing className="w-3.5 h-3.5" />
            )}
            {callStatus === "calling"
              ? "Calling patient..."
              : callStatus === "called"
                ? "Patient called"
                : "Call patient back"}
          </button>
        )}
      </div>

      {callError && (
        <p className="text-xs text-red-600">
          Callback failed: {callError}
        </p>
      )}
    </div>
  );
}
