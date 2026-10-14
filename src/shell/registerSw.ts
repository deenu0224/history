/** 서비스 워커 등록. 프로덕션 전용, ?test=1 이면 등록하지 않고 남아 있는 등록은 해제한다. */
export function shouldRegisterSw(opts: { prod: boolean; search: string; hasSw: boolean }): boolean {
  if (!opts.prod || !opts.hasSw) return false;
  return new URLSearchParams(opts.search).get('test') !== '1';
}

export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const search = location.search;
  if (new URLSearchParams(search).get('test') === '1') {
    void navigator.serviceWorker
      .getRegistrations()
      .then((rs) => rs.forEach((r) => void r.unregister()))
      .catch(() => {});
    return;
  }
  if (!shouldRegisterSw({ prod: import.meta.env.PROD, search, hasSw: true })) return;
  window.addEventListener('load', () => {
    // BASE_URL 은 './' — 문서 기준 상대 경로라 /history/ 하위에서도 같은 폴더의 sw.js 를 가리킨다.
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
