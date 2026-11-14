import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function DispatchManagementPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/command"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Multi-Agency Joint Dispatch Board</h1>
              <p className="text-[11px] text-slate-400">Cross-Jurisdictional Resource Routing</p>
            </div>
          </div>
        </div>

        <Link
          href="/command"
          className="text-xs text-cyan-400 hover:text-cyan-300 underline font-mono"
        >
          &larr; Back to Tactical Dashboard
        </Link>
      </header>

      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1">
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <Shield className="w-12 h-12 text-cyan-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Joint Incident Command System (ICS-201)</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            All incident dispatching is unified in real time with the Common Operating Picture. You can dispatch individual units directly from the main Command Center or manage unit rosters below.
          </p>
          <div className="pt-4">
            <Link
              href="/command"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-950/40"
            >
              <span>Go to Command Center</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
