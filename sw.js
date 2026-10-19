/* 결록 서비스 워커 — vite 플러그인(vite.config.ts)이 빌드 때 버전·캐시 목록 자리표시자를 채워 dist/sw.js 로 쓴다.
   - index.html(탐색): 네트워크 우선, 실패하면 캐시
   - 해시 에셋·글꼴·아이콘: 캐시 우선
   - 교차 출처(Pretendard CDN): stale-while-revalidate
   모든 경로는 SW 위치(scope) 기준 상대라 /history/ 같은 하위 경로에서도 동작한다. */
const VERSION = 'cf4d05b17b';
const CACHE = 'gyeollok-' + VERSION;
const CORE = ["assets/main-CwBy9BHC.css","assets/main-i9GHNXcF.js","assets/react-Ba_WErIa.js","assets/reality-B99NigKM.js","assets/reality-CnPg5bpj.css","cuts/ep0/e0-1.2x.webp","cuts/ep0/e0-1.webp","cuts/ep0/e0-2.2x.webp","cuts/ep0/e0-2.webp","cuts/ep0/e0-3.2x.webp","cuts/ep0/e0-3.webp","cuts/ep0/manifest.json","cuts/ep0/room-backdrop.webp","cuts/ep1/e1-1.2x.webp","cuts/ep1/e1-1.webp","cuts/ep1/e1-2.2x.webp","cuts/ep1/e1-2.webp","cuts/ep1/e1-3.2x.webp","cuts/ep1/e1-3.webp","cuts/ep1/e1-4.2x.webp","cuts/ep1/e1-4.webp","cuts/ep1/e1-5.2x.webp","cuts/ep1/e1-5.webp","cuts/ep1/e2-1.2x.webp","cuts/ep1/e2-1.webp","cuts/ep1/e2-2.2x.webp","cuts/ep1/e2-2.webp","cuts/ep1/e2-3.2x.webp","cuts/ep1/e2-3.webp","cuts/ep1/e2-4.2x.webp","cuts/ep1/e2-4.webp","cuts/ep1/e2-5.2x.webp","cuts/ep1/e2-5.webp","cuts/ep1/e3-1.2x.webp","cuts/ep1/e3-1.erased.2x.webp","cuts/ep1/e3-1.erased.webp","cuts/ep1/e3-1.webp","cuts/ep1/e3-2.2x.webp","cuts/ep1/e3-2.erased.2x.webp","cuts/ep1/e3-2.erased.webp","cuts/ep1/e3-2.webp","cuts/ep1/e3-3.2x.webp","cuts/ep1/e3-3.erased.2x.webp","cuts/ep1/e3-3.erased.webp","cuts/ep1/e3-3.webp","cuts/ep1/e3-4.2x.webp","cuts/ep1/e3-4.erased.2x.webp","cuts/ep1/e3-4.erased.webp","cuts/ep1/e3-4.webp","cuts/ep1/e3-5.2x.webp","cuts/ep1/e3-5.erased.2x.webp","cuts/ep1/e3-5.erased.webp","cuts/ep1/e3-5.webp","cuts/ep1/e4-1.2x.webp","cuts/ep1/e4-1.webp","cuts/ep1/e4-2.2x.webp","cuts/ep1/e4-2.webp","cuts/ep1/e4-3.2x.webp","cuts/ep1/e4-3.webp","cuts/ep1/e4-4.2x.webp","cuts/ep1/e4-4.webp","cuts/ep1/e4-5.2x.webp","cuts/ep1/e4-5.webp","cuts/ep1/manifest.json","cuts/ep1/room-backdrop.webp","fonts/Galmuri11-Bold.woff2","fonts/Galmuri11.woff2","fonts/myeongjo.css","fonts/myeongjo/OFL.txt","fonts/myeongjo/nanum-myeongjo-100-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-101-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-102-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-103-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-104-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-105-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-106-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-107-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-108-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-109-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-110-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-111-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-112-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-113-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-114-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-115-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-116-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-117-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-118-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-119-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-19-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-27-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-3-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-44-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-46-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-47-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-49-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-51-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-55-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-62-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-65-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-9-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-97-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-98-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-99-400-normal.woff2","fonts/myeongjo/nanum-myeongjo-latin-400-normal.woff2","icons/apple-touch-icon.png","icons/favicon-32.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","index.html","manifest.webmanifest"];
const LAZY = [];
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
