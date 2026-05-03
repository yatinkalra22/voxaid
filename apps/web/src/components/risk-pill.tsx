import { RISK_CONFIG, type RiskLevel } from "@/lib/mock-data";

interface RiskPillProps {
  risk: RiskLevel;
  size?: "sm" | "md";
  className?: string;
}

export function RiskPill({ risk, size = "sm", className }: RiskPillProps) {
  const cfg = RISK_CONFIG[risk];
  const sizeCls =
    size === "md" ? "text-sm px-3 py-1" : "text-xs px-2.5 py-0.5";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${cfg.bg} ${cfg.text} ${cfg.border} ${sizeCls} ${className ?? ""}`}
    >
      {risk}
    </span>
  );
}
