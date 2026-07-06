/* CaseCompass service worker — cache-first app shell for full offline use. */
'use strict';

const CACHE = 'casecompass-v1';
const ASSETS = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/data.js', 'js/store.js', 'js/engine.js', 'js/ui.js', 'js/views.js', 'js/app.js',
  'icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never intercept API calls (online AI mode) — and never cache them.
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit ||
      fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('index.html'))
    )
  );
});
