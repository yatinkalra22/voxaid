// Server-renderable mini line chart. No deps.
// Pass scores (0-1) chronological — oldest first.

interface SparklineProps {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  showAxis?: boolean;
}

export function Sparkline({
  points,
  color = "#0f766e",
  width = 80,
  height = 24,
  className,
  showAxis = false,
}: SparklineProps) {
  if (!points.length) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden
      >
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke="#cbd5e1"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  if (points.length === 1) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden
      >
        <circle cx={width / 2} cy={height / 2} r={3} fill={color} />
      </svg>
    );
  }

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const stepX = innerW / (points.length - 1);
  const yFor = (v: number) => padding + (1 - Math.max(0, Math.min(1, v))) * innerH;

  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${padding + i * stepX} ${yFor(v)}`)
    .join(" ");

  // Area fill path
  const areaD = `${d} L ${padding + innerW} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      {showAxis && (
        <line
          x1={padding}
          y1={yFor(0.5)}
          x2={width - padding}
          y2={yFor(0.5)}
          stroke="#e2e8f0"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}
      <path d={areaD} fill={color} fillOpacity={0.08} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={padding + (points.length - 1) * stepX}
        cy={yFor(points[points.length - 1])}
        r={2}
        fill={color}
      />
    </svg>
  );
}
