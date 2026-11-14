"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ClosedLoopFeedbackTracker } from "@/components/citizen/ClosedLoopFeedbackTracker";
import { ArrowLeft, AlertTriangle, RefreshCw, LifeBuoy } from "lucide-react";
import { IncidentRecord } from "@/types";

export default function LegacyCitizenTrackPage() {
  const params = useParams();
  const rawId = (params?.id as string) || "";

  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncident = async () => {
    if (!rawId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/incidents/${rawId}/track`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Incident report not found");
      }

      setIncident({
        ...data.incident,
        statusLogs: data.statusLogs || [],
        dispatches: (data.assignedUnits || []).map((u: any) => ({
          id: u.id || u.callsign,
          incidentId: data.incident.id,
          rescueUnitId: u.id || u.callsign,
          rescueUnit: u,
          dispatchedAt: new Date(),
        })),
      });
    } catch (err: any) {
      setError(err.message || "Failed to retrieve incident status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [rawId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link
            href="/report"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Return to Emergency Portal"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-red-600 flex items-center justify-center shadow-lg shadow-rose-900/40">
              <LifeBuoy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">
                Survixa Live Distress Tracker
              </h1>
              <p className="text-[11px] text-slate-400">
                Closed-Loop Citizen Feedback & Multi-Agency Dispatch
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchIncident}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/report"
            className="text-xs text-cyan-400 hover:text-cyan-300 underline font-mono hidden md:inline"
          >
            New Report &rarr;
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        {loading && (
          <div className="text-center py-24 space-y-4">
            <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-medium">
              Connecting to Survixa Real-Time Emergency Feedback Room...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-xl font-bold text-white">Tracking Record Not Found</h3>
            <p className="text-sm text-slate-300">
              No emergency report was found for reference{" "}
              <span className="font-mono text-rose-400 font-bold">{rawId}</span>.
            </p>
            <div className="pt-2">
              <Link
                href="/report"
                className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-sm font-semibold text-white shadow-lg shadow-rose-950/50 transition-colors"
              >
                Submit an Emergency Report
              </Link>
            </div>
          </div>
        )}

        {!loading && incident && (
          <ClosedLoopFeedbackTracker initialIncident={incident} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        Survixa Automated Transparency Pipeline &bull; End-to-end closed-loop citizen verification
      </footer>
    </div>
  );
}
