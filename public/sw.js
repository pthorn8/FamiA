// public/sw.js
// Enkel service worker som cachar appens skal så den fungerar offline.
const CACHE = "familjeappen-v1";
const SKELETON = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SKELETON).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skicka Firebase/Firestore-anrop direkt till nätverket
  if (
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseapp.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("identitytoolkit") ||
    url.hostname.includes("firestore") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Nätverk först, fall tillbaka till cache
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp.ok && url.origin === self.location.origin) {
          const clone = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
  );
});
