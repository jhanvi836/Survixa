"use client";

import { useState } from "react";
import { IncidentRecord, RescueUnitRecord, IncidentStatus } from "@/types";
import { formatAgencyBadge } from "@/lib/utils";
import { X, Send, MessageSquare } from "lucide-react";

interface DispatchModalProps {
  incident: IncidentRecord;
  units: RescueUnitRecord[];
  onClose: () => void;
  onSuccess: () => void;
}

export function DispatchModal({ incident, units, onClose, onSuccess }: DispatchModalProps) {
  const [targetStatus, setTargetStatus] = useState<IncidentStatus>(
    incident.status === "RECEIVED" ? "VERIFIED" : incident.status === "VERIFIED" ? "ASSIGNED" : "EN_ROUTE"
  );
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>(
    incident.dispatches?.map((d) => d.rescueUnitId) || []
  );
  const [citizenMessage, setCitizenMessage] = useState(
    getDefaultCitizenMessage(incident.status, incident.category)
  );
  const [internalNotes, setInternalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getDefaultCitizenMessage(current: IncidentStatus, category: string): string {
    switch (current) {
      case "RECEIVED":
        return `Joint Command has verified your ${category.toLowerCase()} report. Dispatch units are being allocated.`;
      case "VERIFIED":
        return `Emergency units have been assigned to your coordinates and are preparing for transit.`;
      case "ASSIGNED":
        return `Responders are actively en route to your location. Estimated arrival within 5 minutes.`;
      case "EN_ROUTE":
        return `Field units have secured the scene and operations are underway.`;
      default:
        return `Status update from Emergency Joint Command.`;
    }
  }

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenMessage.trim()) {
      setError("Please provide a citizen-facing status message.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/incidents/${incident.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          message: citizenMessage,
          internalNotes,
          rescueUnitIds: selectedUnitIds,
          operatorId: "COMMANDER_DELTA_1",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update incident and dispatch units");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error during dispatch transmission");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                {incident.trackingCode}
              </span>
              <span className="text-xs text-slate-400 uppercase font-mono">
                {incident.category} &bull; Sev: {incident.severityScore}/10
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">Multi-Agency Dispatch & Feedback Desk</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Operational Incident Summary */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
          <div className="font-semibold text-slate-300">Normalized Operational Intel:</div>
          <p className="text-slate-400 leading-relaxed">
            {incident.translatedText || incident.rawContent}
          </p>
          <div className="text-[11px] text-cyan-400 font-mono">
            Location: {incident.locationName || `${incident.latitude}, ${incident.longitude}`}
          </div>
        </div>

        <form onSubmit={handleDispatch} className="space-y-5">
          {/* Transition Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              Advance Incident Status:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(["RECEIVED", "VERIFIED", "ASSIGNED", "EN_ROUTE", "RESOLVED"] as IncidentStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setTargetStatus(st);
                    setCitizenMessage(getDefaultCitizenMessage(st, incident.category));
                  }}
                  className={`py-2 px-2 text-center rounded-lg text-xs font-mono font-bold transition-all ${
                    targetStatus === st
                      ? "bg-rose-600 text-white shadow-md shadow-rose-950/60 ring-1 ring-white/20"
                      : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Multi-Agency Unit Allocation (Breaking Silos) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              Select Multi-Agency Rescue Units (Joint Task Force):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {units.map((unit) => {
                const isSelected = selectedUnitIds.includes(unit.id);
                const badge = formatAgencyBadge(unit.agencyType);

                return (
                  <div
                    key={unit.id}
                    onClick={() => toggleUnit(unit.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-all ${
                      isSelected
                        ? "bg-slate-800 border-cyan-500 ring-1 ring-cyan-500/30"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="font-mono font-bold text-white">{unit.callsign}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{unit.department}</div>
                    </div>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                        isSelected
                          ? "bg-cyan-500 border-cyan-400 text-white"
                          : "border-slate-700 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Citizen Feedback Message (Transmitted directly to Citizen Portal Loop) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                Citizen Transparency Feedback Loop Message:
              </label>
              <span className="text-[11px] text-cyan-400 font-mono">Streamed live to citizen</span>
            </div>
            <textarea
              rows={2}
              value={citizenMessage}
              onChange={(e) => setCitizenMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          {/* Internal Command Tactical Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Internal Cross-Agency Tactical Notes (Confidential):
            </label>
            <input
              type="text"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="e.g. Ingress via Sector 3. Route 102 closed due to fallen trees."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? "Broadcasting..." : "Broadcast Update & Dispatch Units"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
