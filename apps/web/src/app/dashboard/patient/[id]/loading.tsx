export default function PatientLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back link + header */}
      <div className="h-4 w-24 bg-slate-200 rounded" />
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-6 w-16 bg-slate-200 rounded-full" />
        </div>
        <div className="h-4 w-32 bg-slate-200 rounded" />
      </div>
      {/* Biomarkers skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 h-24 shadow-sm border border-slate-200">
            <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
            <div className="h-6 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
