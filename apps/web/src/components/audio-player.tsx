"use client";

import { Headphones, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  src: string | null;
}

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src }: AudioPlayerProps) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setCurrent(0);
    setDuration(0);
    setPlaying(false);
  }, [src]);

  const onToggle = () => {
    const el = ref.current;
    if (!el || !src) return;
    if (el.paused) {
      el.play().catch(() => setError("Recording unavailable"));
    } else {
      el.pause();
    }
  };

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = duration * Math.max(0, Math.min(1, ratio));
  };

  if (!src) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
          <Headphones className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-sm text-slate-500">Audio unavailable for this screening</div>
      </div>
    );
  }

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setError("Recording unavailable")}
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={!!error}
        aria-label={playing ? "Pause recording" : "Play recording"}
        className="w-10 h-10 rounded-full bg-primary-700 text-white flex items-center justify-center shrink-0 hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
      >
        {playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 translate-x-[1px]" fill="currentColor" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
          <Headphones className="w-3 h-3" />
          <span className="font-medium text-slate-700">Patient recording</span>
          {error && <span className="text-red-600 ml-auto">{error}</span>}
        </div>
        <div
          role="slider"
          aria-label="Recording position"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={current}
          tabIndex={0}
          onClick={onSeek}
          className="h-1.5 bg-slate-200 rounded-full overflow-hidden cursor-pointer"
        >
          <div
            className="h-full bg-primary-700 transition-[width] duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="text-xs text-slate-500 tabular-nums shrink-0 w-20 text-right">
        {fmt(current)} / {fmt(duration)}
      </div>
    </div>
  );
}
