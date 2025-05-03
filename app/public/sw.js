// Service Worker for Bookmarkeddit PWA
const CACHE_NAME = "bookmarkeddit-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/src/assets/images/logo.svg",
  "/src/assets/images/logo_white.svg",
  "/src/assets/images/favicon/favicon.svg",
];

// Install event - cache initial resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache first, then network
self.addEventListener("fetch", (event) => {
  // Skip for non-GET requests or cross-origin requests
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  // Skip caching for API requests
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("oauth.reddit.com")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }

      // Clone the request as it can only be used once
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check for valid response
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Clone the response as it can only be used once
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Handle add to home screen banner display
self.addEventListener("beforeinstallprompt", (event) => {
  // Stash the event so it can be triggered later
  self.deferredPrompt = event;
});
