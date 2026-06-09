const CACHE_NAME = "vgv-cache-v3";

const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/script_v2.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

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
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;

  if (req.method !== "GET") return;
  if (req.url.includes("script.google.com/macros")) return;

  event.respondWith(
    caches.match(req).then(resp => resp || fetch(req))
  );
});

