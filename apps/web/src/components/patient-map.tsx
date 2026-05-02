"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MOCK_PATIENTS, RISK_CONFIG } from "@/lib/mock-data";

export function PatientMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn("NEXT_PUBLIC_MAPBOX_TOKEN not set — map disabled");
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      // Light clinical style — matches the "Linear meets WHO" vibe
      style: "mapbox://styles/mapbox/light-v11",
      center: [40, 10], // Centered between Africa/Asia to show all demo patients
      zoom: 1.5,
    });

    // Add patient markers
    MOCK_PATIENTS.forEach((patient) => {
      const risk = RISK_CONFIG[patient.lastScreening.riskLevel];

      // Custom marker element
      const el = document.createElement("div");
      el.className = "patient-marker";
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = risk.color;
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";

      // Popup with patient info
      const popup = new mapboxgl.Popup({
        offset: 12,
        closeButton: false,
        maxWidth: "240px",
      }).setHTML(`
        <div style="font-family: system-ui; padding: 4px 0;">
          <div style="font-weight: 600; font-size: 14px; color: #0f172a;">
            ${patient.name}
          </div>
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
              ${patient.lastScreening.riskLevel}
            </span>
            <span style="font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums;">
              ${(patient.lastScreening.depressionScore * 100).toFixed(0)}%
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
  }, []);

  return (
    <div
      ref={mapContainer}
      className="w-full h-[calc(100vh-12rem)] rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    />
  );
}
