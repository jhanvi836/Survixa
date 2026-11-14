"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  RotateCcw,
  WifiOff,
  Wifi,
  ShieldAlert,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  X,
  Play,
  Terminal,
} from "lucide-react";
import {
  isOfflineSimulationActive,
  setOfflineSimulation,
  flushOfflineQueue,
} from "@/lib/offline-manager";

interface SimulationToolbarProps {
  onRefreshData: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function DisasterSimulationToolbar({
  onRefreshData,
  isOpen,
  onToggle,
}: SimulationToolbarProps) {
  const [injecting, setInjecting] = useState(false);
  const [purging, setPurging] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync simulated offline state on mount
  useEffect(() => {
    setIsSimulatedOffline(isOfflineSimulationActive());

    const handleSimulationEvent = (e: any) => {
      setIsSimulatedOffline(Boolean(e.detail?.active));
    };

    window.addEventListener("survixa:offline_simulation", handleSimulationEvent);
    return () => {
      window.removeEventListener("survixa:offline_simulation", handleSimulationEvent);
    };
  }, []);

  // 1. INJECT 10 REALISTIC MULTILINGUAL REPORTS
  const handleInjectReports = async () => {
    try {
      setInjecting(true);
      setStatusMessage("Injecting 10 multilingual reports & executing AI triage pipeline...");
      setSimulationResult(null);

      const res = await fetch("/api/simulation/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to inject simulation batch");
      }

      setSimulationResult(data);
      setStatusMessage(
        `Simulation Injected: 10 reports -> ${data.summary.masterCreated} Masters, ${data.summary.duplicatesMerged} Merged Dupes (250m), ${data.summary.quarantinedSpam} Quarantined Spam.`
      );
      onRefreshData();
    } catch (err: any) {
      console.error("Simulation error:", err);
      setStatusMessage("Error injecting simulation: " + err.message);
    } finally {
      setInjecting(false);
    }
  };

  // 2. TOGGLE SIMULATED OFFLINE CELLULAR DROP
  const handleToggleOffline = () => {
    const nextState = !isSimulatedOffline;
    setOfflineSimulation(nextState);
    setIsSimulatedOffline(nextState);
    if (!nextState) {
      flushOfflineQueue();
      setStatusMessage("Cellular connectivity restored! Offline queues synchronized.");
    } else {
      setStatusMessage("0-Bar Cellular Outage simulated! Citizen Portal will queue reports locally.");
    }
  };

