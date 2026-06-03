// ============================================================
// BLOQUE 1: CONFIGURACIÓN — Nombre del caché y archivos a guardar
// ============================================================
const CACHE_NAME = "vgv-cache-v2"; // Sube versión para forzar actualización

const urlsToCache = [
  "/VgvApp2.1.1/",
  "/VgvApp2.1.1/index.html",
  "/VgvApp2.1.1/style.css",
  "/VgvApp2.1.1/script_v2.js",
  "/VgvApp2.1.1/manifest.json",
  "/VgvApp2.1.1/icon-192.png",
  "/VgvApp2.1.1/icon-512.png"
];

// ============================================================
// BLOQUE 2: INSTALL — Guarda archivos en caché al instalar el SW
// ============================================================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        urlsToCache.map(url =>
          cache.add(url).catch(err => console.warn("No se pudo cachear:", url, err))
        )
      );
    })
  );
  self.skipWaiting(); // Activa el SW inmediatamente sin esperar reload
});


// ============================================================
// BLOQUE 3: ACTIVATE — Elimina cachés antiguos y toma control
// ============================================================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim()) // Toma control de pestañas abiertas
  );
});

// ============================================================
// BLOQUE 4: FETCH — Intercepta peticiones y responde desde caché
// ============================================================
self.addEventListener("fetch", event => {
  const req = event.request;

  // No interceptar peticiones POST
  if (req.method !== "GET") return;

  // No interceptar llamadas a Google Apps Script (backend)
  if (req.url.includes("script.google.com/macros")) return;

  // Cache-first: responde desde caché, si no existe va a la red
  event.respondWith(
    caches.match(req).then(resp => resp || fetch(req))
  );
});
