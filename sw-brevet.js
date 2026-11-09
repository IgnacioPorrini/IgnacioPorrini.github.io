// Service worker de la app Brevet: guarda la app para usarla sin conexión.
const CACHE = "brevet-v1";
const SHELL = [
  "/cuestionario-brevet.html",
  "/cuestionario-brevet.html?fuente=app",
  "/apps/brevet/manifest.webmanifest",
  "/apps/brevet/icon-192.png",
  "/apps/brevet/icon-512.png",
  "/favicon.ico"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("brevet-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // La página: primero la red (para recibir correcciones), si no hay conexión, la copia guardada.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match("/cuestionario-brevet.html"))));
    return;
  }
  // Tipografías e íconos: la copia guardada y, en segundo plano, se actualiza.
  if (url.origin === location.origin || url.host.endsWith("fonts.googleapis.com") || url.host.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
