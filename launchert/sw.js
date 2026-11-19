/* LauncherT Apple Standalone PWA Service Worker */
const CACHE_HTML = 'launchert-html-v2';
const CACHE_ASSETS = 'launchert-assets-v2';
const ALLOWED_CACHES = new Set([CACHE_HTML, CACHE_ASSETS]);

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pulse_feed.json',
  './wuxing_wallpaper_today.json',
  './assets/icon-180.png',
  './assets/icon-512.png',
  './assets/sprites/sprite_pinlei_sheet.webp',
  './assets/sprites/sprite_xinyuan_sheet.webp',
  './assets/sprites/sprite_dugu_sheet.webp',
  './assets/sprites/sprite_migu_sheet.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ASSETS).then((cache) => cache.addAll(PRECACHE_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !ALLOWED_CACHES.has(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

function isHtmlOrJsonRequest(request, url) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html') || accept.includes('application/json')) return true;
  return (
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname === '/'
  );
}

function isStaticAssetRequest(url) {
  return (
    url.pathname.includes('/assets/sprites/') ||
    url.pathname.includes('/assets/') ||
    /\.(webp|png|jpg|jpeg|svg|woff2?|css|js|mjs)$/i.test(url.pathname)
  );
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const shell = await caches.match(fallbackUrl);
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isHtmlOrJsonRequest(request, url)) {
    event.respondWith(
      networkFirst(request, CACHE_HTML, request.mode === 'navigate' ? './index.html' : undefined)
    );
    return;
  }

  if (isStaticAssetRequest(url)) {
    event.respondWith(cacheFirst(request, CACHE_ASSETS));
  }
});
