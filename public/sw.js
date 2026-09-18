const CACHE_NAME = 'mun-cache-v7';
const PRECACHE_ASSETS = [
  '/',
  '/registration',
  '/channels',
  '/past-events',
  '/team',
  '/stay-connected',
  '/venue',
  '/code-of-conduct',
  '/404',
  '/assets/Logos/25_logo.webp',
  '/assets/Logos/MUN_logo.webp',
  '/assets/Logos/RNS_MUN_2026.webp',
  '/assets/Logos/RNS_MUN_2026_dark.webp'
];

// Install Event - Pre-cache critical pages and logos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (e) => {
  // Ignore in localhost dev mode, API calls, non-GET requests, or third-party/vite internal requests
  if (
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1' ||
    e.request.method !== 'GET' ||
    !e.request.url.startsWith(self.location.origin) ||
    e.request.url.includes('/api/') ||
    e.request.url.includes('/@') ||
    e.request.url.includes('node_modules')
  ) {
    return;
  }

  // Network-first for HTML pages (navigation) to avoid hashed asset mismatches after deployments
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'))) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(e.request);
        })
    );
    return;
  }

  // Stale-while-revalidate for everything else (CSS, JS, Images, etc.)
  e.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(e.request).then((cachedResponse) => {
        const fetchPromise = fetch(e.request).then((networkResponse) => {
          // If valid response, update the cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback
          return cachedResponse;
        });

        // Return cached version immediately if exists, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
