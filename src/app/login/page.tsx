"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Radio,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  LogIn,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Flame,
  Ambulance,
  Compass,
  Key,
  BadgeCheck,
  LifeBuoy,
} from "lucide-react";
import { DEMO_ACCOUNTS } from "@/lib/auth";

type LoginRole = "COMMANDER" | "CITIZEN";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectUrl = searchParams.get("redirect") || "";
  const errorParam = searchParams.get("error");

  // Selected Role Tab: "COMMANDER" (Default) vs "CITIZEN"
  const [selectedRole, setSelectedRole] = useState<LoginRole>("COMMANDER");

  // Form State
  const [email, setEmail] = useState("commander@survixa.org");
  const [password, setPassword] = useState("Command@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Surface session error banners if redirected by middleware
  useEffect(() => {
    if (errorParam === "session_required") {
      setErrorMessage("Commander session required. Please authenticate to access the Common Operating Picture.");
    } else if (errorParam === "unauthorized_role") {
      setErrorMessage("Access Restricted: Citizen accounts cannot enter Tactical Command. Please log in with Commander credentials.");
    }
  }, [errorParam]);

  // Handle Role Switch: Automatically populate relevant demo credentials for smooth presentation testing
  const handleRoleChange = (role: LoginRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (role === "COMMANDER") {
      setEmail("commander@survixa.org");
      setPassword("Command@123");
    } else {
      setEmail("citizen@survixa.org");
      setPassword("Citizen@123");
    }
  };

  // Quick Demo Account Auto-Fill
  const handleQuickFill = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.plainPassword);
    if (acc.role === "COMMANDER" || acc.role === "DISPATCHER") {
      setSelectedRole("COMMANDER");
    } else {
      setSelectedRole("CITIZEN");
    }
    setErrorMessage(null);
  };

  // Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          expectedRole: selectedRole,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed.");
      }

      setSuccessMessage(data.message || "Authentication successful!");

      // Role-Based Redirection
      setTimeout(() => {
        if (redirectUrl) {
          router.push(redirectUrl);
        } else if (data.redirectTo) {
          router.push(data.redirectTo);
        } else {
          router.push(selectedRole === "COMMANDER" ? "/command" : "/report");
        }
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to log in. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand Badge Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 shadow-xl shadow-rose-950/60 border border-rose-500/30">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          <span>SURVIXA GATEWAY</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            SECURE ACCESS
          </span>
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          AI-Powered Unified Disaster Response Platform &bull; Breaking Agency Silos
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 backdrop-blur-sm relative">
        {/* Role Selection Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => handleRoleChange("COMMANDER")}
            className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              selectedRole === "COMMANDER"
                ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-950/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Commander / ICS</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange("CITIZEN")}
            className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              selectedRole === "CITIZEN"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Citizen Portal</span>
          </button>
        </div>

        {/* Selected Role Info Banner */}
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            selectedRole === "COMMANDER"
              ? "bg-rose-950/40 border-rose-500/30 text-rose-300"
              : "bg-cyan-950/40 border-cyan-500/30 text-cyan-300"
          }`}
        >
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-1.5">
              {selectedRole === "COMMANDER" ? (
                <>
                  <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span>Joint Command Center Access</span>
                </>
              ) : (
                <>
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Citizen Distress & Tracking Access</span>
                </>
              )}
            </div>
            <p className="text-[11px] opacity-80">
              {selectedRole === "COMMANDER"
                ? "Directs to /command: Multi-agency live map, priority queue, dispatch drawer."
                : "Directs to /report: Multilingual intake, offline resilience, and live tracking."}
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
            {selectedRole === "COMMANDER" ? "TIER 1" : "PUBLIC"}
          </span>
        </div>

        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in-50">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Authentication Error</span>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Notification Alert */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage} Redirecting...</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Official Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@agency.org"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Security Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
              loading
                ? "bg-slate-800 text-slate-400 cursor-wait"
                : selectedRole === "COMMANDER"
                ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-950/50 hover:shadow-rose-900/60"
                : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-950/50 hover:shadow-cyan-900/60"
            }`}
          >
            {loading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Authenticate & Access {selectedRole === "COMMANDER" ? "Command Center" : "Portal"}</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Preset Bar */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono flex items-center gap-1 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              One-Click Demo Profiles:
            </span>
            <span className="text-[10px] text-slate-500">Tap to load</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill(DEMO_ACCOUNTS[0])}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/40 text-left transition-all group"
            >
              <div className="font-bold text-rose-400 font-mono text-[11px] flex items-center justify-between">
                <span>Commander</span>
                <BadgeCheck className="w-3 h-3 text-rose-500" />
              </div>
              <div className="text-[10px] text-slate-400 truncate">Chief S. Jenkins</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill(DEMO_ACCOUNTS[2])}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
            >
              <div className="font-bold text-cyan-400 font-mono text-[11px] flex items-center justify-between">
                <span>Citizen</span>
                <BadgeCheck className="w-3 h-3 text-cyan-500" />
              </div>
              <div className="text-[10px] text-slate-400 truncate">Elena Rostova</div>
            </button>
          </div>
        </div>

        {/* Guest Citizen Direct Link */}
        <div className="pt-2 text-center text-xs text-slate-400">
          <span>In acute life distress right now? </span>
          <Link
            href="/report"
            className="text-rose-400 hover:text-rose-300 font-bold underline font-mono ml-1"
          >
            Emergency Quick Intake &rarr;
          </Link>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-3">
        <Link href="/" className="hover:text-slate-300 transition-colors">
          Home
        </Link>
        <span>&bull;</span>
        <Link href="/report" className="hover:text-slate-300 transition-colors">
          Citizen Portal
        </Link>
        <span>&bull;</span>
        <Link href="/command" className="hover:text-slate-300 transition-colors">
          Command Center
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Ambience Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="text-center py-24 space-y-4">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Loading Survixa Gateway...</p>
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
