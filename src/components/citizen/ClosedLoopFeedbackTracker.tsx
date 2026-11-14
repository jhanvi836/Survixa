"use client";

import { useEffect, useState, useMemo } from "react";
import { getSocketClient } from "@/lib/socket-client";
import { IncidentRecord, StatusUpdateLogRecord, IncidentStatus } from "@/types";
import {
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Navigation,
  HeartHandshake,
  Activity,
  Flame,
  Ambulance,
  Shield,
  LifeBuoy,
} from "lucide-react";
import { formatAgencyBadge, formatSeverityColor } from "@/lib/utils";

interface ClosedLoopFeedbackTrackerProps {
  initialIncident: IncidentRecord;
}

interface StageStep {
  key: IncidentStatus;
  label: string;
  shortDesc: string;
  detail: string;
}

const LIFECYCLE_STAGES: StageStep[] = [
  {
    key: "RECEIVED",
    label: "Report Received",
    shortDesc: "Ingested & Translated",
    detail: "Distress report received and processed through Survixa multilingual ingestion pipeline.",
  },
  {
    key: "VERIFIED",
    label: "AI Verified & Prioritized",
    shortDesc: "Triage & Urgency Ranked",
    detail: "AI verified incident legitimacy, filtered noise, and prioritized life-threat severity.",
  },
  {
    key: "ASSIGNED",
    label: "Rescue Team Assigned",
    shortDesc: "Cross-Agency Matched",
    detail: "Joint Command Center designated multi-agency rescue units breaking institutional silos.",
  },
  {
    key: "EN_ROUTE",
    label: "Help En Route",
    shortDesc: "Active GPS Transit",
    detail: "Assigned field units are actively navigating to your GPS coordinates with real-time tracking.",
  },
  {
    key: "RESOLVED",
    label: "Resolved",
    shortDesc: "Scene Stabilized",
    detail: "Emergency responders have reached the scene, stabilized hazards, and completed primary extraction.",
  },
];

/**
 * Great-circle Haversine formula to compute distance in km
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
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
 * Calculates Estimated Time of Arrival (ETA) in minutes
 */
function calculateEtaMinutes(distanceKm: number, speedKmH: number = 42): number {
  if (distanceKm <= 0.1) return 1;
  const transitHours = distanceKm / speedKmH;
  // +1.5 mins buffer for urban intersection slowdowns
  const mins = Math.round(transitHours * 60 + 1.5);
  return Math.max(1, mins);
}

