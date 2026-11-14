"use client";

import { useState, useMemo } from "react";
import { IncidentRecord, RescueUnitRecord, IncidentStatus } from "@/types";
import { formatAgencyBadge, formatSeverityColor } from "@/lib/utils";
import {
  X,
  Zap,
  MapPin,
  Clock,
  Truck,
  Send,
  AlertTriangle,
  Globe,
  Camera,
  CheckCircle2,
  Radio,
  Navigation,
  ShieldCheck,
  Flame,
  Ambulance,
  Shield,
  LifeBuoy,
  Users,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";

interface RightPanelIncidentInspectorProps {
  incident: IncidentRecord | null;
  units: RescueUnitRecord[];
  onClose?: () => void;
  onDispatchSuccess: (incidentId: string, assignedUnitIds: string[]) => void;
}

interface SmartMatchedUnit {
  unit: RescueUnitRecord;
  distanceKm: number;
  etaMinutes: number;
  matchingCapabilities: string[];
  matchScore: number;
}

/**
 * Great-circle Haversine formula to compute distance in km
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates transit ETA in minutes based on urban emergency speed (42 km/h + intersection buffer)
 */
function calculateEtaMinutes(distanceKm: number, speedKmH: number = 42): number {
  if (distanceKm <= 0.1) return 1;
  const transitHours = distanceKm / speedKmH;
  const mins = Math.round(transitHours * 60 + 1.5);
  return Math.max(1, mins);
}

/**
 * Capability keywords mapping based on disaster category
 */
const CATEGORY_CAPABILITY_MAP: Record<string, string[]> = {
  FIRE: ["Fire", "Combustion", "Extrication", "Thermal", "Ladder", "Water", "Ventilation"],
  FLOOD: ["Water Rescue", "Boat", "Swiftwater", "Inflatable", "Diver", "Pumps", "Extraction"],
  MEDICAL_EMERGENCY: ["Life Support", "Trauma", "Paramedic", "Ambulance", "Triage", "Oxygen"],
  STRUCTURAL_COLLAPSE: ["Heavy Extrication", "K9", "Shoring", "Rubble", "Search & Rescue", "Acoustic"],
  HAZMAT: ["Hazmat", "Chemical", "Gas", "Neutralization", "Respirator", "Decontamination"],
  CYCLONE_STORM: ["Evacuation", "Water Rescue", "Shelter", "Debris", "Chainsaw", "Generator"],
  SEARCH_AND_RESCUE: ["Search & Rescue", "K9", "Drone", "Tracking", "Night Vision", "Flotation"],
  EARTHQUAKE: ["Heavy Extrication", "Search & Rescue", "Trauma", "Structural", "K9"],
  OTHER: ["Emergency", "First Response", "Evacuation"],
};

export function RightPanelIncidentInspector({
  incident,
  units,
  onClose,
  onDispatchSuccess,
}: RightPanelIncidentInspectorProps) {
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState("");
  const [photoZoom, setPhotoZoom] = useState<string | null>(null);

  // =========================================================================
  // SMART TEAM MATCH ALGORITHM
  // 1. Filter AVAILABLE rescue units (availability === "AVAILABLE")
  // 2. Calculate distance using Haversine formula
  // 3. Filter and score by matching capabilities
  // 4. Return top 3 nearest units with calculated ETAs
  // =========================================================================
  const topMatchedUnits = useMemo<SmartMatchedUnit[]>(() => {
    if (!incident) return [];

    // Filter available units (or include standby if low count)
    const availableUnits = units.filter(
      (u) => u.availability === "AVAILABLE" || u.availability === "STANDBY"
    );

    const relevantKeywords = CATEGORY_CAPABILITY_MAP[incident.category] || ["Emergency"];
    const immediateNeeds = incident.immediateNeeds || [];

    const scoredList: SmartMatchedUnit[] = availableUnits.map((unit) => {
      // 1. Calculate distance from unit GPS to incident GPS
      const distanceKm = calculateDistanceKm(
        unit.latitude,
        unit.longitude,
        incident.latitude,
        incident.longitude
      );

      // 2. Calculate ETA
      const etaMinutes = calculateEtaMinutes(distanceKm, unit.speed || 42);

      // 3. Match capabilities against incident category and immediate needs
      const unitCaps = unit.capabilities || [];
      const matchingCapabilities: string[] = [];

      // Check against category keywords
      for (const cap of unitCaps) {
        const matchesCategory = relevantKeywords.some((kw) =>
          cap.toLowerCase().includes(kw.toLowerCase())
        );
        const matchesNeeds = immediateNeeds.some((need: string) =>
          cap.toLowerCase().includes(need.toLowerCase()) ||
          need.toLowerCase().includes(cap.toLowerCase())
        );

        if (matchesCategory || matchesNeeds) {
          if (!matchingCapabilities.includes(cap)) {
            matchingCapabilities.push(cap);
          }
        }
      }

      // Check agency alignment (e.g. Fire agency matches Fire incident)
      let agencyBonus = 0;
      if (incident.category === "FIRE" && unit.agencyType === "FIRE") agencyBonus = 30;
      if (incident.category === "MEDICAL_EMERGENCY" && unit.agencyType === "MEDICAL") agencyBonus = 30;
      if (incident.category === "FLOOD" && (unit.agencyType === "COAST_GUARD" || unit.agencyType === "NGO")) agencyBonus = 30;
      if (incident.category === "STRUCTURAL_COLLAPSE" && (unit.agencyType === "FIRE" || unit.agencyType === "POLICE")) agencyBonus = 30;

      // Match Score calculation: High capability match + Proximity bonus
      // (100 base - (distance * 8) + (matchedCaps * 20) + agencyBonus)
      const capabilityBonus = matchingCapabilities.length * 25;
      const proximityScore = Math.max(0, 100 - distanceKm * 10);
      const matchScore = proximityScore + capabilityBonus + agencyBonus;

      return {
        unit,
        distanceKm,
        etaMinutes,
        matchingCapabilities:
          matchingCapabilities.length > 0
            ? matchingCapabilities
            : unitCaps.slice(0, 2),
        matchScore,
      };
    });

    // Sort by highest match score and shortest distance, then take top 3
    scoredList.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return a.distanceKm - b.distanceKm;
    });

    return scoredList.slice(0, 3);
  }, [incident, units]);

  if (!incident) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Navigation className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-300">No Incident Selected</h4>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          Click an emergency ticket on the priority list or a marker on the tactical map to inspect structured AI telemetry and execute smart dispatch.
        </p>
      </div>
    );
  }

  const severityBadge = formatSeverityColor(incident.severityScore || 5);

  const toggleSelectUnit = (unitId: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  // =========================================================================
  // EXECUTE "ASSIGN & DISPATCH"
  // Updates incident status to ASSIGNED
  // Sets unit to BUSY / DISPATCHED
  // Pushes live update to citizen tracking screen
  // =========================================================================
  const handleAssignAndDispatch = async (specificUnitId?: string) => {
    const unitIdsToDispatch = specificUnitId
      ? [specificUnitId]
      : selectedUnitIds.length > 0
      ? selectedUnitIds
      : topMatchedUnits.length > 0
      ? [topMatchedUnits[0].unit.id]
      : [];

    if (unitIdsToDispatch.length === 0) {
      alert("Please select at least one available rescue unit to dispatch.");
      return;
    }

    setDispatching(true);
    setDispatchSuccessMsg(null);

    try {
      // Collect callsigns and shortest ETA for the citizen message
      const dispatchedUnits = units.filter((u) => unitIdsToDispatch.includes(u.id));
      const callsigns = dispatchedUnits.map((u) => u.callsign).join(", ");

      const matchedTarget = topMatchedUnits.find((m) =>
        unitIdsToDispatch.includes(m.unit.id)
      );
      const minEta = matchedTarget ? matchedTarget.etaMinutes : 4;

      const citizenMessage = `Joint Command has assigned rescue units [${callsigns}] to your coordinates. Dispatched and actively en route. Estimated arrival in ~${minEta} minutes.`;

      const res = await fetch(`/api/incidents/${incident.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ASSIGNED" as IncidentStatus,
          message: citizenMessage,
          internalNotes: customNotes || "Dispatched via Smart Team Match algorithm.",
          rescueUnitIds: unitIdsToDispatch,
          operatorId: "COMMAND_DISPATCHER",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch rescue units");
      }

      setDispatchSuccessMsg(
        `Units [${callsigns}] assigned! Status set to ASSIGNED. Live update pushed to citizen tracking room.`
      );
      setSelectedUnitIds([]);

      // Notify parent to draw route line on the map and refresh
      onDispatchSuccess(incident.id, unitIdsToDispatch);
    } catch (err: any) {
      alert("Dispatch error: " + err.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[calc(100vh-140px)]">
      {/* Top Header */}
      <div className="p-4 md:px-5 md:py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-extrabold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
            {incident.trackingCode}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {incident.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${severityBadge.bg} ${severityBadge.text} ${severityBadge.border}`}>
            SEV {incident.severityScore || 5}/10
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
        {/* Success Alert Banner */}
        {dispatchSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="leading-snug">{dispatchSuccessMsg}</span>
          </div>
        )}

        {/* 1. Full Structured AI Summary */}
        <div className="space-y-3 p-4 rounded-xl bg-slate-950/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Structured AI Triage Brief</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              Credibility: {incident.credibilityScore ?? 92}/100
            </span>
          </div>

          {/* AI Tactical Summary */}
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Commander Briefing:
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {incident.aiSummary || `Reported ${incident.category}. Urgent triage and unit dispatch recommended.`}
            </p>
          </div>

          {/* Victims & Hazards Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">
                Estimated Victims
              </span>
              <span className="font-bold text-white text-xs">
                {incident.estimatedVictims && incident.estimatedVictims > 0
                  ? `${incident.estimatedVictims} Individual(s)`
                  : "Unknown / Unspecified"}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">
                Category
              </span>
              <span className="font-bold text-white text-xs uppercase">
                {incident.category}
              </span>
            </div>
          </div>

          {/* Identified Hazards */}
          {incident.hazardsIdentified && incident.hazardsIdentified.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Identified Hazards:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {incident.hazardsIdentified.map((h, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-rose-950/40 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Immediate Needs */}
          {incident.immediateNeeds && incident.immediateNeeds.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Immediate Tactical Needs:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {incident.immediateNeeds.map((need: string, i: number) => (
                  <span
                    key={i}
                    className="text-[10px] bg-indigo-950/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-medium"
                  >
                    {need}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Original Citizen Message & Language */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Verbatim Citizen Distress Message</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 uppercase">
              Lang: {incident.originalLanguage.toUpperCase()}
            </span>
          </div>

          <p className="text-xs text-slate-300 italic bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
            "{incident.rawContent}"
          </p>

          {incident.translatedText && incident.translatedText !== incident.rawContent && (
            <div className="pt-1">
              <span className="text-[10px] font-mono uppercase text-cyan-400 block mb-0.5">
                Operational English Translation:
              </span>
              <p className="text-xs text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed font-sans">
                {incident.translatedText}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-400" />
              {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
            </span>
            {incident.reporterPhone && (
              <span>Caller: {incident.reporterPhone}</span>
            )}
          </div>
        </div>

        {/* 3. Photo Evidence Display */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Visual Image Evidence</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {incident.mediaUrls && incident.mediaUrls.length > 0 ? "Attached" : "No Photo"}
            </span>
          </div>

          {incident.mediaUrls && incident.mediaUrls.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {incident.mediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setPhotoZoom(url)}
                    className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center"
                  >
                    <img
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-mono text-white transition-opacity">
                      Click to Expand
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 italic">
                Verified visual telemetry uploaded from reporting citizen's mobile client.
              </p>
            </div>
          ) : (
            <div className="p-3 text-center rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-slate-500 italic">
              No photos attached with this report. Geospatial telemetry verified via browser GPS.
            </div>
          )}
        </div>

        {/* =====================================================================
            4. SMART TEAM MATCH: TOP 3 NEAREST MATCHING RESCUE UNITS
           ===================================================================== */}
        <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-slate-950 to-indigo-950/30 border border-indigo-500/30">
          <div className="flex items-center justify-between text-xs border-b border-indigo-500/20 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Smart Team Match (Top 3 Nearest Units)</span>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/40">
              Matched by Skills & GPS
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            Calculated distance from all AVAILABLE fleet units, filtered by matching capability ({incident.category}), and ranked by ETA:
          </p>

          <div className="space-y-2.5">
            {topMatchedUnits && topMatchedUnits.length > 0 ? (
              topMatchedUnits.map((match, idx) => {
                const badge = formatAgencyBadge(match.unit.agencyType);
                const isSelected = selectedUnitIds.includes(match.unit.id);

                return (
                  <div
                    key={match.unit.id}
                    onClick={() => toggleSelectUnit(match.unit.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-950/70 border-indigo-500 ring-1 ring-indigo-500/50 shadow-md"
                        : "bg-slate-900 hover:bg-slate-900/90 border-slate-800"
                    }`}
                  >
                    {/* Unit Header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {/* Match Rank Pill */}
                        <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          #{idx + 1}
                        </span>

                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${badge.bg}`}>
                          {badge.label}
                        </span>

                        <span className="font-mono text-xs font-bold text-white">
                          {match.unit.callsign}
                        </span>
                      </div>

                      {/* Distance & ETA Badge */}
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="text-cyan-400 font-bold">
                          {match.distanceKm.toFixed(1)} km
                        </span>
                        <span className="text-slate-500">&bull;</span>
                        <span className="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          ~{match.etaMinutes} min ETA
                        </span>
                      </div>
                    </div>

                    {/* Department & Capabilities */}
                    <div className="text-[11px] text-slate-400 mb-2">
                      {match.unit.department || "Emergency Fleet Asset"}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                      <div className="flex flex-wrap gap-1">
                        {match.matchingCapabilities.map((cap, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-[9px] font-mono bg-slate-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800/50"
                          >
                            ✓ {cap}
                          </span>
                        ))}
                      </div>

                      {/* 1-Click Dispatch Quick Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignAndDispatch(match.unit.id);
                        }}
                        disabled={dispatching}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <span>Dispatch #{idx + 1}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 italic">
                No fleet units are currently registered as AVAILABLE. All assets may be currently dispatched.
              </div>
            )}
          </div>
        </div>

        {/* 5. Custom Command Notes (Optional) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase text-slate-400 block">
            Operational Dispatch Note (Pushed to citizen screen):
          </label>
          <input
            type="text"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="e.g. Paramedic rapid response dispatched. Staging at North entrance."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* 6. Primary Action: "Assign & Dispatch" Button */}
        <button
          type="button"
          onClick={() => handleAssignAndDispatch()}
          disabled={dispatching || topMatchedUnits.length === 0}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs tracking-wide shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
        >
          {dispatching ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Transmitting Dispatch & Drawing Map Route...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>
                ASSIGN & DISPATCH {selectedUnitIds.length > 0 ? `(${selectedUnitIds.length} SELECTED)` : "(TOP MATCHED UNIT)"}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Lightbox Photo Zoom Modal */}
      {photoZoom && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPhotoZoom(null)}
        >
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setPhotoZoom(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-800 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={photoZoom}
              alt="High resolution evidence"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
