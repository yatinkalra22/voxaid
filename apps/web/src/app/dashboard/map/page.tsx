import { PatientMap } from "@/components/patient-map";

export default function MapPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          Patient Map
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Geographic view of flagged patients. Click a marker for details.
        </p>
      </div>

      <PatientMap />
    </div>
  );
}
