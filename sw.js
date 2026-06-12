// ═══════════════════════════════════════════════════
// Service Worker — Skaner Nagrobków GPS
// Cache-first dla plików lokalnych, network-first dla API
// ═══════════════════════════════════════════════════

var CACHE_NAME = 'skaner-nagrobkow-v2';

// Pliki do cache'owania od razu przy instalacji
var PRECACHE_FILES = [
  './nagrobki.html',
  './exif.min.js',
  './piexif.min.js',
  './manifest.json'
];

// ── INSTALL — cache'uj pliki statyczne ──
self.addEventListener('install', function(event) {
  console.log('[SW] Instaluję service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Cache otwarty, dodaję pliki:', PRECACHE_FILES);
      return cache.addAll(PRECACHE_FILES);
    }).then(function() {
      // Od razu aktywuj (nie czekaj na zamknięcie starych kart)
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE — wyczyść stare cache'e ──
self.addEventListener('activate', function(event) {
  console.log('[SW] Aktywuję service worker...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          console.log('[SW] Usuwam stary cache:', name);
          return caches.delete(name);
        })
      );
    }).then(function() {
      // Przejmij kontrolę nad wszystkimi kartami
      return self.clients.claim();
    })
  );
});

// ── FETCH — strategia cache-first dla lokalnych, network-first dla API ──
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // API calls (OpenAI, Gemini, Google Sheets, Cloudflare Worker) — zawsze sieć
  if (
    url.hostname === 'api.openai.com' ||
    url.hostname === 'generativelanguage.googleapis.com' ||
    url.hostname === 'script.google.com' ||
    url.hostname.endsWith('.workers.dev')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Wszystko inne — cache-first (szybko z pamięci, fallback na sieć)
  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Zwróć z cache, ale w tle odśwież (stale-while-revalidate)
        var fetchPromise = fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            var responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(function() {
          // Sieć niedostępna — to OK, mamy cache
        });
        return cachedResponse;
      }

      // Nie ma w cache — pobierz z sieci i zapisz
      return fetch(event.request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
