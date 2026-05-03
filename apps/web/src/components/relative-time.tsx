interface RelativeTimeProps {
  value: string | Date;
  className?: string;
}

/** Server-side relative formatter ("2h ago"). Stable across renders. */
export function RelativeTime({ value, className }: RelativeTimeProps) {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  let label: string;
  if (sec < 60) label = `just now`;
  else if (min < 60) label = `${min}m ago`;
  else if (hr < 24) label = `${hr}h ago`;
  else if (day < 7) label = `${day}d ago`;
  else label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <time dateTime={date.toISOString()} className={className}>
      {label}
    </time>
  );
}
