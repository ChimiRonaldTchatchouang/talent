// Service worker : application installable et pages légères sur réseau lent.
// - Fichiers statiques (scripts, styles, polices, icônes) : gardés en cache après la première visite.
// - Pages : toujours chargées depuis le réseau ; sans réseau, une page « hors ligne » s'affiche.
// - Données (/api) : jamais mises en cache (informations personnelles et toujours à jour).
const VERSION = "bdt-v1";
const PAGE_HORS_LIGNE = "/hors-ligne";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.add(PAGE_HORS_LIGNE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const requete = e.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (requete.mode === "navigate") {
    e.respondWith(fetch(requete).catch(() => caches.match(PAGE_HORS_LIGNE)));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/")) {
    e.respondWith(
      caches.match(requete).then(
        (enCache) =>
          enCache ||
          fetch(requete).then((reponse) => {
            if (reponse.ok) {
              const copie = reponse.clone();
              caches.open(VERSION).then((c) => c.put(requete, copie));
            }
            return reponse;
          }),
      ),
    );
  }
});
