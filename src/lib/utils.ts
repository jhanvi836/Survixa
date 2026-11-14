import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSeverityColor(score: number): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  if (score >= 9) {
    return {
      bg: "bg-red-500/10 dark:bg-red-950/40",
      text: "text-red-600 dark:text-red-400 font-bold",
      border: "border-red-500/30",
      label: "Catastrophic (Critical 9-10)",
    };
  }
  if (score >= 7) {
    return {
      bg: "bg-orange-500/10 dark:bg-orange-950/40",
      text: "text-orange-600 dark:text-orange-400 font-semibold",
      border: "border-orange-500/30",
      label: "Severe (High 7-8)",
    };
  }
  if (score >= 4) {
    return {
      bg: "bg-amber-500/10 dark:bg-amber-950/40",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/30",
      label: "Moderate (4-6)",
    };
  }
  return {
    bg: "bg-emerald-500/10 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    label: "Low (1-3)",
  };
}

export function formatStatusStep(status: string): number {
  switch (status) {
    case "RECEIVED":
      return 1;
    case "VERIFIED":
      return 2;
    case "ASSIGNED":
      return 3;
    case "EN_ROUTE":
      return 4;
    case "RESOLVED":
      return 5;
    default:
      return 1;
  }
}

export function formatAgencyBadge(agency: string) {
  switch (agency) {
    case "FIRE":
      return { label: "Fire & Rescue", bg: "bg-orange-600 text-white" };
    case "MEDICAL":
      return { label: "Medical / EMS", bg: "bg-emerald-600 text-white" };
    case "POLICE":
      return { label: "Police / Tactical", bg: "bg-blue-600 text-white" };
    case "NGO":
      return { label: "NGO Relief", bg: "bg-purple-600 text-white" };
    case "COAST_GUARD":
      return { label: "Coast Guard", bg: "bg-cyan-600 text-white" };
    default:
      return { label: agency, bg: "bg-slate-600 text-white" };
  }
}
