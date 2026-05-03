"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Lock,
  PhoneOutgoing,
  Printer,
  ShieldCheck,
  X,
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
  const [showDisabledModal, setShowDisabledModal] = useState(false);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/r/${shareToken}`);
  }, [shareToken]);

  const cfg = RISK_CONFIG[riskLevel];
  // Show the call action whenever there's a phone on file (even if masked) so
  // judges can see the feature; clicking opens the "disabled for demo" modal.
  const hasPatientPhone =
    !!patientPhone &&
    patientPhone !== "Anonymous" &&
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
        {hasPatientPhone && (
          <button
            type="button"
            onClick={() => setShowDisabledModal(true)}
            aria-haspopup="dialog"
            aria-expanded={showDisabledModal}
            title="Patient callback is disabled for the hackathon demo"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <PhoneOutgoing className="w-3.5 h-3.5" />
            Call patient back
          </button>
        )}
      </div>

      {showDisabledModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="callback-disabled-title"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setShowDisabledModal(false)}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-amber-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    id="callback-disabled-title"
                    className="font-heading font-semibold text-slate-900 text-base leading-tight"
                  >
                    Patient callback is disabled for this demo
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowDisabledModal(false)}
                    aria-label="Close"
                    className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  For the hackathon we&rsquo;ve turned off the automated
                  outbound call to patients. Real numbers on a public demo
                  shouldn&rsquo;t receive an unsolicited voice call without
                  consent capture and on-call moderation in place.
                </p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Please use{" "}
                  <span className="font-semibold text-slate-800">
                    Copy referral link
                  </span>{" "}
                  or{" "}
                  <span className="font-semibold text-slate-800">
                    Open in WhatsApp
                  </span>{" "}
                  above to share the referral with the clinic.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisabledModal(false);
                      void copy();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy referral link
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDisabledModal(false)}
                    className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
