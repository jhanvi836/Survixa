"use client";

import { useEffect, useState } from "react";
import { getSocketClient } from "@/lib/socket-client";
import { IncidentRecord, StatusUpdateLogRecord, IncidentStatus } from "@/types";
import { CheckCircle2, Clock, Truck } from "lucide-react";
import { formatAgencyBadge } from "@/lib/utils";

interface LiveCitizenFeedbackLoopProps {
  initialIncident: IncidentRecord;
}

const STAGES: { key: IncidentStatus; label: string; desc: string }[] = [
  { key: "RECEIVED", label: "Report Ingested", desc: "Received & translated by AI" },
  { key: "VERIFIED", label: "Triage Verified", desc: "Confirmed by emergency sensor / dispatcher" },
  { key: "ASSIGNED", label: "Units Assigned", desc: "Multi-agency team dispatched" },
  { key: "EN_ROUTE", label: "Responders En Route", desc: "Active transit with live GPS tracking" },
  { key: "RESOLVED", label: "Crisis Resolved", desc: "Scene stabilized and secured" },
];

export function LiveCitizenFeedbackLoop({ initialIncident }: LiveCitizenFeedbackLoopProps) {
  const [incident, setIncident] = useState<IncidentRecord>(initialIncident);
  const [logs, setLogs] = useState<StatusUpdateLogRecord[]>(initialIncident.statusLogs || []);
  const [assignedUnits, setAssignedUnits] = useState<any[]>(
    initialIncident.dispatches?.map((d) => d.rescueUnit).filter(Boolean) || []
  );
  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    const socket = getSocketClient();

    // Join the specific incident room ("incident_<id>") and tracking alias
    const incidentRoom = incident.id;
    socket.emit("join:incident", incidentRoom);
    if (incident.trackingCode) {
      socket.emit("join:citizen_tracker", incident.trackingCode);
    }
    setLiveConnected(socket.connected);

    socket.on("connect", () => {
      setLiveConnected(true);
      socket.emit("join:incident", incidentRoom);
      if (incident.trackingCode) {
        socket.emit("join:citizen_tracker", incident.trackingCode);
      }
    });

    socket.on("disconnect", () => {
      setLiveConnected(false);
    });

    // Listen to real-time status transitions and log updates (updates screen live without refreshing)
    const handleStatusStream = (payload: any) => {
      if (
        payload.incidentId === incident.id ||
        (payload.trackingCode && payload.trackingCode === incident.trackingCode)
      ) {
        console.log("⚡ [Citizen Loop] Received live status change:", payload.status);

        setIncident((prev) => ({
          ...prev,
          status: payload.status,
        }));

        if (payload.updateLog) {
          setLogs((prev) => {
            // Avoid duplicate log entries by checking id
            const exists = prev.some((l) => l.id === payload.updateLog.id);
            if (exists) return prev;
            return [...prev, payload.updateLog];
          });
        }

        if (payload.assignedUnits) {
          setAssignedUnits(payload.assignedUnits);
        }
      }
    };

    socket.on("status_change", handleStatusStream);
    socket.on("citizen:status_stream", handleStatusStream);
    socket.on("incident:status_changed", handleStatusStream);

    return () => {
      socket.emit("leave:incident", incidentRoom);
      if (incident.trackingCode) {
        socket.emit("leave:citizen_tracker", incident.trackingCode);
      }
      socket.off("status_change", handleStatusStream);
      socket.off("citizen:status_stream", handleStatusStream);
      socket.off("incident:status_changed", handleStatusStream);
    };
  }, [incident.id, incident.trackingCode]);

  // Determine active step index (0 to 4)
  const currentStepIndex = STAGES.findIndex((s) => s.key === incident.status);

  return (
    <div className="space-y-6">
      {/* Live Feedback Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                TRACKING ID: {incident.trackingCode}
              </span>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
                Language Detected: {incident.originalLanguage.toUpperCase()}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white">Live Citizen Emergency Feedback Loop</h2>
            <p className="text-xs text-slate-400 mt-1">
              Real-time transparent dispatch telemetry directly from Joint Disaster Command.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono border ${
                liveConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  liveConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              {liveConnected ? "Live Socket Stream Active" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* 5-Step Visual Progress Bar */}
        <div className="py-8">
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-6 right-6 h-1 bg-slate-800 -translate-y-1/2 z-0 hidden sm:block" />
            <div
              className="absolute top-5 left-6 h-1 bg-rose-500 -translate-y-1/2 z-0 transition-all duration-700 hidden sm:block"
              style={{
                width: `${Math.max(0, (currentStepIndex / (STAGES.length - 1)) * 90)}%`,
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
              {STAGES.map((stage, idx) => {
                const isPassed = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={stage.key} className="flex flex-row sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isCurrent
                          ? "bg-rose-600 text-white ring-4 ring-rose-500/30 scale-110 shadow-lg shadow-rose-950/60"
                          : isPassed
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 text-slate-500 border border-slate-700"
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>

                    <div>
                      <h4
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isCurrent
                            ? "text-rose-400"
                            : isPassed
                            ? "text-emerald-400"
                            : "text-slate-400"
                        }`}
                      >
                        {stage.label}
                      </h4>
                      <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Multi-Agency Units Assigned Banner */}
        {assignedUnits && assignedUnits.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Truck className="w-4 h-4 text-rose-400" />
              Dispatched Field Units (Breaking Agency Silos)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {assignedUnits.map((unit, idx) => {
                const badge = formatAgencyBadge(unit.agencyType);
                return (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs font-bold text-white">{unit.callsign}</div>
                      <div className="text-[11px] text-slate-400">{unit.department || "Field Asset"}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Chronological Feedback Log Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Transparent Citizen Action Timeline
        </h3>

        <div className="space-y-4">
          {logs.map((log, idx) => (
            <div key={log.id || idx} className="relative pl-6 border-l-2 border-slate-800 pb-2">
              <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-slate-900" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold uppercase text-slate-300 font-mono">
                  {log.status}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                {log.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
