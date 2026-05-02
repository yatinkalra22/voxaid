"use client";

import { useState } from "react";
import { Send, Check, Loader2 } from "lucide-react";

interface ReferralButtonProps {
  patientName: string;
  patientPhone: string;
  riskLevel: string;
  depressionScore: number;
  actionPlan: string;
}

export function ReferralButton({
  patientName,
  patientPhone,
  riskLevel,
  depressionScore,
  actionPlan,
}: ReferralButtonProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleRefer() {
    setStatus("sending");
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName,
          patientPhone,
          riskLevel,
          depressionScore,
          summary: actionPlan.slice(0, 500),
          clinicName: "PHC District Hospital",
          clinicPhone: "+15005550006", // Twilio test number for demo
          chwName: "Demo CHW",
        }),
      });

      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  if (status === "sent") {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm"
      >
        <Check className="w-4 h-4" aria-hidden="true" />
        Referral Sent
      </button>
    );
  }

  return (
    <button
      onClick={handleRefer}
      disabled={status === "sending"}
      className="inline-flex items-center justify-center gap-2 bg-primary-700 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-primary-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-70"
    >
      {status === "sending" ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        <Send className="w-4 h-4" aria-hidden="true" />
      )}
      {status === "sending"
        ? "Sending Referral..."
        : status === "error"
          ? "Retry Referral"
          : "Refer to Clinic"}
    </button>
  );
}
