"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";
import { RISK_CONFIG } from "@/lib/mock-data";
import type { RiskLevel } from "@/lib/mock-data";

export interface MapPatient {
  id: string;
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
  riskLevel: RiskLevel;
  depressionScore: number;
}

export function PatientMap({ patients }: { patients: MapPatient[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);

  // Stabilize patients reference to avoid unnecessary map rebuilds
  const stablePatients = useMemo(() => patients, [JSON.stringify(patients)]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setTokenMissing(true);
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [40, 10],
      zoom: 1.5,
    });

    stablePatients.forEach((patient) => {
      const risk = RISK_CONFIG[patient.riskLevel];
      if (!risk) return;

      const el = document.createElement("div");
      el.className = "patient-marker";
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${patient.name}, ${patient.riskLevel} risk`);
      el.setAttribute("tabindex", "0");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = risk.color;
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";

      const popup = new mapboxgl.Popup({
        offset: 12,
        closeButton: false,
        maxWidth: "240px",
      }).setHTML(`
        <div style="font-family: system-ui; padding: 4px 0;">
          <strong style="font-size: 14px; color: #0f172a;">
            ${patient.name}
          </strong>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
            ${patient.phone}
          </div>
          <div style="margin-top: 8px; display: flex; align-items: center; gap: 6px;">
            <span style="
              display: inline-block;
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 600;
              color: ${risk.color};
              background: ${risk.color}15;
            ">
              ${patient.riskLevel}
            </span>
            <span style="font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums;">
              ${(patient.depressionScore * 100).toFixed(0)}%
            </span>
          </div>
          <a href="/dashboard/patient/${patient.id}"
             style="display: block; margin-top: 8px; font-size: 12px; color: #0F766E; text-decoration: none;">
            View details &rarr;
          </a>
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat([patient.longitude, patient.latitude])
        .setPopup(popup)
        .addTo(map.current!);
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
    };
  }, [stablePatients]);

  if (tokenMissing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 w-full h-[calc(100vh-12rem)] rounded-2xl border border-slate-200 bg-slate-50">
        <MapPin className="w-8 h-8 text-slate-400" aria-hidden="true" />
        <p className="text-sm text-slate-500">
          Map unavailable — Mapbox token not configured.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      role="region"
      aria-label="Patient location map"
      className="w-full h-[calc(100vh-12rem)] rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    />
  );
}
