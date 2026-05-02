"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <AlertTriangle className="w-10 h-10 text-red-500" />
      <h2 className="text-lg font-semibold text-slate-900">
        Something went wrong
      </h2>
      <p className="text-sm text-slate-500 max-w-md text-center">
        {error.message || "An unexpected error occurred while loading the dashboard."}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
