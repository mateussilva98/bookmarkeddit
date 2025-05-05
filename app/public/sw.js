// Service Worker for Bookmarkeddit PWA
const CACHE_NAME = "bookmarkeddit-cache-v2"; // Incremented version number
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
];

// Skip waiting to force activation of the service worker
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Install event - cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients as soon as activated
        console.log("Service worker activated and controlling all clients");
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener("fetch", (event) => {
  // Development mode bypass for localhost
  if (
    self.location.hostname === "localhost" ||
    self.location.hostname === "127.0.0.1"
  ) {
    // For localhost, always go to network first, then update cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response
          const responseToCache = response.clone();

          // Cache the fetched response
          if (
            response.ok &&
            response.type === "basic" &&
            !event.request.url.includes("/api/")
          ) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Production behavior
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          // Fetch a fresh version in the background to update the cache
          fetch(event.request)
            .then((freshResponse) => {
              if (
                freshResponse &&
                freshResponse.ok &&
                freshResponse.type === "basic" &&
                !event.request.url.includes("/api/")
              ) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, freshResponse.clone());
                });
              }
            })
            .catch(() => {
              // Ignore fetch errors
            });

          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            // Don't cache API requests
            if (!event.request.url.includes("/api/")) {
              cache.put(event.request, responseToCache);
            }
          });

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, serve offline page
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
      })
  );
});
