"use client";

import { RescueUnitRecord } from "@/types";
import { formatAgencyBadge } from "@/lib/utils";
import { Radio, Navigation } from "lucide-react";

interface MultiAgencyUnitListProps {
  units: RescueUnitRecord[];
  selectedAgency: string;
}

export function MultiAgencyUnitList({ units, selectedAgency }: MultiAgencyUnitListProps) {
  const filteredUnits =
    selectedAgency === "ALL"
      ? units
      : units.filter((u) => u.agencyType === selectedAgency);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "DISPATCHED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse";
      case "ON_SCENE":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-260px)] pr-1">
      {filteredUnits.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
          No units registered under selected filter.
        </div>
      ) : (
        filteredUnits.map((unit) => {
          const badge = formatAgencyBadge(unit.agencyType);
          return (
            <div
              key={unit.id}
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="font-mono font-bold text-xs text-white">{unit.callsign}</span>
                </div>

                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getStatusColor(
                    unit.availability
                  )}`}
                >
                  {unit.availability}
                </span>
              </div>

              <div className="text-xs text-slate-400 mb-2">{unit.department}</div>

              {/* Capabilities */}
              {unit.capabilities && unit.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {unit.capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              )}

              {/* Live GPS Telemetry */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/60">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-cyan-400" />
                  {unit.latitude.toFixed(4)}, {unit.longitude.toFixed(4)}
                </span>
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400" />
                  {unit.contactChannel || "RADIO-CH1"}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
