"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Camera,
  Activity,
  Flame,
  Ambulance,
  LifeBuoy,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Radio,
  FileCode,
} from "lucide-react";
import { formatSeverityColor } from "@/lib/utils";

interface ScenarioPreset {
  id: string;
  title: string;
  lang: string;
  badge: string;
  text: string;
  lat: number;
  lng: number;
}

const PRESETS: ScenarioPreset[] = [
  {
    id: "fire-hi",
    title: "High-Rise Fire & Trapped Children",
    lang: "Hindi (हिंदी)",
    badge: "Life-Threat",
    text: "बिल्डिंग के 5वें माले पर भयानक आग लगी है, 4 बच्चे अंदर फंसे हैं और सीढ़ियों पर भारी काला धुआं भर गया है! तुरंत दमकल और एंबुलेंस भेजो!",
    lat: 37.7749,
    lng: -122.4194,
  },
  {
    id: "flood-es",
    title: "Flash Flood & Roof Stranding",
    lang: "Spanish (Español)",
    badge: "Rising Water",
    text: "El río se desbordó rápidamente, el nivel del agua está subiendo a más de 2 metros y dos ancianos están atrapados en el techo sin comida ni rescate.",
    lat: 37.778,
    lng: -122.421,
  },
  {
    id: "collapse-kn",
    title: "Structural Rubble Collapse",
    lang: "Kannada (ಕನ್ನಡ)",
    badge: "Extrication Needed",
    text: "ಭಾರಿ ಮಳೆಯಿಂದ ಹಳೆ ಮೂರು ಅಂತಸ್ತಿನ ಕಟ್ಟಡ ಕುಸಿದು ಬಿದ್ದಿದೆ, ಅವಶೇಷಗಳ ಅಡಿಯಲ್ಲಿ ಕನಿಷ್ಠ 5 ಜನರು ಸಿಲುಕಿದ್ದಾರೆ, ತಕ್ಷಣ ಜೆಸಿಬಿ ಮತ್ತು ವೈದ್ಯಕೀಯ ತಂಡ ಕಳುಹಿಸಿ!",
    lat: 37.772,
    lng: -122.415,
  },
  {
    id: "hazmat-en",
    title: "Highway Toxic Chemical Leak",
    lang: "English",
    badge: "Hazmat Hazard",
    text: "Chlorine tanker ruptured following 4-car pileup on the northbound bridge. Strong yellowish gas cloud drifting toward residential apartments. Multiple people unconscious and vomiting.",
    lat: 37.785,
    lng: -122.405,
  },
  {
    id: "spam-test",
    title: "Spam / Joke / Trolling Test",
    lang: "English / Slang",
    badge: "Spam Filter",
    text: "Lmaooo aliens just landed on my porch just kidding bro haha send me free pizza and send dogecoin to my wallet testing 12345!",
    lat: 37.7749,
    lng: -122.4194,
  },
];

