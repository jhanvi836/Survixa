"use client";

import { useMemo } from "react";
import { IncidentRecord, RescueUnitRecord } from "@/types";
import { formatAgencyBadge } from "@/lib/utils";
import { Compass, Flame, HeartPulse, Shield, Users, Navigation } from "lucide-react";

interface LiveIncidentMapProps {
  incidents: IncidentRecord[];
  units: RescueUnitRecord[];
  selectedIncident: IncidentRecord | null;
  onSelectIncident: (inc: IncidentRecord) => void;
  activeDispatchedUnitIds?: string[];
}

export function LiveIncidentMap({
  incidents,
  units,
  selectedIncident,
  onSelectIncident,
  activeDispatchedUnitIds = [],
}: LiveIncidentMapProps) {
  // Center coordinates calculation or fixed baseline around active operations
  const baseLat = 37.7749;
  const baseLng = -122.4194;
  const spreadFactor = 2800; // scaling GPS coordinates to visual canvas percentages

  // Compute active route lines connecting dispatched units to incidents
  const routeLines = useMemo(() => {
    const lines: Array<{
      id: string;
      unitX: number;
      unitY: number;
      incX: number;
      incY: number;
      callsign: string;
      trackingCode: string;
    }> = [];

    for (const inc of incidents) {
      const incX = Math.min(92, Math.max(8, 50 + (inc.longitude - baseLng) * spreadFactor));
      const incY = Math.min(92, Math.max(8, 50 - (inc.latitude - baseLat) * spreadFactor));

      // Find units dispatched to this incident
      const dispatchedUnitIds = new Set<string>();

      if (inc.dispatches && inc.dispatches.length > 0) {
        for (const d of inc.dispatches) {
          dispatchedUnitIds.add(d.rescueUnitId);
        }
      }

      // Also check activeDispatchedUnitIds if this incident is selected
      if (selectedIncident?.id === inc.id && activeDispatchedUnitIds.length > 0) {
        for (const uid of activeDispatchedUnitIds) {
          dispatchedUnitIds.add(uid);
        }
      }

      for (const unitId of dispatchedUnitIds) {
        const unit = units.find((u) => u.id === unitId || u.callsign === unitId);
        if (unit) {
          const unitX = Math.min(92, Math.max(8, 50 + (unit.longitude - baseLng) * spreadFactor));
          const unitY = Math.min(92, Math.max(8, 50 - (unit.latitude - baseLat) * spreadFactor));

          lines.push({
            id: `${unit.id}-${inc.id}`,
            unitX,
            unitY,
            incX,
            incY,
            callsign: unit.callsign,
            trackingCode: inc.trackingCode,
          });
        }
      }
    }

    return lines;
  }, [incidents, units, selectedIncident, activeDispatchedUnitIds]);

  return (
    <div className="relative w-full h-[580px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between p-4">
      {/* Tactical Grid Background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #334155 1px, transparent 1px),
            linear-gradient(to bottom, #334155 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Radar Overlay Scan Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Top Map HUD Controls */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
          <Compass className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: "12s" }} />
          <span className="text-slate-300">SECTOR GRID ALPHA-1</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400 font-semibold">{incidents.length} Incidents</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400 font-semibold">{units.length} Units Active</span>
          {routeLines.length > 0 && (
            <>
              <span className="text-slate-500">|</span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Navigation className="w-3 h-3 text-amber-400 animate-pulse" />
                {routeLines.length} Dispatched Route(s)
              </span>
            </>
          )}
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-orange-400">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> Fire
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Medical
          </span>
          <span className="flex items-center gap-1 text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Police
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> NGO
          </span>
        </div>
      </div>

      {/* Map Surface Rendering Active Incidents & Units */}
      <div className="relative flex-1 w-full h-full my-2">
        {/* =========================================================================
            SVG ROUTE LINES: CONNECTING DISPATCHED RESCUE UNITS TO INCIDENTS
           ========================================================================= */}
        {routeLines.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            {routeLines.map((r) => (
              <g key={r.id}>
                {/* Outer Glow Line */}
                <line
                  x1={`${r.unitX}%`}
                  y1={`${r.unitY}%`}
                  x2={`${r.incX}%`}
                  y2={`${r.incY}%`}
                  stroke="#06b6d4"
                  strokeWidth="5"
                  strokeOpacity="0.25"
                />
                {/* Active Animated Dashed Transit Route */}
                <line
                  x1={`${r.unitX}%`}
                  y1={`${r.unitY}%`}
                  x2={`${r.incX}%`}
                  y2={`${r.incY}%`}
                  stroke="url(#routeGradient)"
                  strokeWidth="2.5"
                  strokeDasharray="6,4"
                  className="animate-pulse"
                />
                {/* Midpoint Route Pulse Beacon */}
                <circle
                  cx={`${(r.unitX + r.incX) / 2}%`}
                  cy={`${(r.unitY + r.incY) / 2}%`}
                  r="4"
                  fill="#06b6d4"
                  className="animate-ping"
                />
              </g>
            ))}
          </svg>
        )}

        {/* Render Incidents */}
        {incidents.map((inc) => {
          const x = Math.min(92, Math.max(8, 50 + (inc.longitude - baseLng) * spreadFactor));
          const y = Math.min(92, Math.max(8, 50 - (inc.latitude - baseLat) * spreadFactor));
          const isSelected = selectedIncident?.id === inc.id;
          const isCritical = (inc.severityScore ?? 5) >= 8;

          return (
            <div
              key={inc.id}
              onClick={() => onSelectIncident(inc)}
              style={{ left: `${x}%`, top: `${y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-300 group z-20 ${
                isSelected ? "scale-125 z-30 ring-4 ring-cyan-400/50 rounded-full" : "hover:scale-110"
              }`}
            >
              {/* Radar pulse for critical incidents */}
              {isCritical && (
                <div className="absolute inset-0 w-8 h-8 -left-2 -top-2 rounded-full bg-rose-500/30 radar-beacon pointer-events-none" />
              )}

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 ${
                  isCritical
                    ? "bg-rose-600 border-white text-white"
                    : "bg-amber-600 border-white/80 text-white"
                }`}
              >
                <span className="text-[10px] font-bold font-mono">{inc.severityScore ?? 5}</span>
              </div>

              {/* Tooltip on hover */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block bg-slate-900 border border-slate-700 text-white text-[11px] font-mono px-2.5 py-1 rounded-md whitespace-nowrap shadow-xl pointer-events-none z-40">
                <div>[{inc.category}] Sev: {inc.severityScore ?? 5}/10</div>
                <div className="text-[10px] text-slate-400">{inc.trackingCode} &bull; Click to Inspect</div>
              </div>
            </div>
          );
        })}

        {/* Render Multi-Agency Units */}
        {units.map((unit) => {
          const x = Math.min(92, Math.max(8, 50 + (unit.longitude - baseLng) * spreadFactor));
          const y = Math.min(92, Math.max(8, 50 - (unit.latitude - baseLat) * spreadFactor));
          const badge = formatAgencyBadge(unit.agencyType);
          const isBusy = unit.availability === "DISPATCHED" || unit.availability === "ON_SCENE";

          return (
            <div
              key={unit.id}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500 group z-10 cursor-pointer"
            >
              <div
                className={`p-1.5 rounded-lg shadow-lg border border-white/20 flex items-center gap-1 ${badge.bg} ${
                  isBusy ? "ring-2 ring-amber-400 animate-pulse" : ""
                }`}
              >
                {unit.agencyType === "FIRE" && <Flame className="w-3.5 h-3.5" />}
                {unit.agencyType === "MEDICAL" && <HeartPulse className="w-3.5 h-3.5" />}
                {unit.agencyType === "POLICE" && <Shield className="w-3.5 h-3.5" />}
                {unit.agencyType === "NGO" && <Users className="w-3.5 h-3.5" />}
                <span className="text-[9px] font-mono font-bold">{unit.callsign}</span>
              </div>

              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 hidden group-hover:block bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded-md whitespace-nowrap shadow-xl pointer-events-none z-40">
                <div>{unit.callsign} ({unit.availability})</div>
                <div className="text-slate-400 text-[9px]">{unit.department}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Selected Incident Quick Bar */}
      {selectedIncident && (
        <div className="relative z-10 p-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-rose-400">{selectedIncident.trackingCode}</span>
            <span className="text-slate-300 font-medium truncate max-w-md">
              {selectedIncident.translatedText || selectedIncident.rawContent}
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400">
            GPS: {selectedIncident.latitude.toFixed(4)}, {selectedIncident.longitude.toFixed(4)}
          </span>
        </div>
      )}
    </div>
  );
}
