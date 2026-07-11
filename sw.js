// sw.js — 更新優先のService Worker
// 旧キャッシュを削除し、通常の通信はネットワークへ流す。
// 新版が見つかった場合は、アプリ側の通知から SKIP_WAITING を送って反映する。

const CACHE_VERSION = 'visit-manager-v20260711-iosfix1';

self.addEventListener('install', event => {
  // 初回インストールは通常通り完了させる。
  // 更新時はアプリ側で「更新して再起動」を押した時だけ skipWaiting する。
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
