export default function MapLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-slate-200 rounded" />
        <div className="h-4 w-72 bg-slate-200 rounded" />
      </div>
      <div className="bg-slate-200 rounded-2xl h-[calc(100vh-12rem)]" />
    </div>
  );
}
