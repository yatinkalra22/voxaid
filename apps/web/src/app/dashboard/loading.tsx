export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 h-24 shadow-sm border border-slate-200">
            <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
            <div className="h-6 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      {/* Patient list skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="h-5 w-32 bg-slate-200 rounded" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-0">
            <div className="w-2.5 h-2.5 bg-slate-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </div>
            <div className="h-5 w-16 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
