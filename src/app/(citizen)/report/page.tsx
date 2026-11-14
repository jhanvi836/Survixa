"use client";

import Link from "next/link";
import { EmergencyReportForm } from "@/components/citizen/EmergencyReportForm";
import { AlertTriangle, ArrowLeft, Search } from "lucide-react";

export default function CitizenReportPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Survixa Citizen Portal</h1>
              <p className="text-[11px] text-slate-400">Emergency Ingestion & Multilingual AI Triage</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/command"
            className="text-xs text-cyan-400 hover:text-cyan-300 underline font-mono hidden sm:block"
          >
            Go to Command Center &rarr;
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto w-full px-4 py-8 flex-1">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Report an Emergency</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl mx-auto">
            Speak or type in your native language. AI translates your report immediately, computes urgency (1-10), and tracks responder units in real time.
          </p>
        </div>

        {/* Form */}
        <EmergencyReportForm />

        {/* Quick Tracking Search Box */}
        <div className="mt-8 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400" />
            Already submitted a distress report? Track it here
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            Enter your 8-character tracking code (e.g. <span className="font-mono text-rose-400">SVX-FL-9021</span>) to view the live feedback loop.
          </p>
          <form
            onSubmit={(e: any) => {
              e.preventDefault();
              const code = e.target.trackingCode.value.trim();
              if (code) {
                window.location.href = `/track/${code}`;
              }
            }}
            className="flex gap-2"
          >
            <input
              name="trackingCode"
              type="text"
              placeholder="e.g. SVX-FL-9021"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 uppercase"
              required
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
            >
              Track Live
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        Emergency services will receive exact GPS telemetry and AI translated briefs instantly.
      </footer>
    </div>
  );
}
