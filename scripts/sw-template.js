/* 결록 서비스 워커 — vite 플러그인(vite.config.ts)이 빌드 때 버전·캐시 목록 자리표시자를 채워 dist/sw.js 로 쓴다.
   - index.html(탐색): 네트워크 우선, 실패하면 캐시
   - 해시 에셋·글꼴·아이콘: 캐시 우선
   - 교차 출처(Pretendard CDN): stale-while-revalidate
   모든 경로는 SW 위치(scope) 기준 상대라 /history/ 같은 하위 경로에서도 동작한다. */
const VERSION = '__VERSION__';
const CACHE = 'gyeollok-' + VERSION;
const CORE = __CORE__;
const LAZY = __LAZY__;
const scopeUrl = new URL(self.registration.scope);
const abs = (p) => new URL(p, scopeUrl).href;

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE.map(abs));
      // 큰 지연 청크(관측 뷰어 등)는 설치를 막지 않고 뒤에서 받아 둔다(오프라인 대비).
      Promise.allSettled(LAZY.map((p) => cache.add(abs(p))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith('gyeollok-') && k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.searchParams.get('test') === '1') return; // 테스트 흐름은 항상 네트워크
  if (url.origin !== location.origin) {
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net/.test(url.host)) e.respondWith(swr(req));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req));
    return;
  }
  e.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(abs('./index.html'), res.clone());
    return res;
  } catch {
    return (await cache.match(abs('./index.html'))) || Response.error();
  }
}
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}
async function swr(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const net = fetch(req)
    .then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || net;
}
