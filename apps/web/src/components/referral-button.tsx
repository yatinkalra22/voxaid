"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Send, Loader2 } from "lucide-react";
import { ReferralConfirmation } from "./referral-confirmation";
import type { RiskLevel } from "@/lib/mock-data";

interface ReferralButtonProps {
  screeningId: string;
  riskLevel: RiskLevel;
  patientPhone: string;
}

interface CreatedReferral {
  referralId: string;
  shareToken: string;
  actionWindow: string;
  riskLevel: RiskLevel;
  createdAt: string;
}

export function ReferralButton({
  screeningId,
  riskLevel,
  patientPhone,
}: ReferralButtonProps) {
  const { user } = useUser();
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [created, setCreated] = useState<CreatedReferral | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRefer() {
    setStatus("sending");
    setErrorMessage(null);
    try {
      const chwName =
        user?.fullName?.trim() ||
        user?.firstName?.trim() ||
        user?.username ||
        "CHW";

      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screeningId, chwName }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setErrorMessage(json?.error?.code ?? `HTTP ${res.status}`);
        setStatus("error");
        return;
      }
      setCreated(json.data as CreatedReferral);
      setStatus("idle");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  }

  if (created) {
    return (
      <ReferralConfirmation
        referralId={created.referralId}
        shareToken={created.shareToken}
        actionWindow={created.actionWindow}
        riskLevel={created.riskLevel}
        patientPhone={patientPhone}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleRefer}
        disabled={status === "sending"}
        className="inline-flex items-center justify-center gap-2 bg-primary-700 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-primary-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-70 self-start"
      >
        {status === "sending" ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="w-4 h-4" aria-hidden="true" />
        )}
        {status === "sending" ? "Creating referral..." : "Refer to Clinic"}
      </button>
      {errorMessage && (
        <p className="text-xs text-red-600">
          Failed to create referral: {errorMessage}
        </p>
      )}
    </div>
  );
}
