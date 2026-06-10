//============================================================
//killer SW 
//============================================================

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ============================================================
// CONFIGURACIÓN
//============================================================
const CACHE_NAME = "vgv-cache-v4";

const urlsToCache = [
  "/VgvApp2.1.1/",
  "/VgvApp2.1.1/index.html",
  "/VgvApp2.1.1/style.css",
  "/VgvApp2.1.1/script_v2.js",
  "/VgvApp2.1.1/manifest.json",
  "/VgvApp2.1.1/icon-192.png",
  "/VgvApp2.1.1/icon-512.png"
];
self.skipWaiting();
self.clientsClaim();

// ============================================================
// INSTALL — Cachea archivos
// ============================================================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        urlsToCache.map(url =>
          cache.add(url).catch(err =>
            console.warn("No se pudo cachear:", url, err)
          )
        )
      );
    })
  );
  self.skipWaiting();
});

// ============================================================
// ACTIVATE — Limpia cachés viejos
// ============================================================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ============================================================
// FETCH — Cache-first
// ============================================================
self.addEventListener("fetch", event => {
  const req = event.request;

  // No interceptar POST
  if (req.method !== "GET") return;

  // No interceptar Apps Script
  if (req.url.includes("script.google.com/macros")) return;

  event.respondWith(
    caches.match(req).then(resp => resp || fetch(req))
  );
});
