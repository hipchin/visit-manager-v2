// sw.js — 高速起動・更新両立型Service Worker
//
// 方針:
// - アプリ本体は端末キャッシュから即時表示する
// - バックグラウンドで最新版を取得し、次回表示用キャッシュを更新する
// - version.json は絶対にキャッシュせず、常にネットワークから確認する
// - Nominatim、OpenStreetMapタイル、Google Mapsはキャッシュ対象外
// - 更新の適用は既存仕様どおり「更新して再起動」操作で行う

const CACHE_VERSION = 'visit-manager-v20260823-visitcount1';
const CACHE_PREFIX = 'visit-manager-';

const APP_SHELL_URL = './';
const INDEX_URL = './index.html';

// 現在のindex.htmlが読み込むURLと一致させる。
const APP_SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css?v=20260823-visitcount1',
  './js/db.js?v=20260823-visitcount1',
  './js/tags.js?v=20260823-visitcount1',
  './js/ui.js?v=20260823-visitcount1',
  './js/app.js?v=20260823-visitcount1',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  // 1ファイルの取得失敗でService Worker全体の更新を失敗させない。
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      Promise.all(
        APP_SHELL_FILES.map(url =>
          fetch(new Request(url, { cache: 'reload' }))
            .then(response => {
              if (!response || !response.ok) return null;
              return cache.put(url, response.clone());
            })
            .catch(error => {
              console.warn('precache failed:', url, error);
              return null;
            })
        )
      )
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;

  const url = new URL(request.url);

  // 最新版確認はキャッシュすると更新検知が壊れるため、常にネットワークへ流す。
  if (url.origin === self.location.origin && url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-store' }))
    );
    return;
  }

  // 画面本体はキャッシュを即時表示し、裏で最新版へ更新する。
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event, request));
    return;
  }

  // 同一オリジンの静的ファイルを高速化する。
  if (url.origin === self.location.origin && isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithBackgroundRefresh(event, request));
    return;
  }

  // Leaflet CDNだけは2回目以降の起動を高速化する。
  // 地図タイルと住所検索APIは保存容量増大を避けるため対象外。
  if (
    url.origin === 'https://unpkg.com' &&
    url.pathname.includes('/leaflet@1.9.4/')
  ) {
    event.respondWith(cacheFirstWithBackgroundRefresh(event, request));
  }
});

function isStaticAsset(pathname) {
  return /\.(?:css|js|json|png|jpg|jpeg|svg|webp|ico)$/i.test(pathname);
}

async function handleNavigation(event, request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached =
    await cache.match(APP_SHELL_URL, { ignoreSearch: true }) ||
    await cache.match(INDEX_URL, { ignoreSearch: true });

  const networkPromise = fetch(new Request(request, { cache: 'no-store' }))
    .then(async response => {
      if (response && response.ok) {
        // クエリ付きURLをそのまま保存せず、起動用の固定キーへ保存する。
        await cache.put(APP_SHELL_URL, response.clone());
      }
      return response;
    });

  if (cached) {
    event.waitUntil(networkPromise.catch(error => {
      console.warn('navigation refresh failed', error);
    }));
    return cached;
  }

  try {
    return await networkPromise;
  } catch (error) {
    const fallback = await cache.match(INDEX_URL, { ignoreSearch: true });
    if (fallback) return fallback;
    throw error;
  }
}

async function cacheFirstWithBackgroundRefresh(event, request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  const networkPromise = fetch(new Request(request, { cache: 'no-store' }))
    .then(async response => {
      if (response && (response.ok || response.type === 'opaque')) {
        await cache.put(request, response.clone());
      }
      return response;
    });

  if (cached) {
    event.waitUntil(networkPromise.catch(error => {
      console.warn('asset refresh failed:', request.url, error);
    }));
    return cached;
  }

  return networkPromise;
}
