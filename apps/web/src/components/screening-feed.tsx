"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  MessageSquare,
  Phone,
  Quote,
  Plus,
} from "lucide-react";
import { RiskPill } from "./risk-pill";
import { RISK_CONFIG, type RiskLevel } from "@/lib/mock-data";

export interface FeedRow {
  screeningId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  riskLevel: RiskLevel;
  depressionScore: number;
  transcript: string;
  source: string;
  createdAt: string;
}

interface ScreeningFeedProps {
  feed: FeedRow[];
  pageSize?: number;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function dayBucketLabel(when: Date, today: Date): string {
  const w = startOfDay(when).getTime();
  const t = startOfDay(today).getTime();
  const days = Math.round((t - w) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days >= 2 && days < 7) {
    return when.toLocaleDateString(undefined, { weekday: "long" });
  }
  return when.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
}

function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ScreeningFeed({ feed, pageSize = 20 }: ScreeningFeedProps) {
  const [visible, setVisible] = useState(pageSize);
  const shown = feed.slice(0, visible);
  const remaining = feed.length - visible;

  if (feed.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-sm text-slate-500">
        No screenings yet. Calls will appear here as they come in.
      </div>
    );
  }

  // Group visible rows by date.
  const today = new Date();
  const groups = new Map<string, FeedRow[]>();
  for (const row of shown) {
    const label = dayBucketLabel(new Date(row.createdAt), today);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(row);
  }

  return (
    <>
      <div className="divide-y divide-slate-100">
        {Array.from(groups.entries()).map(([label, rows]) => (
          <DateGroup key={label} label={label} rows={rows} />
        ))}
      </div>
      {remaining > 0 && (
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Showing {visible} of {feed.length}
          </p>
          <button
            type="button"
            onClick={() => setVisible((v) => v + pageSize)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 rounded-lg px-3 py-1.5"
          >
            <Plus className="w-4 h-4" />
            Show {Math.min(pageSize, remaining)} more
          </button>
        </div>
      )}
    </>
  );
}

function DateGroup({ label, rows }: { label: string; rows: FeedRow[] }) {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur px-4 sm:px-6 py-2 border-b border-slate-100">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </h3>
          <span className="text-[11px] text-slate-400 tabular-nums">
            {rows.length}
          </span>
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map((row) => (
          <FeedItem key={row.screeningId} row={row} />
        ))}
      </ul>
    </div>
  );
}

function FeedItem({ row }: { row: FeedRow }) {
  const risk = RISK_CONFIG[row.riskLevel];
  const isUnknown =
    !row.patientName ||
    row.patientName.toLowerCase() === "unknown" ||
    row.patientName.toLowerCase().startsWith("anon-");
  const SourceIcon = row.source === "whatsapp" ? MessageSquare : Phone;

  return (
    <li>
      <Link
        href={`/dashboard/patient/${row.patientId}`}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(160px,210px)_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400"
      >
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${risk.dot}`}
            aria-hidden
          />
          <div className="text-xs text-slate-500 tabular-nums w-12 sm:w-16 leading-tight">
            {timeOfDay(row.createdAt)}
          </div>
        </div>

        <div className="min-w-0">
          <p
            className={`font-medium truncate ${
              isUnknown ? "italic text-slate-500" : "text-slate-900"
            }`}
          >
            {isUnknown ? "Unknown caller" : row.patientName}
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <SourceIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{row.patientPhone}</span>
          </p>
        </div>

        <div className="hidden sm:flex min-w-0 items-start gap-2 text-sm text-slate-600">
          <Quote className="w-3 h-3 mt-1 shrink-0 text-slate-300" aria-hidden />
          <span className="italic line-clamp-2 leading-snug">
            {row.transcript || "—"}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <RiskPill risk={row.riskLevel} />
          <span className="text-sm font-semibold text-slate-900 tabular-nums w-10 sm:w-12 text-right">
            {Math.round(row.depressionScore * 100)}%
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </Link>
    </li>
  );
}
