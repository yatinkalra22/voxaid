"use client";

import { useEffect, useMemo, useRef } from "react";
import type { RiskLevel } from "@/lib/mock-data";
import { RISK_CONFIG } from "@/lib/mock-data";
import { maskPhone } from "@/lib/phone";

function useLeafletCSS() {
  useEffect(() => {
    const id = "leaflet-css";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }, []);
}

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
  const mapRef = useRef<unknown>(null);
  useLeafletCSS();

  // Stabilize patients reference to avoid unnecessary map rebuilds
  const stablePatients = useMemo(() => patients, [patients]);

  useEffect(() => {
    if (!mapContainer.current) return;

    let map: unknown;

    // Dynamic import to avoid SSR issues — Leaflet requires window/document
    import("leaflet").then((L) => {

      map = L.map(mapContainer.current!, {
        center: [10, 40],
        zoom: 2,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map as L.Map);

      L.control.zoom({ position: "topright" }).addTo(map as L.Map);

      stablePatients.forEach((patient) => {
        const risk = RISK_CONFIG[patient.riskLevel];
        if (!risk) return;

        const marker = L.circleMarker([patient.latitude, patient.longitude], {
          radius: 7,
          fillColor: risk.color,
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        }).addTo(map as L.Map);

        // Build popup with DOM API to prevent XSS from patient data
        const popupEl = document.createElement("div");
        popupEl.style.fontFamily = "system-ui";
        popupEl.style.padding = "4px 0";

        const nameEl = document.createElement("strong");
        nameEl.style.cssText = "font-size:14px;color:#0f172a;";
        nameEl.textContent = patient.name;
        popupEl.appendChild(nameEl);

        const phoneEl = document.createElement("div");
        phoneEl.style.cssText =
          "font-size:12px;color:#64748b;margin-top:2px;font-variant-numeric:tabular-nums;";
        phoneEl.textContent = maskPhone(patient.phone);
        popupEl.appendChild(phoneEl);

        const badgeRow = document.createElement("div");
        badgeRow.style.cssText =
          "margin-top:8px;display:flex;align-items:center;gap:6px;";
        const badge = document.createElement("span");
        badge.style.cssText = `display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;color:${risk.color};background:${risk.color}15;`;
        badge.textContent = patient.riskLevel;
        badgeRow.appendChild(badge);
        const scoreSpan = document.createElement("span");
        scoreSpan.style.cssText =
          "font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;";
        scoreSpan.textContent = `${(patient.depressionScore * 100).toFixed(0)}%`;
        badgeRow.appendChild(scoreSpan);
        popupEl.appendChild(badgeRow);

        const link = document.createElement("a");
        link.href = `/dashboard/patient/${patient.id}`;
        link.style.cssText =
          "display:block;margin-top:8px;font-size:12px;color:#0F766E;text-decoration:none;";
        link.textContent = "View details \u2192";
        popupEl.appendChild(link);

        marker.bindPopup(popupEl, {
          closeButton: false,
          maxWidth: 240,
          offset: [0, -4] as [number, number],
        });
      });

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, [stablePatients]);

  return (
    <div
      ref={mapContainer}
      role="region"
      aria-label="Patient location map"
      className="w-full h-[calc(100vh-12rem)] rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    />
  );
}
