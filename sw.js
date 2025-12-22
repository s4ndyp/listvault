const CACHE_NAME = 'listvault-v4';
const ASSETS = [
  'index.html',
  'app_styles.css',
  'offline_managerv2.js',
  'tailwind.js',
  'vue.global.js',
  'dexie.min.js',
 
];

// Installatie: Bestanden in de cache zetten
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activeren: Oude caches opruimen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch: Server vragen, maar bij geen internet uit de cache laden
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
