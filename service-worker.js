const CACHE_NAME = "vgv-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Instalar SW
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activar SW
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Interceptar SOLO GET y SOLO archivos estáticos
self.addEventListener("fetch", event => {
  const req = event.request;

  // No interceptar POST
  if (req.method !== "GET") return;

  // No interceptar llamadas a Apps Script
  if (req.url.includes("script.google.com/macros")) return;

  // Cache-first para archivos estáticos
  event.respondWith(
    caches.match(req).then(resp => resp || fetch(req))
  );
});
