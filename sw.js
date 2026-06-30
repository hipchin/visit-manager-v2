// sw.js — 更新優先のService Worker
// 旧キャッシュを削除し、通常の通信はネットワークへ流す。

const CACHE_VERSION = 'visit-manager-v20260630-location1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  // GitHub Pages上の最新版確認を優先するため、ここではキャッシュ応答しない。
  return;
});
