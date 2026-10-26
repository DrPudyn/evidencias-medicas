/* The production build replaces this exact list with emitted static assets. */
const STATIC_ASSETS = ["/favicon.svg", "/icons/icon-180.png", "/icons/icon-192.png", "/icons/icon-512.png"];
const CACHE_NAME = "em-static-dev";
const ALLOWED = new Set(STATIC_ASSETS);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("em-static-") && key !== CACHE_NAME)
      .map((key) => caches.delete(key)),
  )));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Exact build allowlist only: no documents, RSC, API, queries or external URLs.
  if (request.method !== "GET" || url.origin !== self.location.origin ||
      url.search || request.mode === "navigate" || !ALLOWED.has(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    const type = response.headers.get("content-type") || "";
    if (response.ok && !response.redirected && response.type === "basic" &&
        /^(text\/css|(?:text|application)\/javascript|image\/|font\/|application\/font)/i.test(type) &&
        !/no-store|private/i.test(response.headers.get("cache-control") || "")) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
