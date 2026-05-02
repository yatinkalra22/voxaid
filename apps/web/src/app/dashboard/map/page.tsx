import { PatientMap } from "@/components/patient-map";
import type { MapPatient } from "@/components/patient-map";
import { getPatients } from "@/lib/api";
import { MOCK_PATIENTS } from "@/lib/mock-data";
import type { RiskLevel } from "@/lib/mock-data";

export default async function MapPage() {
  const apiPatients = await getPatients();

  // Normalize API or mock data into MapPatient shape
  const patients: MapPatient[] =
    apiPatients.length > 0
      ? apiPatients
          .filter((p) => p.latitude && p.longitude)
          .map((p) => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            latitude: p.latitude!,
            longitude: p.longitude!,
            riskLevel: (p.screenings[0]?.depressionRisk ?? "low") as RiskLevel,
            depressionScore: p.screenings[0]?.depressionScore ?? 0,
          }))
      : MOCK_PATIENTS.map((p) => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          latitude: p.latitude,
          longitude: p.longitude,
          riskLevel: p.lastScreening.riskLevel,
          depressionScore: p.lastScreening.depressionScore,
        }));

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

      <PatientMap patients={patients} />
    </div>
  );
}
