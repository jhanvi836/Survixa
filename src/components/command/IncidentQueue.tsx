"use client";

import { IncidentRecord } from "@/types";
import { formatSeverityColor, formatAgencyBadge } from "@/lib/utils";
import { Copy, MapPin, ArrowUpRight, CheckCircle2 } from "lucide-react";

interface IncidentQueueProps {
  incidents: IncidentRecord[];
  selectedIncident: IncidentRecord | null;
  onSelectIncident: (incident: IncidentRecord) => void;
  onOpenDispatch: (incident: IncidentRecord) => void;
}

export function IncidentQueue({
  incidents,
  selectedIncident,
  onSelectIncident,
  onOpenDispatch,
}: IncidentQueueProps) {
  if (incidents.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-white">No Active Emergency Incidents</h4>
        <p className="text-xs text-slate-400 mt-1">Joint command operating normally.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-260px)] pr-1">
      {incidents.map((inc) => {
        const severity = formatSeverityColor(inc.severityScore ?? 5);
        const isSelected = selectedIncident?.id === inc.id;

        return (
          <div
            key={inc.id}
            onClick={() => onSelectIncident(inc)}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              isSelected
                ? "bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/40 shadow-lg"
                : "bg-slate-900/70 hover:bg-slate-900 border-slate-800"
            }`}
          >
            {/* Top row: Severity + Status + Duplicates */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {/* Severity Score 1-10 */}
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${severity.bg} ${severity.text} ${severity.border}`}
                >
                  SEV {inc.severityScore}/10
                </span>

                <span className="text-xs font-mono font-semibold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {inc.category}
                </span>

                {/* Duplicate Clustering Badge */}
                {(inc.duplicateCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Copy className="w-3 h-3" />
                    +{inc.duplicateCount} Duplicates
                  </span>
                )}
              </div>

              {/* Status Pill */}
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                  inc.status === "RESOLVED"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : inc.status === "EN_ROUTE"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : inc.status === "ASSIGNED"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {inc.status}
              </span>
            </div>

            {/* Translated operational description */}
            <p className="text-xs text-slate-200 line-clamp-2 font-medium mb-2 leading-relaxed">
              {inc.translatedText || inc.rawContent}
            </p>

            {/* Multilingual original tag if translated */}
            {inc.originalLanguage && inc.originalLanguage !== "en" && (
              <div className="text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 mb-2.5">
                <span className="text-slate-400 font-mono uppercase mr-1">
                  Original ({inc.originalLanguage}):
                </span>
                <span className="italic line-clamp-1">{inc.rawContent}</span>
              </div>
            )}

            {/* Location & Credibility metrics */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/60">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-400" />
                {inc.locationName || `${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}`}
              </span>
              <span>Credibility: {(((inc.credibilityScore ?? 0.85)) * 100).toFixed(0)}%</span>
            </div>

            {/* Action Bar */}
            <div className="mt-3 flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {inc.dispatches && inc.dispatches.length > 0 ? (
                  inc.dispatches.map((d, i) => {
                    const badge = formatAgencyBadge(d.rescueUnit?.agencyType || "FIRE");
                    return (
                      <span
                        key={i}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${badge.bg}`}
                      >
                        {d.rescueUnit?.callsign || "UNIT"}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[10px] text-amber-400 italic">No units assigned yet</span>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDispatch(inc);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors"
              >
                <span>Dispatch / Update</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