  // 3. PURGE SIMULATION DATA
  const handlePurgeSimulation = async () => {
    try {
      setPurging(true);
      setStatusMessage("Purging simulation incidents...");

      const res = await fetch("/api/simulation/inject", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to purge simulation");

      setSimulationResult(null);
      setStatusMessage("Simulation data cleared. Dispatcher queue restored to clean state.");
      onRefreshData();
    } catch (err: any) {
      setStatusMessage("Failed to purge: " + err.message);
    } finally {
      setPurging(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="bg-slate-900 border-b border-indigo-900/40 px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-mono text-indigo-300 font-semibold">
            Disaster Simulation Suite Available
          </span>
          <span className="hidden sm:inline text-slate-400">
            &bull; Test AI spam filter, 250m Haversine deduplication & offline queueing
          </span>
        </div>
        <button
          onClick={onToggle}
          className="px-3 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white font-mono font-bold flex items-center gap-1.5 shadow transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Open Simulation Toolbar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-950 via-indigo-950/60 to-slate-950 border-b border-indigo-500/40 p-4 md:px-6 shadow-2xl space-y-4 animate-in slide-in-from-top-2 duration-200">
      {/* Top Bar with Title & Close */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/50">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Disaster Simulation & Testing Toolbar
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono">
                LIVE DEMO HARNESS
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Prove AI noise filtering, 250m spatial deduplication, life-threat ranking, and offline sync.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Minimize Toolbar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Action Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Action 1: Inject 10 Multilingual Reports */}
        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-indigo-300 flex items-center gap-1.5 uppercase">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              1. Multi-Report Influx
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              10 Reports
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Injects 10 simultaneous multilingual reports: 3 duplicates at 5th & Market (merged), 2 spam reports (quarantined), and 5 diverse emergencies.
          </p>
          <button
            type="button"
            disabled={injecting}
            onClick={handleInjectReports}
            className={`w-full py-2 px-3 rounded-lg font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 ${
              injecting
                ? "bg-indigo-700 text-indigo-200 cursor-wait animate-pulse"
                : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-950/50"
            }`}
          >
            {injecting ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Triaging 10 Reports...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Inject 10 Disaster Reports</span>
              </>
            )}
          </button>
        </div>

        {/* Action 2: Simulate Offline Network Drop */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-amber-300 flex items-center gap-1.5 uppercase">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              2. Weak-Connection Resilience
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isSimulatedOffline
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse font-bold"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {isSimulatedOffline ? "0 BARS (OFFLINE)" : "ONLINE (NORMAL)"}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Simulate a zero-bar cellular tower failure on the Citizen Portal to verify local queuing and auto-sync on restoration.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleToggleOffline}
              className={`py-2 px-2.5 rounded-lg font-bold text-xs font-mono transition-all flex items-center justify-center gap-1.5 border ${
                isSimulatedOffline
                  ? "bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400"
                  : "bg-slate-800 text-amber-300 border-amber-500/40 hover:bg-slate-750"
              }`}
            >
              {isSimulatedOffline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isSimulatedOffline ? "Restore Signal" : "Drop Network"}</span>
            </button>

            <Link
              href="/report?simulate_offline=true"
              target="_blank"
              className="py-2 px-2.5 rounded-lg font-bold text-xs font-mono bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Portal</span>
            </Link>
          </div>
        </div>

        {/* Action 3: Purge / Reset Simulation State */}
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-rose-300 flex items-center gap-1.5 uppercase">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              3. Reset & Clean Slate
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
              Demo Reset
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Purges all simulated reports and logs, restoring the Command Center queue to pristine baseline for subsequent live presentations.
          </p>
          <button
            type="button"
            disabled={purging}
            onClick={handlePurgeSimulation}
            className={`w-full py-2 px-3 rounded-lg font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 ${
              purging
                ? "bg-rose-900 text-rose-300 cursor-wait animate-pulse"
                : "bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/50"
            }`}
          >
            {purging ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Purging Injected Records...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Simulation Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Status Notification Strip */}
      {statusMessage && (
        <div className="bg-slate-900/80 border border-indigo-500/30 px-3.5 py-2 rounded-lg text-xs font-mono text-indigo-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Results Verification Card (When Injection Completes) */}
      {simulationResult && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                AI Triage Verification Breakdown
              </span>
            </div>
            <button
              onClick={() => setShowLogDetails(!showLogDetails)}
              className="text-xs text-indigo-300 hover:text-indigo-200 font-mono flex items-center gap-1"
            >
              {showLogDetails ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Hide Log Details</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Inspect All 10 Injected Reports ({simulationResult.results?.length})</span>
                </>
              )}
            </button>
          </div>

          {/* 4 Key Proof Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div className="text-xl font-bold text-rose-400 font-mono">
                {simulationResult.summary.quarantinedSpam}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Spam Quarantined
              </div>
              <div className="text-[9px] text-rose-400/80">Credibility &lt; 25% filtered</div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div className="text-xl font-bold text-purple-400 font-mono">
                {simulationResult.summary.duplicatesMerged}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Duplicates Merged
              </div>
              <div className="text-[9px] text-purple-400/80">Haversine &le; 250m</div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div className="text-xl font-bold text-cyan-400 font-mono">
                {simulationResult.summary.masterCreated}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Master Tickets
              </div>
              <div className="text-[9px] text-cyan-400/80">Created on Board</div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div className="text-xl font-bold text-emerald-400 font-mono">10 / 10</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Top Priority Rank</div>
              <div className="text-[9px] text-emerald-400/80">Trapped Kids Hindi @ #1</div>
            </div>
          </div>

          {/* Detailed Injected Reports Log Drawer */}
          {showLogDetails && (
            <div className="space-y-2 pt-2 border-t border-slate-800 max-h-60 overflow-y-auto">
              {simulationResult.results?.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs flex items-center justify-between gap-3 font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      #{idx + 1}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        item.type === "QUARANTINED_SPAM"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : item.type === "DUPLICATE_MERGED"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-slate-300 font-semibold">{item.simId}</span>
                    <span className="text-[10px] text-slate-500">
                      [{item.originalLanguage?.toUpperCase() || "EN"}]
                    </span>
                  </div>

                  <div className="text-right text-[11px]">
                    {item.type === "QUARANTINED_SPAM" && (
                      <span className="text-rose-400">
                        Credibility: {item.credibilityScore}/100 &bull; {item.quarantineReason}
                      </span>
                    )}
                    {item.type === "DUPLICATE_MERGED" && (
                      <span className="text-purple-300">
                        Merged into Master [{item.masterTrackingCode}] &bull; Dupe count:{" "}
                        {item.duplicateCountNow}
                      </span>
                    )}
                    {item.type === "MASTER_CREATED" && (
                      <span className="text-cyan-300">
                        Ticket: {item.trackingCode} &bull; Sev: {item.severityScore}/10 &bull;{" "}
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