export function ClosedLoopFeedbackTracker({ initialIncident }: ClosedLoopFeedbackTrackerProps) {
  const [incident, setIncident] = useState<IncidentRecord>(initialIncident);
  const [logs, setLogs] = useState<StatusUpdateLogRecord[]>(initialIncident.statusLogs || []);
  const [assignedUnits, setAssignedUnits] = useState<any[]>(
    initialIncident.dispatches?.map((d) => d.rescueUnit).filter(Boolean) || []
  );
  const [liveConnected, setLiveConnected] = useState(false);

  // Closed loop citizen safe confirmation state
  const isAlreadySafe = logs.some(
    (l) =>
      l.operatorId === "CITIZEN_CONFIRMED" ||
      l.message?.toLowerCase().includes("citizen confirmed safe") ||
      l.message?.toLowerCase().includes("i am safe")
  );
  const [citizenConfirmedSafe, setCitizenConfirmedSafe] = useState(isAlreadySafe);
  const [confirmingSafe, setConfirmingSafe] = useState(false);
  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState<string | null>(
    isAlreadySafe ? "Feedback loop closed: You previously confirmed safety." : null
  );

  // Real-time Socket.io Room Subscription
  useEffect(() => {
    const socket = getSocketClient();

    const incidentRoom = `incident_${incident.id}`;
    const trackingRoom = incident.trackingCode ? `incident_${incident.trackingCode}` : null;

    // Join room
    socket.emit("join:incident", incident.id);
    if (incident.trackingCode) {
      socket.emit("join:citizen_tracker", incident.trackingCode);
    }
    setLiveConnected(socket.connected);

    socket.on("connect", () => {
      setLiveConnected(true);
      socket.emit("join:incident", incident.id);
      if (incident.trackingCode) {
        socket.emit("join:citizen_tracker", incident.trackingCode);
      }
    });

    socket.on("disconnect", () => {
      setLiveConnected(false);
    });

    // Handle live status changes from dispatchers and responders
    const handleStatusStream = (payload: any) => {
      if (
        payload.incidentId === incident.id ||
        (payload.trackingCode && payload.trackingCode === incident.trackingCode)
      ) {
        console.log("⚡ [Closed Loop Tracker] Status change received:", payload.status);

        setIncident((prev) => ({
          ...prev,
          status: payload.status,
          updatedAt: new Date(),
          resolvedAt: payload.status === "RESOLVED" ? new Date() : prev.resolvedAt,
        }));

        if (payload.updateLog) {
          setLogs((prev) => {
            const exists = prev.some((l) => l.id === payload.updateLog.id);
            if (exists) return prev;
            return [...prev, payload.updateLog];
          });
        }

        if (payload.assignedUnits && Array.isArray(payload.assignedUnits)) {
          setAssignedUnits(payload.assignedUnits);
        }
      }
    };

    // Handle live responder GPS telemetry updates for dynamic ETA recalculation
    const handleUnitGpsUpdated = (gpsPayload: {
      unitId: string;
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
    }) => {
      setAssignedUnits((prev) =>
        prev.map((unit) => {
          if (unit.id === gpsPayload.unitId || unit.callsign === gpsPayload.unitId) {
            return {
              ...unit,
              latitude: gpsPayload.latitude,
              longitude: gpsPayload.longitude,
              speed: gpsPayload.speed ?? unit.speed,
              heading: gpsPayload.heading ?? unit.heading,
              lastGpsUpdate: new Date(),
            };
          }
          return unit;
        })
      );
    };

    // Handle citizen safe confirmation broadcast
    const handleCitizenConfirmedSafe = (payload: any) => {
      if (
        payload.incidentId === incident.id ||
        (payload.trackingCode && payload.trackingCode === incident.trackingCode)
      ) {
        setCitizenConfirmedSafe(true);
        setConfirmSuccessMsg("Citizen safety verified! The distress loop has been successfully closed.");
      }
    };

    socket.on("status_change", handleStatusStream);
    socket.on("citizen:status_stream", handleStatusStream);
    socket.on("incident:status_changed", handleStatusStream);
    socket.on("unit:gps_updated", handleUnitGpsUpdated);
    socket.on("citizen:confirmed_safe" as any, handleCitizenConfirmedSafe);

    return () => {
      socket.emit("leave:incident", incident.id);
      if (incident.trackingCode) {
        socket.emit("leave:citizen_tracker", incident.trackingCode);
      }
      socket.off("status_change", handleStatusStream);
      socket.off("citizen:status_stream", handleStatusStream);
      socket.off("incident:status_changed", handleStatusStream);
      socket.off("unit:gps_updated", handleUnitGpsUpdated);
      socket.off("citizen:confirmed_safe" as any, handleCitizenConfirmedSafe);
    };
  }, [incident.id, incident.trackingCode]);

  // Handle "Confirm I Am Safe" Action
  const handleConfirmIAmSafe = async () => {
    if (confirmingSafe || citizenConfirmedSafe) return;
    setConfirmingSafe(true);

    try {
      const res = await fetch(`/api/incidents/${incident.id}/confirm-safe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to confirm safety");
      }

      setCitizenConfirmedSafe(true);
      setConfirmSuccessMsg("Loop Closed: You are confirmed safe. Thank you for closing the loop!");

      if (data.statusLog) {
        setLogs((prev) => [...prev, data.statusLog]);
      }
    } catch (err: any) {
      alert("Error confirming safety: " + err.message);
    } finally {
      setConfirmingSafe(false);
    }
  };

  // Lifecycle stage index (0 to 4)
  const currentStepIndex = useMemo(() => {
    const idx = LIFECYCLE_STAGES.findIndex((s) => s.key === incident.status);
    return idx >= 0 ? idx : 0;
  }, [incident.status]);

  const severityBadge = formatSeverityColor(incident.severityScore || 5);

  return (
    <div className="space-y-6">
      {/* Top Telemetry & Status Room Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow based on status */}
        <div
          className={`absolute -right-24 -top-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000 ${
            incident.status === "RESOLVED"
              ? "bg-emerald-500"
              : incident.status === "EN_ROUTE"
              ? "bg-cyan-500"
              : "bg-rose-500"
          }`}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-md border border-rose-500/30 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                TRACKING ID: {incident.trackingCode}
              </span>
              <span className="text-xs text-slate-300 bg-slate-800/90 px-3 py-1 rounded-md border border-slate-700/60 font-mono">
                ROOM: incident_{incident.id.substring(0, 8)}...
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded border ${severityBadge.bg} ${severityBadge.text} ${severityBadge.border}`}>
                Urgency: {incident.severityScore || 5}/10
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Closed-Loop Citizen Distress Tracker
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Live bi-directional connection between you and Joint Emergency Command. Responders see your live GPS, and you receive real-time dispatch telemetry until safety is secured.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium border transition-colors ${
                liveConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  liveConnected ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                }`}
              />
              {liveConnected ? "Live Socket Stream Active" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* 5-Step Visual Progress Bar */}
        <div className="py-8">
          <div className="relative">
            {/* Background connecting bar (Desktop) */}
            <div className="absolute top-5 left-8 right-8 h-1.5 bg-slate-800 -translate-y-1/2 z-0 hidden sm:block rounded-full" />
            
            {/* Dynamic Fill connecting bar (Desktop) */}
            <div
              className={`absolute top-5 left-8 h-1.5 -translate-y-1/2 z-0 transition-all duration-700 hidden sm:block rounded-full ${
                incident.status === "RESOLVED"
                  ? "bg-emerald-500 shadow-lg shadow-emerald-500/50"
                  : "bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500"
              }`}
              style={{
                width: `${Math.max(0, (currentStepIndex / (LIFECYCLE_STAGES.length - 1)) * 92)}%`,
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
              {LIFECYCLE_STAGES.map((stage, idx) => {
                const isPassed = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isUpcoming = idx > currentStepIndex;

                return (
                  <div
                    key={stage.key}
                    className="flex flex-row sm:flex-col items-start sm:items-center sm:text-center gap-3 sm:gap-2 group"
                  >
                    {/* Node Circle */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 flex-shrink-0 ${
                        isCurrent
                          ? stage.key === "RESOLVED"
                            ? "bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/30 scale-110 shadow-lg shadow-emerald-950/80"
                            : "bg-rose-600 text-white ring-4 ring-rose-500/30 scale-110 shadow-lg shadow-rose-950/80 animate-pulse"
                          : isPassed
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-800/90 text-slate-500 border border-slate-700/80"
                      }`}
                    >
                      {isPassed || (isCurrent && stage.key === "RESOLVED") ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 sm:justify-center">
                        <h4
                          className={`text-xs font-bold uppercase tracking-wider ${
                            isCurrent
                              ? stage.key === "RESOLVED"
                                ? "text-emerald-400 font-extrabold"
                                : "text-rose-400 font-extrabold"
                              : isPassed
                              ? "text-emerald-400"
                              : "text-slate-400"
                          }`}
                        >
                          {stage.label}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {stage.shortDesc}
                      </p>
                      <p className="text-[10px] text-slate-500 hidden sm:block mt-1 leading-snug line-clamp-2">
                        {stage.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* =========================================================================
            PROMINENT "CONFIRM I AM SAFE" BUTTON (WHEN RESOLVED)
            Closes the loop for the citizen
           ========================================================================= */}
        {incident.status === "RESOLVED" && (
          <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border-2 border-emerald-500/40 shadow-xl transition-all">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 font-bold text-sm tracking-wide uppercase">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Responders Marked Scene Resolved</span>
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Are you safe and accounted for?
                </h3>
                <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
                  First responders have stabilized the hazard area. To close the distress loop and allow commanders to re-allocate assets, please confirm your safety below.
                </p>
              </div>

              <div className="w-full md:w-auto flex flex-col items-center gap-2">
                {!citizenConfirmedSafe ? (
                  <button
                    onClick={handleConfirmIAmSafe}
                    disabled={confirmingSafe}
                    className="w-full md:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                  >
                    {confirmingSafe ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying Safety with Command...</span>
                      </>
                    ) : (
                      <>
                        <HeartHandshake className="w-5 h-5 text-emerald-200" />
                        <span>CONFIRM I AM SAFE & CLOSE LOOP</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full md:w-auto px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Loop Closed: Safety Confirmed & Logged</span>
                  </div>
                )}
              </div>
            </div>

            {confirmSuccessMsg && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{confirmSuccessMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dispatched Field Units & Real-Time ETA Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-rose-500" />
              <span>Assigned Multi-Agency Rescue Units & Live ETA</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Breaking agency silos: Interoperable Fire, Medical, Police, and NGO rescue assets.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-1 rounded-md self-start sm:self-auto">
            {assignedUnits.length} Unit(s) Dispatched
          </span>
        </div>

        {assignedUnits && assignedUnits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {assignedUnits.map((unit, idx) => {
              const badge = formatAgencyBadge(unit.agencyType);
              
              // Calculate real-time ETA and distance
              let distanceKm: number | null = null;
              let etaMinutes: number | null = null;

              if (
                unit.latitude &&
                unit.longitude &&
                incident.latitude &&
                incident.longitude
              ) {
                distanceKm = calculateDistanceKm(
                  unit.latitude,
                  unit.longitude,
                  incident.latitude,
                  incident.longitude
                );
                etaMinutes = calculateEtaMinutes(distanceKm, unit.speed || 40);
              }

              // Determine Agency Icon
              const renderAgencyIcon = () => {
                switch (unit.agencyType) {
                  case "FIRE":
                    return <Flame className="w-5 h-5 text-orange-400" />;
                  case "MEDICAL":
                    return <Ambulance className="w-5 h-5 text-emerald-400" />;
                  case "POLICE":
                    return <Shield className="w-5 h-5 text-blue-400" />;
                  case "NGO":
                    return <LifeBuoy className="w-5 h-5 text-purple-400" />;
                  default:
                    return <Activity className="w-5 h-5 text-slate-400" />;
                }
              };

              return (
                <div
                  key={unit.id || idx}
                  className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4 relative overflow-hidden"
                >
                  {/* Unit Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                        {renderAgencyIcon()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-white">
                            {unit.callsign}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {unit.id ? unit.id.substring(0, 8) : "ASSET"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {unit.department || "Specialized Emergency Asset"}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* ETA & Transit Telemetry Banner */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                        <Navigation className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        Estimated Arrival Time (ETA):
                      </span>
                      <span className="font-mono font-bold text-cyan-300">
                        {incident.status === "RESOLVED"
                          ? "On Scene / Secured"
                          : incident.status === "EN_ROUTE"
                          ? etaMinutes !== null
                            ? `~${etaMinutes} mins (${distanceKm?.toFixed(1)} km away)`
                            : "En Route (~4-6 mins)"
                          : "Dispatching (~5-8 mins)"}
                      </span>
                    </div>

                    {/* Animated Transit Meter for En Route */}
                    {incident.status === "EN_ROUTE" && (
                      <div className="space-y-1">
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 h-1.5 rounded-full w-3/4 animate-pulse" />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>Departed Depot</span>
                          <span className="text-cyan-400">Live GPS Ping Active</span>
                          <span>Your Location</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Capabilities & Comms Channel */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-900">
                    <div className="flex flex-wrap gap-1">
                      {unit.capabilities && unit.capabilities.length > 0 ? (
                        unit.capabilities.slice(0, 3).map((cap: string, cIdx: number) => (
                          <span
                            key={cIdx}
                            className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800"
                          >
                            {cap}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500">General First Response</span>
                      )}
                    </div>
                    {unit.contactChannel && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Ch: {unit.contactChannel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center space-y-3 mt-4 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <h4 className="text-sm font-bold text-slate-300">
              Allocating Closest Multi-Agency Responders...
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Joint Dispatchers in the Command Center are reviewing your AI priority score ({incident.severityScore || 5}/10) to assign the nearest Fire, Medical, or Police units. Dispatched assets will appear here immediately without refreshing.
            </p>
          </div>
        )}
      </div>

      {/* Incident Summary & AI Triage Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Citizen Report & Translation */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              Emergency Incident Overview
            </h3>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Input Language: {incident.originalLanguage.toUpperCase()}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Citizen Submitted Report:
              </span>
              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80 italic leading-relaxed">
                "{incident.rawContent}"
              </p>
            </div>

            {incident.translatedText && incident.translatedText !== incident.rawContent && (
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider text-cyan-400 block mb-1">
                  AI Operational Translation (English Dispatch Brief):
                </span>
                <p className="text-xs text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  {incident.translatedText}
                </p>
              </div>
            )}

            {incident.aiSummary && (
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-rose-400 block text-[10px] uppercase font-mono">
                  Tactical AI Briefing for Responders:
                </span>
                <p>{incident.aiSummary}</p>
              </div>
            )}
          </div>
        </div>

        {/* GPS Location & Safety Protocol */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-cyan-400" />
            Distress Telemetry
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase text-slate-500 font-mono block">GPS Target</span>
              <div className="font-mono text-slate-200 font-semibold">
                {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
              </div>
              <p className="text-[11px] text-slate-400">{incident.locationName || "Reported Location"}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase text-slate-500 font-mono block">Distress Category</span>
              <div className="font-bold text-white uppercase">{incident.category}</div>
              {incident.duplicateCount && incident.duplicateCount > 0 ? (
                <p className="text-[10px] text-amber-400">
                  {incident.duplicateCount} corroborating citizen report(s) merged within 250m.
                </p>
              ) : null}
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Life Safety Guidance</span>
              </div>
              <p className="text-slate-300">
                Remain calm, stay at your reported coordinates unless immediate danger threatens, and keep this screen open for live updates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Feedback Log Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Transparent Citizen Feedback Timeline</span>
        </h3>

        <div className="space-y-4">
          {logs && logs.length > 0 ? (
            logs.map((log, idx) => (
              <div key={log.id || idx} className="relative pl-6 border-l-2 border-slate-800 pb-2">
                <div
                  className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ring-4 ring-slate-900 ${
                    log.status === "RESOLVED"
                      ? "bg-emerald-500"
                      : log.status === "EN_ROUTE"
                      ? "bg-cyan-500"
                      : "bg-rose-500"
                  }`}
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold uppercase text-slate-300 font-mono flex items-center gap-2">
                    <span>{log.status}</span>
                    {log.operatorId === "CITIZEN_CONFIRMED" && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        Citizen Verified
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                  {log.message}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 italic">No timeline entries yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
