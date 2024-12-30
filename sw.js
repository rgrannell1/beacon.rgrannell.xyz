const CACHE_NAME = "sw-cache";
const CACHEABLE_RESOURCES = [
  "/icons/android-chrome-192x192.png",
  "/icons/android-chrome-512x512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-16x16.png",
  "/icons/favicon-32x32.png",
  "/favicon.ico",
];

const UNCACHEABLE_RESOURCES = [];

self.addEventListener("install", function (event) {
  // -- on install, cache every cacheable resource explicity listed.

  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        CACHEABLE_RESOURCES.map((resource) => cache.add(resource)),
      );
    }),
  );
});

self.addEventListener("fetch", function (event) {
  const url = event.request.url;

  // -- do nothing for uncacheable resources
  for (const resource of UNCACHEABLE_RESOURCES) {
    if (url.includes(resource)) {
      return;
    }
  }

  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      }
      return fetch(event.request)
        .then(function (networkResponse) {
          return caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
    }),
  );
});
