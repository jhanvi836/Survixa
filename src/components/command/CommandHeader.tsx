"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Layers, Bot, Sparkles, LogOut } from "lucide-react";

interface CommandHeaderProps {
  totalIncidents: number;
  criticalIncidents: number;
  activeDispatches: number;
  duplicateClusters: number;
  socketConnected: boolean;
  selectedAgency: string;
  onSelectAgency: (agency: string) => void;
  simulationOpen?: boolean;
  onToggleSimulation?: () => void;
}

export function CommandHeader({
  totalIncidents,
  criticalIncidents,
  activeDispatches,
  duplicateClusters,
  socketConnected,
  selectedAgency,
  onSelectAgency,
  simulationOpen,
  onToggleSimulation,
}: CommandHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const agencies = [
    { id: "ALL", label: "Joint Command (All)" },
    { id: "FIRE", label: "Fire & Rescue", color: "text-orange-400" },
    { id: "MEDICAL", label: "Medical / EMS", color: "text-emerald-400" },
    { id: "POLICE", label: "Police / Tactical", color: "text-blue-400" },
    { id: "NGO", label: "NGO Relief", color: "text-purple-400" },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-4 md:px-6 md:py-4 space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-950/40">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">SURVIXA COMMAND CENTER</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                MULTI-AGENCY ICS
              </span>
            </div>
            <p className="text-xs text-slate-400">Common Operational Picture &bull; AI-Powered Triage & Silo Breaker</p>
          </div>
        </div>

        {/* Live Socket Status & Metrics */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                socketConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-slate-300">
              {socketConnected ? "Telemetry Bus Live" : "Reconnecting..."}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/command/ai"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-500/50 text-xs font-mono text-indigo-300 transition-colors shadow-sm"
              title="Test & Inspect Real AI Engine"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>AI Engine</span>
            </Link>
            {onToggleSimulation && (
              <button
                type="button"
                onClick={onToggleSimulation}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all shadow-sm ${
                  simulationOpen
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-950/60 font-bold"
                    : "bg-slate-950 text-indigo-300 hover:text-white border-indigo-500/40 hover:bg-indigo-950/50"
                }`}
                title="Toggle Disaster Simulation & Presentation Toolbar"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{simulationOpen ? "Hide Sim" : "Disaster Sim"}</span>
              </button>
            )}
            <div className="px-3 py-1 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs">
              <span className="text-rose-400 font-bold mr-1.5">{criticalIncidents}</span>
              <span className="text-slate-400 uppercase text-[10px]">Critical (9-10)</span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-cyan-400 font-bold mr-1.5">{activeDispatches}</span>
              <span className="text-slate-400 uppercase text-[10px]">Active Units</span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-purple-400 font-bold mr-1.5">{duplicateClusters}</span>
              <span className="text-slate-400 uppercase text-[10px]">Deduplicated</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
              title="Log Out of Command Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Agency Filter Pills (Breaking Silos) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 mr-2">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          Agency View:
        </span>
        {agencies.map((agency) => (
          <button
            key={agency.id}
            onClick={() => onSelectAgency(agency.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedAgency === agency.id
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/50"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            {agency.label}
          </button>
        ))}
      </div>
    </div>
  );
}
