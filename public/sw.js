/**
 * Survixa Progressive Web App Service Worker
 * Weak-Connection & Disaster Outage Caching Engine
 */

const CACHE_NAME = "survixa-offline-v1";
const OFFLINE_URL = "/offline.html";

// Critical app shell assets to pre-cache during service worker installation
const PRECACHE_ASSETS = [
  "/",
  "/report",
  "/offline.html",
  "/manifest.json",
  "/icons/icon.svg",
];

// 1. Install Event: Pre-cache emergency portal shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("🛡️ [Survixa ServiceWorker] Pre-caching critical disaster assets...");
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn("⚠️ [Survixa ServiceWorker] Failed to cache some initial assets:", err);
      }
      return self.skipWaiting();
    })
  );
});

// 2. Activate Event: Clean up stale caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🧹 [Survixa ServiceWorker] Removing outdated cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Intelligent multi-tier caching strategy for disaster resilience
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // A. Pass through all WebSocket, Socket.io, and API requests directly
  // Client-side IndexedDB/localStorage handles offline queuing for emergency reports
  if (
    url.pathname.startsWith("/socket.io") ||
    url.pathname.startsWith("/api/") ||
    request.method !== "GET"
  ) {
    return;
  }

  // B. Navigation Requests (Citizen Portal & Dashboard Pages)
  // Strategy: Network-First with 2500ms timeout fallback to Cache (Weak-Connection Resilience)
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirstWithTimeout(request, 2500).catch(async () => {
        console.log("📡 [Survixa ServiceWorker] Weak signal or offline: Serving cached page...");
        const cache = await caches.open(CACHE_NAME);
        // Try to serve requested page from cache (e.g. /report)
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;

        // If specific page isn't in cache, serve emergency intake shell or offline standby
        const reportCached = await cache.match("/report");
        if (reportCached) return reportCached;

        const offlineFallback = await cache.match(OFFLINE_URL);
        return offlineFallback || new Response("Survixa Offline - Reconnecting...", {
          headers: { "Content-Type": "text/html" }
        });
      })
    );
    return;
  }

  // C. Static Assets (_next/static, css, js, fonts, images)
  // Strategy: Stale-While-Revalidate (Instant render with background refresh)
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons/") ||
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // D. Default fallback for other GET requests
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

/**
 * Network-First fetch with configurable timeout in milliseconds.
 * If cellular signal is too weak (takes > timeout ms), it aborts and fails over to cache.
 */
function networkFirstWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new Error("Network timed out under weak connection"));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        if (!timedOut) {
          // Cache successful response for future offline use
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          resolve(response);
        }
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
