// Service worker for offline use of the Marian Faith chant tools.
// Strategy:
//   - navigations (HTML pages): network-first, fall back to cache, then to a cached page,
//     so the app opens even with no internet but still updates when online.
//   - other same-origin files (JS, CSS, fonts, the Swahili/psalm/gabc data fetched on demand):
//     stale-while-revalidate -- serve the cached copy instantly (works offline) and refresh it
//     from the network in the background.
//   - cross-origin requests (Google Analytics, the Source & Summit PDF server): straight to the
//     network, never cached, and a failure offline is harmless (those features just need internet).
// Bump CACHE_VERSION to force old caches to be discarded after a big change.
var CACHE_VERSION = 'mfct-v1';
var PRECACHE = [
  'propers.html',
  'index.html',
  'manifest.webmanifest',
  'icon/icon-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      // cache individually so one missing file doesn't abort the whole install
      return Promise.all(PRECACHE.map(function(url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k){ return k !== CACHE_VERSION; })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var req = event.request;
  if(req.method !== 'GET') return; // don't touch the PDF POST etc.

  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;
  if(!sameOrigin) return; // let Analytics / Source & Summit go straight to the network

  // Page navigations: try the network first so updates show, fall back to cache offline.
  if(req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function(res) {
        var copy = res.clone();
        caches.open(CACHE_VERSION).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function() {
        return caches.match(req).then(function(hit) {
          return hit || caches.match('propers.html');
        });
      })
    );
    return;
  }

  // Everything else same-origin: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then(function(cached) {
      var network = fetch(req).then(function(res) {
        if(res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