export default function AIEngineInspectorPage() {
  const [content, setContent] = useState(PRESETS[0].text);
  const [lat, setLat] = useState<number>(PRESETS[0].lat);
  const [lng, setLng] = useState<number>(PRESETS[0].lng);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleSelectPreset = (p: ScenarioPreset) => {
    setContent(p.text);
    setLat(p.lat);
    setLng(p.lng);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageDataUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRunTriage = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    setTriageResult(null);

    try {
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawContent: content,
          latitude: lat,
          longitude: lng,
          mediaUrls: imageDataUrl ? [imageDataUrl] : [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "AI Engine triage failed");
      }

      setTriageResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to communicate with AI engine");
    } finally {
      setLoading(false);
    }
  };

  const severityBadge = triageResult?.triage
    ? formatSeverityColor(triageResult.triage.severityScore || 5)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link
            href="/command"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-950/60">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                <span>Survixa AI Triage Engine</span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Gemini 3.5 Flash
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Multimodal Translation, Life-Threat Prioritization & Noise Quarantine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/command"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-mono"
          >
            Command Center &rarr;
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-1 space-y-8">
        {/* Top Capabilities & Model Specification Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Active Model: Google Gemini 3.5 Flash (Interactions v1beta)</span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white">
                Live Disaster Ingestion & Triage Pipeline
              </h2>
              <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                Processes incoming raw multilingual audio/text reports and camera evidence. Automatically detects dialect, translates to English operational commands, computes life-threat urgency (1–10), isolates spam (0–100), and correlates geospatial incidents within 250m.
              </p>
            </div>

            <div className="flex flex-wrap md:flex-col gap-2 font-mono text-[11px]">
              <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                <span className="text-slate-500">PROVIDER: </span>Google Gemini API
              </div>
              <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                <span className="text-slate-500">ENDPOINT: </span>/v1beta/interactions
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Interactive Input Tester & Presets */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>1. Crisis Scenario Input</span>
                </h3>
                <span className="text-xs text-slate-400">Select Preset or Type Custom</span>
              </div>

              {/* Scenario Presets */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Quick Disaster Scenario Presets:
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-all flex items-center gap-1.5"
                    >
                      <span>{preset.title}</span>
                      <span className="text-[10px] text-indigo-400 font-mono">({preset.lang})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Report Input Textarea */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Raw Citizen Emergency Report:</span>
                  <span className="text-[11px] text-slate-500 font-normal">Any language accepted</span>
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste or type an emergency distress report in any language..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-600 resize-none focus:outline-none transition-all leading-relaxed"
                />
              </div>

              {/* GPS Target Telemetry */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              {/* Optional Image Evidence (Multimodal Vision Test) */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>Attach Photo Evidence (Multimodal Vision Test)</span>
                  </label>
                  {imageDataUrl && (
                    <button
                      type="button"
                      onClick={() => setImageDataUrl(null)}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />

                {imageDataUrl && (
                  <div className="mt-2 flex items-center gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <img
                      src={imageDataUrl}
                      alt="Attached evidence"
                      className="w-12 h-12 object-cover rounded-md border border-slate-700"
                    />
                    <span className="text-[11px] text-emerald-400 font-mono">
                      Image attached & ready for Gemini Multimodal Vision analysis
                    </span>
                  </div>
                )}
              </div>

              {/* Run Action Button */}
              <button
                type="button"
                onClick={handleRunTriage}
                disabled={loading || !content.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-indigo-950/50 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Querying Gemini 3.5 Flash Interactions Engine...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-amber-300" />
                    <span>TRIGGER REAL AI ENGINE TRIAGE</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live Model Diagnostic Results */}
          <div className="lg:col-span-6 space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!triageResult && !loading && (
              <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <Bot className="w-12 h-12 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-300">
                  Ready for Real AI Engine Ingestion
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Click the button on the left to invoke Google's live Gemini 3.5 Flash LLM. You will see real-time dialect translation, life-threat scoring (1-10), victim count extraction, and tactical dispatch briefs.
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-white">
                  Executing Cloud AI Triage...
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Translating dialect &bull; Scoring life threats &bull; Filtering noise
                </p>
              </div>
            )}

            {triageResult && triageResult.triage && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-300">
                {/* Result Header & Latency */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-bold text-white">
                      AI Triage Telemetry Verified
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                      {triageResult.engine}
                    </span>
                    {triageResult.latencyMs && (
                      <span className="text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {triageResult.latencyMs} ms
                      </span>
                    )}
                  </div>
                </div>

                {/* Severity & Credibility Row */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className={`p-4 rounded-xl border ${severityBadge?.bg} ${severityBadge?.border}`}>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                      Severity Urgency
                    </span>
                    <div className={`text-2xl font-black ${severityBadge?.text}`}>
                      {triageResult.triage.severityScore} / 10
                    </div>
                    <span className="text-[10px] text-slate-300 mt-1 block">
                      {severityBadge?.label}
                    </span>
                  </div>

                  <div
                    className={`p-4 rounded-xl border ${
                      triageResult.triage.quarantined
                        ? "bg-rose-950/40 border-rose-500/40"
                        : "bg-emerald-950/40 border-emerald-500/40"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                      Credibility / Filter
                    </span>
                    <div
                      className={`text-2xl font-black ${
                        triageResult.triage.quarantined ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {triageResult.triage.credibilityScore} / 100
                    </div>
                    <span className="text-[10px] text-slate-300 mt-1 block">
                      {triageResult.triage.quarantined ? "QUARANTINED (Spam/Noise)" : "VERIFIED LEGITIMATE"}
                    </span>
                  </div>
                </div>

                {/* Multilingual Translation */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      Detected Dialect & Operational Translation
                    </span>
                    <span className="font-mono text-cyan-400 font-bold uppercase text-[10px] bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      ISO: {triageResult.triage.originalLanguage}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {triageResult.triage.translatedText}
                  </p>
                </div>

                {/* Structured Extraction: Category, Victims, Needs */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">
                      Hazard Category
                    </span>
                    <span className="font-bold text-white text-xs">
                      {triageResult.triage.hazardType}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">
                      Estimated Victims
                    </span>
                    <span className="font-bold text-white text-xs">
                      {triageResult.triage.estimatedVictims > 0
                        ? `${triageResult.triage.estimatedVictims} Individual(s)`
                        : "None explicitly reported"}
                    </span>
                  </div>
                </div>

                {/* Immediate Tactical Needs */}
                {triageResult.triage.immediateNeeds && triageResult.triage.immediateNeeds.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block">
                      Immediate Tactical Rescue Needs:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {triageResult.triage.immediateNeeds.map((need: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-medium"
                        >
                          {need}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Agencies */}
                {triageResult.triage.recommendedAgencies && triageResult.triage.recommendedAgencies.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block">
                      Recommended Multi-Agency Deployment:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {triageResult.triage.recommendedAgencies.map((agency: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-md bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-bold font-mono"
                        >
                          {agency}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Multimodal Image Analysis note (if present) */}
                {triageResult.triage.imageAnalysis && (
                  <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 text-xs space-y-1">
                    <span className="font-bold font-mono text-[10px] uppercase text-cyan-400 block">
                      Gemini Vision Image Verification:
                    </span>
                    <p>{triageResult.triage.imageAnalysis}</p>
                  </div>
                )}

                {/* 2-Sentence Commander Tactical Briefing */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                    AI Tactical Briefing for Joint First Responders:
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {triageResult.triage.aiSummary}
                  </p>
                </div>

                {/* Toggle Raw JSON Button */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1.5"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{showRawJson ? "Hide Raw Model JSON" : "Inspect Raw Gemini JSON Output"}</span>
                  </button>

                  {showRawJson && (
                    <pre className="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64">
                      {JSON.stringify(triageResult, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        Survixa AI Triage Engine &bull; Powered by Google Gemini 3.5 Flash &bull; Breaking Multi-Agency Silos
      </footer>
    </div>
  );
}
