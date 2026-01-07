// Luna Book Service Worker - Comprehensive Offline Support
const CACHE_NAME = 'luna-book-v14';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/pwa-192x192.png',
    '/pwa-512x512.png',
    // React build files will be cached dynamically
    // Monaco Editor
    'https://unpkg.com/monaco-editor@0.44.0/min/vs/loader.js',
    // Pyodide CDN
    'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js',
    'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.asm.js',
    'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.asm.wasm',
    'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/repodata.json',
    // Fonts
    'https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
];

self.addEventListener('install', (event) => {
    // Force immediate activation
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients immediately
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', (event) => {
    // Strategy: Cache First, then Network
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then((networkResponse) => {
                    // Cache new requests immediately (dynamic caching)
                    // only if it's a valid response and not a POST/API request
                    // Cache cached-capable responses (basic) OR CDN assets (cors)
                    // We specifically want to cache Pyodide from jsdelivr
                    const isCdn = event.request.url.includes('cdn.jsdelivr.net') || event.request.url.includes('pyodide');

                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }

                    // Allow basic (same-origin) or cors (CDN) if it's a valid response
                    if (networkResponse.type !== 'basic' && !isCdn) {
                        return networkResponse;
                    }

                    // Clone response because it's a stream
                    const responseToCache = networkResponse.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            // Don't cache WebSocket or API calls if distinguishable
                            if (!event.request.url.includes('/ws') && !event.request.url.includes('/api/') && !event.request.url.includes('/upload')) {
                                cache.put(event.request, responseToCache);
                            }
                        });

                    return networkResponse;
                });
            })
            .catch(() => {
                // Return a fallback page or nothing if offline and not in cache
                // For now, if we miss main page, we can't do much
                console.log('[Service Worker] Fetch failed (offline)');
            })
    );
});
