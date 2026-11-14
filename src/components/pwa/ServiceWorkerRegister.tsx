"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("🛡️ [Survixa PWA] Service Worker registered successfully with scope:", registration.scope);

            // Handle updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === "installed") {
                    if (navigator.serviceWorker.controller) {
                      console.log("🔄 [Survixa PWA] New disaster resilience cache available. Content updated in background.");
                    } else {
                      console.log("✅ [Survixa PWA] Offline disaster caching is ready for use.");
                    }
                  }
                };
              }
            };
          })
          .catch((error) => {
            console.warn("⚠️ [Survixa PWA] Service Worker registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
