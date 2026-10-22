const CACHE_NAME = 'task-planner-cache-v3';
const urlsToCache = ['.', 'index.html', 'style.css', 'manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    }),
  );
});

// Drop caches of previous versions, otherwise they keep serving the old page
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))),
  );
});

// Network first, so a new version is picked up right away; the cache is only an offline fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isData = url.pathname.startsWith('/socket.io/') || url.pathname.startsWith('/api/');
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || isData) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
