"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  AlertCircle,
  Send,
  Mic,
  MicOff,
  Globe,
  ShieldAlert,
  Flame,
  Ambulance,
  Waves,
  Building,
  Camera,
  WifiOff,
  Wifi,
  Sliders,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import {
  SupportedLanguage,
  TRANSLATIONS,
} from "@/lib/translations";
import { compressImage, CompressionResult } from "@/lib/image-compressor";
import {
  enqueueOfflineReport,
  flushOfflineQueue,
  getQueuedReports,
  isOfflineSimulationActive,
  setOfflineSimulation,
} from "@/lib/offline-manager";

type HazardType = "MEDICAL" | "FIRE" | "FLOOD" | "COLLAPSE";

export function EmergencyReportForm() {
  const router = useRouter();

  // Multilingual state
  const [lang, setLang] = useState<SupportedLanguage>("en");
  const t = TRANSLATIONS[lang];

  // Form inputs
  const [selectedHazard, setSelectedHazard] = useState<HazardType | null>(null);
  const [content, setContent] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("");
  const [showManualPin, setShowManualPin] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");

  // Media & Compression
  const [compressedImage, setCompressedImage] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Connectivity & Offline
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [onlineSyncNotice, setOnlineSyncNotice] = useState<string | null>(null);

  // Statuses
  const [gpsStatus, setGpsStatus] = useState<"idle" | "acquiring" | "success" | "error">("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Speech Recognition reference
  const recognitionRef = useRef<any>(null);

  // 1. Connectivity Listeners & Offline Queue Sync
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    setQueuedCount(getQueuedReports().length);

    // Check if offline simulation is requested via URL (?simulate_offline=true) or local storage
    const params = new URLSearchParams(window.location.search);
    if (params.get("simulate_offline") === "true") {
      setOfflineSimulation(true);
      setIsSimulatedOffline(true);
    } else {
      setIsSimulatedOffline(isOfflineSimulationActive());
    }

    const handleSimulationChange = (e: any) => {
      setIsSimulatedOffline(Boolean(e.detail?.active));
    };
    window.addEventListener("survixa:offline_simulation", handleSimulationChange);

    const handleOnline = async () => {
      setIsOnline(true);
      setOnlineSyncNotice(t.onlineBanner);
      const res = await flushOfflineQueue((_id, result) => {
        if (result?.incident?.id || result?.trackingCode) {
          const targetId = result?.incident?.id || result?.trackingCode;
          router.push(`/track/${targetId}`);
        }
      });
      setQueuedCount(getQueuedReports().length);
      setTimeout(() => setOnlineSyncNotice(null), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("survixa:offline_simulation", handleSimulationChange);
    };
  }, [router, t.onlineBanner]);

  // Handler to manually restore connection during live presentation demo
  const handleRestoreConnection = async () => {
    setOfflineSimulation(false);
    setIsSimulatedOffline(false);
    setOnlineSyncNotice("Cellular connectivity restored! Transmitting queued reports to Unified Command...");
    await flushOfflineQueue((_id, result) => {
      if (result?.incident?.id || result?.trackingCode) {
        const targetId = result?.incident?.id || result?.trackingCode;
        router.push(`/track/${targetId}`);
      }
    });
    setQueuedCount(getQueuedReports().length);
    setTimeout(() => setOnlineSyncNotice(null), 6000);
  };

  // 2. Auto-acquire GPS on mount
  useEffect(() => {
    acquireGPS();
  }, []);

  const acquireGPS = () => {
    setGpsStatus("acquiring");
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsStatus("error");
      setLatitude(37.7749);
      setLongitude(-122.4194);
      setLocationName("San Francisco Alpha Zone (Default)");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsStatus("success");
        if (!locationName) {
          setLocationName(`GPS ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }
      },
      (err) => {
        console.warn("GPS acquire error:", err);
        setGpsStatus("error");
        setLatitude(37.7749);
        setLongitude(-122.4194);
        setLocationName("San Francisco Alpha Zone (Default)");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // 3. Web Speech API Voice Input
  const toggleVoiceRecording = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      // Fallback multilingual simulation if browser blocks Speech API
      if (!isRecording) {
        setIsRecording(true);
        setTimeout(() => {
          const sampleSpeech: Record<SupportedLanguage, string> = {
            en: "Emergency! Heavy flood waters rising fast, two people stranded on roof.",
            hi: "आपातकाल! बाढ़ का पानी तेजी से बढ़ रहा है, छत पर दो लोग फंसे हैं।",
            kn: "ತುರ್ತು ಪರಿಸ್ಥಿತಿ! ಪ್ರವಾಹದ ನೀರು ವೇಗವಾಗಿ ಏರುತ್ತಿದೆ, ಛಾವಣಿಯ ಮೇಲೆ ಇಬ್ಬರು ಸಿಲುಕಿಕೊಂಡಿದ್ದಾರೆ.",
            es: "¡Emergencia! El río se desbordó rápidamente, dos personas atrapadas en el techo.",
          };
          setContent((prev) => (prev ? `${prev} ${sampleSpeech[lang]}` : sampleSpeech[lang]));
          setIsRecording(false);
        }, 2200);
      } else {
        setIsRecording(false);
      }
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Dynamic locale mapping based on selected language
      const langLocaleMap: Record<SupportedLanguage, string> = {
        en: "en-US",
        hi: "hi-IN",
        kn: "kn-IN",
        es: "es-ES",
      };

      recognition.lang = langLocaleMap[lang] || "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err: any) {
      console.warn("Speech API start failed:", err);
      setIsRecording(false);
    }
  };

  // 4. Client-Side Image Compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setError(null);
      const compressed = await compressImage(file, 1280, 0.72);
      setCompressedImage(compressed);
    } catch (err: any) {
      setError("Failed to compress image: " + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  // 5. One-Tap Hazard Buttons Selection
  const handleSelectHazard = (type: HazardType) => {
    setSelectedHazard(type);
    const prefixes: Record<HazardType, Record<SupportedLanguage, string>> = {
      MEDICAL: {
        en: "[Medical Emergency]: ",
        hi: "[चिकित्सा आपातकाल]: ",
        kn: "[ವೈದ್ಯಕೀಯ ತುರ್ತುಸ್ಥಿತಿ]: ",
        es: "[Emergencia Médica]: ",
      },
      FIRE: {
        en: "[Active Fire]: ",
        hi: "[सक्रिय आग]: ",
        kn: "[ಬೆಂಕಿ ಅವಘಡ]: ",
        es: "[Incendio Activo]: ",
      },
      FLOOD: {
        en: "[Severe Flood]: ",
        hi: "[गंभीर बाढ़]: ",
        kn: "[ಭೀಕರ ಪ್ರವಾಹ]: ",
        es: "[Inundación Severa]: ",
      },
      COLLAPSE: {
        en: "[Structural Collapse]: ",
        hi: "[इमारत ढहना]: ",
        kn: "[ಕಟ್ಟಡ ಕುಸಿತ]: ",
        es: "[Colapso Estructural]: ",
      },
    };

    const prefix = prefixes[type][lang];
    if (!content.startsWith("[")) {
      setContent(prefix + content);
    }
  };

  // 6. Submit Report & Auto-Redirect to /track/[incidentId]
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Please describe the emergency incident.");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Acquiring GPS coordinates. Please wait or set manual pin.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      rawContent: content,
      latitude,
      longitude,
      locationName: locationName || undefined,
      reporterName: reporterName || "Citizen Caller",
      reporterPhone: reporterPhone || undefined,
      category: selectedHazard || undefined,
      mediaUrls: compressedImage ? [compressedImage.dataUrl] : [],
    };

    // If Offline or Simulated Offline Drop: Queue locally with resilience and alert citizen
    const effectivelyOffline = !navigator.onLine || isSimulatedOffline;
    if (effectivelyOffline) {
      enqueueOfflineReport(payload);
      setQueuedCount(getQueuedReports().length);
      setSubmitting(false);
      alert(
        isSimulatedOffline
          ? "🚨 SIMULATED CELLULAR DROP: Signal lost (0 bars)! Your distress report has been safely queued on this device and will auto-send the second signal is restored."
          : "Internet is currently offline. Your report has been saved to your device and queued for automatic transmission as soon as signal returns."
      );
      return;
    }

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit distress report");
      }

      // Automatically redirect citizen to Closed-Loop Citizen Feedback Tracker at /track/[incidentId]
      const targetId = data.incident?.id || data.trackingCode;
      router.push(`/track/${targetId}`);
    } catch (err: any) {
      // If network fetch fails due to unstable connection, queue offline as fallback
      enqueueOfflineReport(payload);
      setQueuedCount(getQueuedReports().length);
      setError(
        "Connection interrupted. Report has been queued locally and will auto-send once connectivity stabilizes."
      );
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl relative"
    >
      {/* Multilingual Selector Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm tracking-wide uppercase">
          <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
          <span>{t.title}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Offline Simulation Quick Toggle for Live Demos */}
          <button
            type="button"
            onClick={() => {
              const next = !isSimulatedOffline;
              setOfflineSimulation(next);
              setIsSimulatedOffline(next);
              if (!next) {
                handleRestoreConnection();
              }
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all border ${
              isSimulatedOffline
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow animate-pulse"
                : "bg-slate-950 text-slate-400 hover:text-amber-300 border-slate-800"
            }`}
            title="Toggle Simulated Disaster Cellular Drop (0 Bars)"
          >
            {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5 text-slate-950" /> : <Wifi className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isSimulatedOffline ? "0 Bars (Sim Active)" : "Sim Drop"}</span>
          </button>

          {/* Language Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {(
              [
                { code: "en", label: "English" },
                { code: "hi", label: "हिंदी" },
                { code: "kn", label: "ಕನ್ನಡ" },
                { code: "es", label: "Español" },
              ] as const
            ).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLang(item.code)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  lang === item.code
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Weak-Connection Resilience: "Queued Offline — Will Auto-Send" Banner */}
      {(!isOnline || isSimulatedOffline) && (
        <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-300 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>
                {isSimulatedOffline
                  ? "SIMULATED CELLULAR DROP (0 BARS) — QUEUE ACTIVE"
                  : t.offlineBanner}
              </span>
            </div>
            {isSimulatedOffline && (
              <button
                type="button"
                onClick={handleRestoreConnection}
                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 shadow"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Restore Signal & Sync</span>
              </button>
            )}
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            {isSimulatedOffline
              ? "Disaster blackout mode active. Any submitted emergency report will be securely saved into local IndexedDB/localStorage and automatically transmitted the instant cellular signal returns."
              : t.offlineBannerDesc}
          </p>
          {queuedCount > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-xs">
              <span className="font-mono text-amber-300 font-bold">
                ⚠️ {queuedCount} report(s) queued on this device
              </span>
              <button
                type="button"
                onClick={handleRestoreConnection}
                className="text-amber-400 underline hover:text-amber-300 font-mono text-[11px]"
              >
                Force Transmission Now &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {onlineSyncNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Wifi className="w-4 h-4 text-emerald-400 animate-bounce" />
          <span>{onlineSyncNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Fast Input: Large One-Tap Hazard Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
          {t.selectHazard}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Medical */}
          <button
            type="button"
            onClick={() => handleSelectHazard("MEDICAL")}
            className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${
              selectedHazard === "MEDICAL"
                ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30 scale-102"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <Ambulance className="w-6 h-6 text-emerald-400" />
            <span className="text-xs font-bold">{t.hazards.medical.name}</span>
          </button>

          {/* Fire */}
          <button
            type="button"
            onClick={() => handleSelectHazard("FIRE")}
            className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${
              selectedHazard === "FIRE"
                ? "bg-orange-600/20 border-orange-500 text-orange-300 ring-2 ring-orange-500/30 scale-102"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <Flame className="w-6 h-6 text-orange-400" />
            <span className="text-xs font-bold">{t.hazards.fire.name}</span>
          </button>

          {/* Flood */}
          <button
            type="button"
            onClick={() => handleSelectHazard("FLOOD")}
            className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${
              selectedHazard === "FLOOD"
                ? "bg-cyan-600/20 border-cyan-500 text-cyan-300 ring-2 ring-cyan-500/30 scale-102"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <Waves className="w-6 h-6 text-cyan-400" />
            <span className="text-xs font-bold">{t.hazards.flood.name}</span>
          </button>

          {/* Collapse */}
          <button
            type="button"
            onClick={() => handleSelectHazard("COLLAPSE")}
            className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${
              selectedHazard === "COLLAPSE"
                ? "bg-amber-600/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/30 scale-102"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <Building className="w-6 h-6 text-amber-400" />
            <span className="text-xs font-bold">{t.hazards.collapse.name}</span>
          </button>
        </div>
      </div>

      {/* Multilingual & Voice Emergency Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-200">
            {t.describeEmergency}
          </label>
          <button
            type="button"
            onClick={toggleVoiceRecording}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              isRecording
                ? "bg-rose-600 text-white animate-pulse"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-rose-400" />}
            <span>{isRecording ? t.listening : t.voiceButton}</span>
          </button>
        </div>

        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t.describePlaceholder}
          className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-4 text-slate-100 placeholder-slate-500 text-sm resize-none focus:outline-none transition-all"
          required
        />
      </div>

      {/* Automatic GPS Detection & Manual Pin Fallback */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>{t.gpsTitle}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={acquireGPS}
              className="text-xs text-cyan-400 hover:underline"
            >
              {t.reacquireGps}
            </button>
            <button
              type="button"
              onClick={() => setShowManualPin(!showManualPin)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <Sliders className="w-3 h-3" />
              <span>{t.toggleManualPin}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Latitude</span>
            <span className="font-mono text-slate-200 font-medium">
              {latitude !== null ? latitude.toFixed(6) : t.gpsAcquiring}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Longitude</span>
            <span className="font-mono text-slate-200 font-medium">
              {longitude !== null ? longitude.toFixed(6) : t.gpsAcquiring}
            </span>
          </div>
        </div>

        {/* Manual Pin Nudger Controls */}
        {showManualPin && (
          <div className="p-3 rounded-lg bg-slate-900/90 border border-cyan-800/40 space-y-2">
            <span className="text-[11px] font-mono text-cyan-400 block font-semibold">
              {t.gpsManual} (Nudge Coordinates)
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setLatitude((prev) => (prev !== null ? prev + 0.001 : 37.7749))}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                + Lat (North)
              </button>
              <button
                type="button"
                onClick={() => setLatitude((prev) => (prev !== null ? prev - 0.001 : 37.7749))}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                - Lat (South)
              </button>
              <button
                type="button"
                onClick={() => setLongitude((prev) => (prev !== null ? prev + 0.001 : -122.4194))}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                + Lng (East)
              </button>
              <button
                type="button"
                onClick={() => setLongitude((prev) => (prev !== null ? prev - 0.001 : -122.4194))}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                - Lng (West)
              </button>
            </div>
          </div>
        )}

        <input
          type="text"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder={t.locationPlaceholder}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Client-Side Image Compression & Upload */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>{t.photoEvidence}</span>
          </label>
          <span className="text-[10px] text-slate-500">Auto-compressed for low bandwidth</span>
        </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
        />

        {isCompressing && (
          <p className="text-xs text-cyan-400 animate-pulse">{t.compressing}</p>
        )}

        {compressedImage && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
            <img
              src={compressedImage.dataUrl}
              alt="Compressed Preview"
              className="w-14 h-14 object-cover rounded-lg border border-slate-700"
            />
            <div className="flex-1 text-xs space-y-0.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {t.compressedBadge}: {compressedImage.originalSizeFormatted} &rarr;{" "}
                  {compressedImage.compressedSizeFormatted} (-{compressedImage.reductionPercentage}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Optimized on client canvas &bull; Fast upload ready
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCompressedImage(null)}
              className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
              title="Remove image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Optional Contact Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">{t.reporterName}</label>
          <input
            type="text"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            placeholder="Elena Ramos"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">{t.reporterPhone}</label>
          <input
            type="tel"
            value={reporterPhone}
            onChange={(e) => setReporterPhone(e.target.value)}
            placeholder="+1 (555) 019-2834"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Submit Action */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-rose-950/60 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] disabled:opacity-50"
      >
        {submitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>{t.submittingButton}</span>
          </>
        ) : !isOnline ? (
          <>
            <WifiOff className="w-5 h-5 text-amber-300" />
            <span>{t.offlineSubmitButton}</span>
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            <span>{t.submitButton}</span>
          </>
        )}
      </button>
    </form>
  );
}
