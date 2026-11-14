"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { CommandHeader } from "@/components/command/CommandHeader";
import { DisasterSimulationToolbar } from "@/components/command/DisasterSimulationToolbar";
import { LiveIncidentMap } from "@/components/command/LiveIncidentMap";
import { IncidentQueue } from "@/components/command/IncidentQueue";
import { MultiAgencyUnitList } from "@/components/command/MultiAgencyUnitList";
import { RightPanelIncidentInspector } from "@/components/command/RightPanelIncidentInspector";
import { DispatchModal } from "@/components/command/DispatchModal";
import { getSocketClient } from "@/lib/socket-client";
import { IncidentRecord, RescueUnitRecord } from "@/types";
import { AlertTriangle, RefreshCw, Radio, Truck, Zap, Layers } from "lucide-react";

export default function CommandDashboardPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [units, setUnits] = useState<RescueUnitRecord[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<IncidentRecord | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<string>("ALL");
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Right Panel Tab View: "INSPECTOR" or "FLEET"
  const [rightPanelTab, setRightPanelTab] = useState<"INSPECTOR" | "FLEET">("INSPECTOR");

  // Disaster Simulation Toolbar Toggle
  const [simulationOpen, setSimulationOpen] = useState(false);

  // Track active dispatched unit IDs for instant route line drawing
  const [activeDispatchedUnitIds, setActiveDispatchedUnitIds] = useState<string[]>([]);

  // Fetch initial incidents and rescue units from API
  const loadData = async () => {
    try {
      setLoading(true);
      const [incRes, unitRes] = await Promise.all([
        fetch("/api/incidents"),
        fetch("/api/units"),
      ]);

      const incData = await incRes.json();
      const unitData = await unitRes.json();

      if (incData.success) {
        setIncidents(incData.incidents);
        if (incData.incidents.length > 0 && !selectedIncident) {
          setSelectedIncident(incData.incidents[0]);
        }
      }

      if (unitData.success) {
        setUnits(unitData.units);
      }
    } catch (err) {
      console.error("Failed to load command center data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Socket.io Real-Time Synchronization
    const socket = getSocketClient();
    socket.emit("join:command_center");
    setSocketConnected(socket.connected);

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("join:command_center");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    // 1. Live new incident ingestion
    const handleNewIncident = (newInc: IncidentRecord) => {
      setIncidents((prev) => [newInc, ...prev]);
    };

    // 2. Live incident status update & dispatch
    const handleStatusChanged = (payload: any) => {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === payload.incidentId
            ? {
                ...inc,
                status: payload.status,
                statusLogs: [payload.log, ...(inc.statusLogs || [])],
              }
            : inc
        )
      );

      setSelectedIncident((prev) => {
        if (!prev || prev.id !== payload.incidentId) return prev;
        return {
          ...prev,
          status: payload.status,
          statusLogs: [payload.log, ...(prev.statusLogs || [])],
        };
      });

      // Update unit states if units were assigned
      if (payload.assignedUnits && Array.isArray(payload.assignedUnits)) {
        const assignedIds = payload.assignedUnits.map((u: any) => u.id || u.callsign);
        setUnits((prev) =>
          prev.map((unit) =>
            assignedIds.includes(unit.id) || assignedIds.includes(unit.callsign)
              ? { ...unit, availability: "DISPATCHED" }
              : unit
          )
        );
      }
    };

    // 3. Live Rescue Unit GPS Telemetry
    const handleGpsUpdate = (payload: any) => {
      setUnits((prev) =>
        prev.map((unit) =>
          unit.id === payload.unitId
            ? {
                ...unit,
                latitude: payload.latitude,
                longitude: payload.longitude,
                speed: payload.speed ?? unit.speed,
                heading: payload.heading ?? unit.heading,
                lastGpsUpdate: new Date(),
              }
            : unit
        )
      );
    };

    socket.on("incident:created", handleNewIncident);
    socket.on("incident:verified", handleNewIncident);
    socket.on("new_incident", handleNewIncident);
    socket.on("incident:status_changed", handleStatusChanged);
    socket.on("unit:gps_updated", handleGpsUpdate);

    return () => {
      socket.off("incident:created", handleNewIncident);
      socket.off("incident:verified", handleNewIncident);
      socket.off("new_incident", handleNewIncident);
      socket.off("incident:status_changed", handleStatusChanged);
      socket.off("unit:gps_updated", handleGpsUpdate);
    };
  }, []);

  // When a responder clicks an incident on the map or priority list, automatically switch right panel to Inspector
  const handleSelectIncident = (inc: IncidentRecord) => {
    setSelectedIncident(inc);
    setRightPanelTab("INSPECTOR");
  };

  // Callback when Assign & Dispatch is executed from the Right Panel Smart Dispatch Drawer
  const handleDispatchSuccess = (incidentId: string, assignedUnitIds: string[]) => {
    // 1. Update active route line unit IDs for instant map rendering
    setActiveDispatchedUnitIds((prev) => Array.from(new Set([...prev, ...assignedUnitIds])));

    // 2. Set units to BUSY (DISPATCHED) in local state immediately
    setUnits((prev) =>
      prev.map((unit) =>
        assignedUnitIds.includes(unit.id)
          ? { ...unit, availability: "DISPATCHED" }
          : unit
      )
    );

    // 3. Update incident status to ASSIGNED in local state
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId ? { ...inc, status: "ASSIGNED" } : inc
      )
    );

    setSelectedIncident((prev) =>
      prev && prev.id === incidentId ? { ...prev, status: "ASSIGNED" } : prev
    );

    // 4. Refresh data from server to keep everything in sync
    setTimeout(loadData, 500);
  };

  // Filtered incidents based on agency selection
  const filteredIncidents = useMemo(() => {
    if (selectedAgency === "ALL") return incidents;
    return incidents.filter((inc) => {
      if (selectedAgency === "FIRE" && (inc.category === "FIRE" || inc.hazardsIdentified?.some(h => h.includes("Combustion")))) return true;
      if (selectedAgency === "MEDICAL" && (inc.category === "MEDICAL_EMERGENCY" || (inc.estimatedVictims ?? 0) > 0)) return true;
      if (selectedAgency === "POLICE" && (inc.category === "STRUCTURAL_COLLAPSE" || inc.category === "EARTHQUAKE")) return true;
      if (selectedAgency === "NGO" && (inc.category === "FLOOD" || inc.category === "CYCLONE_STORM")) return true;
      return false;
    });
  }, [incidents, selectedAgency]);

  // Metric aggregates
  const criticalCount = incidents.filter((i) => (i.severityScore ?? 0) >= 9).length;
  const duplicateClusters = incidents.reduce((acc, curr) => acc + (curr.duplicateCount ?? 0), 0);
  const activeDispatches = units.filter((u) => u.availability !== "AVAILABLE" && u.availability !== "OFFLINE").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Universal Command Header */}
      <CommandHeader
        totalIncidents={incidents.length}
        criticalIncidents={criticalCount}
        activeDispatches={activeDispatches}
        duplicateClusters={duplicateClusters}
        socketConnected={socketConnected}
        selectedAgency={selectedAgency}
        onSelectAgency={setSelectedAgency}
        simulationOpen={simulationOpen}
        onToggleSimulation={() => setSimulationOpen(!simulationOpen)}
      />

      {/* Hidden / Toggleable Disaster Simulation Toolbar */}
      <DisasterSimulationToolbar
        onRefreshData={loadData}
        isOpen={simulationOpen}
        onToggle={() => setSimulationOpen(!simulationOpen)}
      />

      {/* Main Command Dashboard Layout */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Triage Queue (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Incoming Priority Queue ({filteredIncidents.length})
            </h3>
            <button
              onClick={loadData}
              className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh queue"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <IncidentQueue
            incidents={filteredIncidents}
            selectedIncident={selectedIncident}
            onSelectIncident={handleSelectIncident}
            onOpenDispatch={(inc) => {
              handleSelectIncident(inc);
              setRightPanelTab("INSPECTOR");
            }}
          />
        </div>

        {/* Center Column: Live Tactical Map with Drawn Route Lines (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              Common Operational Picture (Live GPS)
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <Link
                href="/report"
                className="text-xs text-rose-400 hover:text-rose-300 underline font-mono"
              >
                Citizen Portal &rarr;
              </Link>
            </div>
          </div>

          <LiveIncidentMap
            incidents={incidents}
            units={units}
            selectedIncident={selectedIncident}
            onSelectIncident={handleSelectIncident}
            activeDispatchedUnitIds={activeDispatchedUnitIds}
          />
        </div>

        {/* =====================================================================
            Right Column: Incident Inspector & Smart Dispatch Drawer (4 cols)
           ===================================================================== */}
        <div className="lg:col-span-4 space-y-3">
          {/* Right Panel Navigation Tabs */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setRightPanelTab("INSPECTOR")}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  rightPanelTab === "INSPECTOR"
                    ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-950/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Incident Inspector & Smart Dispatch</span>
              </button>

              <button
                type="button"
                onClick={() => setRightPanelTab("FLEET")}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  rightPanelTab === "FLEET"
                    ? "bg-slate-800 text-cyan-300 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Fleet ({units.length})</span>
              </button>
            </div>
          </div>

          {/* Conditional View: Right Panel Inspector Drawer vs Fleet List */}
          {rightPanelTab === "INSPECTOR" ? (
            <RightPanelIncidentInspector
              incident={selectedIncident}
              units={units}
              onClose={() => setRightPanelTab("FLEET")}
              onDispatchSuccess={handleDispatchSuccess}
            />
          ) : (
            <div className="space-y-4">
              <MultiAgencyUnitList units={units} selectedAgency={selectedAgency} />
            </div>
          )}
        </div>
      </main>

      {/* Cross-Agency Dispatch Modal (Secondary Support) */}
      {dispatchTarget && (
        <DispatchModal
          incident={dispatchTarget}
          units={units}
          onClose={() => setDispatchTarget(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
