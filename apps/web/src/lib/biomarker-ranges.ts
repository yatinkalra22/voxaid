// Adult speech biomarker normal ranges (research-derived approximations).
// Used by the patient detail page to render bars-vs-healthy-zone.

export type BiomarkerKey =
  | "f0Mean"
  | "jitter"
  | "shimmer"
  | "hnr"
  | "pauseRatio"
  | "speechRate";

export interface BiomarkerSpec {
  label: string;
  unit: string;
  /** Display range (chart axis). */
  min: number;
  max: number;
  /** Healthy zone (green band). */
  healthyMin: number;
  healthyMax: number;
  /** "low-is-bad" → values below healthyMin are concerning (e.g. F0). */
  direction: "low-is-bad" | "high-is-bad";
  /** Display formatter for the numeric value. */
  format: (value: number) => string;
  hint: string;
}

export const BIOMARKER_SPECS: Record<BiomarkerKey, BiomarkerSpec> = {
  f0Mean: {
    label: "F0 Mean",
    unit: "Hz",
    min: 80,
    max: 260,
    healthyMin: 150,
    healthyMax: 240,
    direction: "low-is-bad",
    format: (v) => `${v.toFixed(1)} Hz`,
    hint: "Lower pitch is associated with depression",
  },
  jitter: {
    label: "Jitter",
    unit: "%",
    min: 0,
    max: 0.05,
    healthyMin: 0,
    healthyMax: 0.02,
    direction: "high-is-bad",
    format: (v) => `${(v * 100).toFixed(2)}%`,
    hint: "Pitch instability — rises in depression",
  },
  shimmer: {
    label: "Shimmer",
    unit: "%",
    min: 0,
    max: 0.12,
    healthyMin: 0,
    healthyMax: 0.05,
    direction: "high-is-bad",
    format: (v) => `${(v * 100).toFixed(2)}%`,
    hint: "Amplitude instability — rises in depression",
  },
  hnr: {
    label: "HNR",
    unit: "dB",
    min: 0,
    max: 25,
    healthyMin: 15,
    healthyMax: 25,
    direction: "low-is-bad",
    format: (v) => `${v.toFixed(1)} dB`,
    hint: "Voice clarity — drops with depression",
  },
  pauseRatio: {
    label: "Pause Ratio",
    unit: "%",
    min: 0,
    max: 1,
    healthyMin: 0,
    healthyMax: 0.35,
    direction: "high-is-bad",
    format: (v) => `${(v * 100).toFixed(0)}%`,
    hint: "Time spent silent — rises with psychomotor slowing",
  },
  speechRate: {
    label: "Speech Rate",
    unit: "f/s",
    min: 40,
    max: 160,
    healthyMin: 90,
    healthyMax: 150,
    direction: "low-is-bad",
    format: (v) => `${v.toFixed(0)} f/s`,
    hint: "Phonemes per second — slower in depression",
  },
};

export function isBiomarkerWarning(key: BiomarkerKey, value: number): boolean {
  const spec = BIOMARKER_SPECS[key];
  if (spec.direction === "low-is-bad") return value < spec.healthyMin;
  return value > spec.healthyMax;
}
