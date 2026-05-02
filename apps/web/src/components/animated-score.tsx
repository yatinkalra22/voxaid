"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface AnimatedScoreProps {
  score: number; // 0-1
  riskLevel: string;
  riskColor: string;
}

export function AnimatedScore({ score, riskLevel, riskColor }: AnimatedScoreProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => `${Math.round(v)}%`);

  useEffect(() => {
    const controls = animate(count, score * 100, {
      duration: 1.2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [count, score]);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="text-center"
    >
      <motion.div className="text-3xl font-bold tabular-nums text-slate-900">
        {rounded}
      </motion.div>
      <div className="text-xs text-slate-500">Depression Score</div>
    </motion.div>
  );
}
