"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";
import { Sparkline } from "./sparkline";
import { RiskPill } from "./risk-pill";
import { RISK_CONFIG, type RiskLevel } from "@/lib/mock-data";

export interface HistoryScreening {
  id: string;
  createdAt: string;
  depressionScore: number;
  riskLevel: RiskLevel;
  source: string;
  transcript: string;
  actionPlan: string;
}

interface ScreeningHistoryProps {
  screenings: HistoryScreening[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ScreeningHistory({ screenings }: ScreeningHistoryProps) {
  if (!screenings.length) {
    return (
      <div className="text-sm text-slate-500 italic">
        No past screenings on record.
      </div>
    );
  }

  // Sparkline data: oldest first, scores 0-1.
  const trendPoints = [...screenings]
    .reverse()
    .map((s) => Math.max(0, Math.min(1, s.depressionScore)));

  const latestRisk = screenings[0].riskLevel;
  const trendColor = RISK_CONFIG[latestRisk].color;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">
            Depression score across {screenings.length} screening
            {screenings.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xs text-slate-400">
              {formatDate(screenings[screenings.length - 1].createdAt)}
            </span>
            <span className="text-xs text-slate-400">→</span>
            <span className="text-xs text-slate-400">
              {formatDate(screenings[0].createdAt)}
            </span>
          </div>
        </div>
        <Sparkline
          points={trendPoints}
          color={trendColor}
          width={160}
          height={48}
          showAxis
        />
      </div>

      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {screenings.map((s) => (
          <HistoryRow key={s.id} screening={s} />
        ))}
      </ul>
    </div>
  );
}

function HistoryRow({ screening }: { screening: HistoryScreening }) {
  const [open, setOpen] = useState(false);
  const SourceIcon = screening.source === "whatsapp" ? MessageSquare : Phone;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 transition-colors px-2 -mx-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
      >
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-slate-700 tabular-nums w-24 shrink-0">
            {formatDate(screening.createdAt)}
          </span>
          <RiskPill risk={screening.riskLevel} />
          <span className="text-sm font-semibold text-slate-900 tabular-nums">
            {Math.round(screening.depressionScore * 100)}%
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 uppercase tracking-wider shrink-0">
          <SourceIcon className="w-3 h-3" />
          {screening.source}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pl-7 pr-2 pb-4 space-y-3 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                  Transcript
                </div>
                <p className="text-slate-700 italic bg-slate-50 rounded-lg p-3 leading-relaxed">
                  &ldquo;{screening.transcript || "—"}&rdquo;
                </p>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                  Action plan
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {screening.actionPlan || "—"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
