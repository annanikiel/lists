const CACHE = 'lists-v8';

const FILES = [
  './',
  'css/app.css',
  'html/list.html',
  'html/shopping.html',
  'js/store.js',
  'js/list.js',
  'js/shopping.js',
  'data/tags.json',
  'data/shopping-tags.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
