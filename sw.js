/* 漢字ラッシュ：オフラインでも遊べるようにするためのファイル
   index.html を更新したら、下の VERSION の数字も1つ上げてください。 */
const VERSION = 'v0.3';
const CACHE = 'kanji-rush-' + VERSION;
const FONT_CACHE = 'kanji-rush-fonts';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ページ本体：まずネットから最新版を取り、だめならキャッシュ（更新がすぐ届く）
  if (req.mode === 'navigate'){
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // フォント：キャッシュを先に使い、裏で更新
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    e.respondWith(
      caches.open(FONT_CACHE).then(c => c.match(req).then(hit => {
        const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
    return;
  }

  // アイコンなど：キャッシュ優先
  if (url.origin === location.origin){
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
