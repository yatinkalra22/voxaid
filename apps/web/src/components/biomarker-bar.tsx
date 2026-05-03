import { BIOMARKER_SPECS, isBiomarkerWarning, type BiomarkerKey } from "@/lib/biomarker-ranges";

interface BiomarkerBarProps {
  metric: BiomarkerKey;
  value: number;
}

export function BiomarkerBar({ metric, value }: BiomarkerBarProps) {
  const spec = BIOMARKER_SPECS[metric];
  const range = spec.max - spec.min;
  const clamp = (n: number) => Math.max(0, Math.min(1, (n - spec.min) / range));
  const healthyStart = clamp(spec.healthyMin) * 100;
  const healthyWidth = (clamp(spec.healthyMax) - clamp(spec.healthyMin)) * 100;
  const valuePct = clamp(value) * 100;
  const warning = isBiomarkerWarning(metric, value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-slate-700">{spec.label}</div>
          <div className="text-[10px] text-slate-400">{spec.hint}</div>
        </div>
        <div
          className={`text-sm font-semibold tabular-nums ${
            warning ? "text-red-700" : "text-slate-900"
          }`}
        >
          {spec.format(value)}
        </div>
      </div>

      <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
        {/* Healthy zone band */}
        <div
          className="absolute top-0 bottom-0 bg-emerald-200/70"
          style={{ left: `${healthyStart}%`, width: `${healthyWidth}%` }}
          aria-hidden
        />
        {/* Current-value marker — vertical bar */}
        <div
          className={`absolute top-0 bottom-0 w-[3px] ${
            warning ? "bg-red-600" : "bg-slate-700"
          }`}
          style={{ left: `calc(${valuePct}% - 1.5px)` }}
          aria-hidden
        />
      </div>

      <div className="flex justify-between text-[9px] text-slate-400 tabular-nums">
        <span>{spec.format(spec.min)}</span>
        <span>{spec.format(spec.max)}</span>
      </div>
    </div>
  );
}
