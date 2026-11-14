import Link from "next/link";
import { AlertTriangle, Shield, Radio, ArrowRight, Compass } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-950/40">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              SURVIXA
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                AI DISASTER RESPONSE
              </span>
            </h1>
            <p className="text-xs text-slate-400">Inter-Agency Common Operating Picture & Citizen Loop</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Socket.io Live Mesh Active
          </span>
        </div>
      </header>

      {/* Main Gateway */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-xs mb-4">
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            Breaking Silos Across Fire, Medical, Police & NGOs
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Autonomous AI Triage & Unified Command Operations
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Eliminating coordination delays during catastrophic events. Citizens report in any language with live GPS telemetry, while Joint Command synchronizes multi-agency field rescue units in real time.
          </p>
        </div>

        {/* Portal Entry Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* 1. Citizen Portal */}
          <Link
            href="/report"
            className="group relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-950/20 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Public Gateway
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Citizen Emergency Portal</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Fast emergency submission in your native language (auto-translated). Features automated GPS capture, voice input, and a transparent real-time feedback loop tracking responder dispatch.
              </p>

              <div className="space-y-2 mb-6 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Multilingual AI NLP (Spanish, Hindi, Ukrainian, English)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Live Citizen Feedback Loop with Unit Proximity ETA
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  No login required for life-critical speed
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-rose-400 font-medium text-sm group-hover:translate-x-1 transition-transform">
              <span>Report Emergency & Track Live (/report)</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* 2. Command Center Dashboard */}
          <Link
            href="/command"
            className="group relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-950/20 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Tactical Command Desk
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Joint Command Center</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Breaking agency silos across Fire, Medical, Police, and NGOs. Live situational map, AI severity score ranking (1–10), duplicate report clustering, and multi-agency unit dispatching.
              </p>

              <div className="space-y-2 mb-6 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Unified Multi-Agency Fleet (Fire, Medical, Police, NGO)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  AI Triage: Severity (1-10), Credibility & Duplicate Detection
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Socket.io Live Telemetry & Status Loop Broadcast
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-cyan-400 font-medium text-sm group-hover:translate-x-1 transition-transform">
              <span>Open Joint Command Dashboard (/command)</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Agency Silo Breaker Banner */}
        <div className="mt-14 p-6 rounded-xl bg-slate-900/60 border border-slate-800 max-w-4xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Compass className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">Unified Multi-Agency Common Operating Picture</h4>
                <p className="text-xs text-slate-400">Single real-time data bus preventing duplicate dispatches and inter-agency blind spots</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-orange-500/20 text-orange-400 text-xs font-mono font-medium">FIRE</span>
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">MEDICAL</span>
              <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-mono font-medium">POLICE</span>
              <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-400 text-xs font-mono font-medium">NGO</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Survixa AI-Powered Disaster Response Platform &bull; Built with Next.js, Node.js, Prisma ORM, PostgreSQL & Socket.io
      </footer>
    </div>
  );
}
