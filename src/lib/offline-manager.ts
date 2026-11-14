/**
 * Offline Emergency Queue Manager (Weak-Connection Resilience)
 * Persists reports in localStorage when connection drops and automatically
 * transmits them to the backend the instant connectivity returns.
 */

export interface QueuedEmergencyReport {
  id: string;
  timestamp: number;
  payload: {
    rawContent: string;
    latitude: number;
    longitude: number;
    locationName?: string;
    reporterName?: string;
    reporterPhone?: string;
    category?: string;
    mediaUrls?: string[];
  };
}

const STORAGE_KEY = "survixa_offline_emergency_queue";
const SIMULATION_STORAGE_KEY = "survixa_simulate_offline";

/**
 * Checks if presentation / test offline simulation mode is active
 */
export function isOfflineSimulationActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIMULATION_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Sets offline simulation mode and fires custom window event for instant UI reactive sync
 */
export function setOfflineSimulation(active: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIMULATION_STORAGE_KEY, active ? "true" : "false");
    window.dispatchEvent(
      new CustomEvent("survixa:offline_simulation", { detail: { active } })
    );
  } catch (err) {
    console.error("Failed to set offline simulation mode:", err);
  }
}

/**
 * Toggles offline simulation mode
 */
export function toggleOfflineSimulation(): boolean {
  const current = isOfflineSimulationActive();
  const next = !current;
  setOfflineSimulation(next);
  return next;
}

export function getQueuedReports(): QueuedEmergencyReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to read offline reports from localStorage:", err);
    return [];
  }
}

export function enqueueOfflineReport(payload: QueuedEmergencyReport["payload"]): QueuedEmergencyReport {
  const reports = getQueuedReports();
  const queuedItem: QueuedEmergencyReport = {
    id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    payload,
  };

  reports.push(queuedItem);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error("Failed to enqueue offline report into localStorage:", err);
  }

  return queuedItem;
}

export function removeQueuedReport(id: string): void {
  try {
    const reports = getQueuedReports().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error("Failed to remove queued report:", err);
  }
}

export async function flushOfflineQueue(
  onReportTransmitted?: (queuedId: string, result: any) => void
): Promise<{ successCount: number; failureCount: number }> {
  const reports = getQueuedReports();
  if (reports.length === 0) return { successCount: 0, failureCount: 0 };

  console.log(`🌐 [Offline Queue] Attempting to auto-send ${reports.length} queued emergency reports...`);
  let successCount = 0;
  let failureCount = 0;

  for (const report of reports) {
    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report.payload),
      });

      if (response.ok) {
        const data = await response.json();
        removeQueuedReport(report.id);
        successCount++;
        if (onReportTransmitted) {
          onReportTransmitted(report.id, data);
        }
      } else {
        failureCount++;
      }
    } catch (netErr) {
      console.warn(`[Offline Queue] Network still unavailable for report ${report.id}`);
      failureCount++;
      break; // stop trying remaining queue if still offline
    }
  }

  return { successCount, failureCount };
}
