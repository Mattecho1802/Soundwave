const CACHE_NAME = "soundwave-shell-v1";
const APP_SHELL = ["./", "./index.html"];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      try { await cache.add(path); } catch (_) { /* GitHub Pages may redirect the root; index.html is the fallback. */ }
    }));
    self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("soundwave-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Cache the app page so the site can reopen offline after at least one online visit.
  if (url.origin === self.location.origin && (request.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/"))) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch (_) {
        return (await cache.match(request)) || (await cache.match("./index.html")) || Response.error();
      }
    })());
    return;
  }
  // Cache the Supabase client script after its first successful network fetch.
  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("@supabase/supabase-js")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === "opaque")) cache.put(request, response.clone());
        return response;
      } catch (_) { return (await cache.match(request)) || Response.error(); }
    })());
  }
});
