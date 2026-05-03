"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface ScoreGaugeProps {
  score: number; // 0-1
  color: string;
  riskLabel: string;
  size?: number; // px
}

/** Radial ring score viz. Replaces the flat AnimatedScore. */
export function ScoreGauge({ score, color, riskLabel, size = 120 }: ScoreGaugeProps) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(1, score));

  const progress = useMotionValue(0);
  const offset = useTransform(progress, (v) => c * (1 - v));
  const pct = useTransform(progress, (v) => `${Math.round(v * 100)}%`);

  useEffect(() => {
    const ctrl = animate(progress, target, { duration: 1.2, ease: "easeOut" });
    return () => ctrl.stop();
  }, [progress, target]);

  return (
    <motion.div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#f1f5f9"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: offset }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="font-heading text-2xl font-bold tabular-nums text-slate-900">
          {pct}
        </motion.span>
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color }}>
          {riskLabel}
        </span>
      </div>
    </motion.div>
  );
}
