/**
 * 알림(토스트)·메신저 배너의 자리 — 머리글과 탭 대상을 가리지 않는 띠를 찾는다(QA_UX ux-05~08, UI_STYLE_GUIDE §2.3).
 * 머리글 아래부터 아래 막대 위까지 4px 씩 내려가며, 버튼·링크·도면 표시·시트 머리·말풍선·이름표·고정률 막대와 겹치지 않는 첫 자리를 고른다.
 * 그런 자리가 없으면 겹침이 가장 적은 자리. 좌표는 .app 기준 px(top).
 */
const HEADERS = '.vtop, .paperbar, .bar, .home-top, .chat-head';
/** 언제나 머리글로 치는 것(시트에 덮였다고 잘못 재도 그 위에 뜨지 않게 — QA_UX_R3 ux3-05) */
const ALWAYS_HEADERS = '.vtop, .paperbar';
/**
 * 피할 것: 탭 대상 + 읽어야 할 글(말풍선·컷 위 이름표) + 보상 연출(고정률 막대·복원 연출 [data-float-wait]) (QA_UX_R3 ux3-02~04, QA_FUN_R3 R3-8)
 */
const OBSTACLES =
  'button, a[href], [role="button"], input, textarea, .mk, .shead, .navbar, svg.plan, .fb, .bubble, .tagchip, .detail-note, .fixmeter, [data-float-wait], [data-float-avoid]';

interface R {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const visible = (r: DOMRect) => r.width > 0 && r.height > 0;

function overlap(a: R, b: R) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** el 을 놓을 top(px, .app 기준). avoid: 이미 놓인 다른 알림 */
export function placeFloat(el: HTMLElement, avoid: HTMLElement[] = []): number | null {
  // 재는 동안 알림 자신은 손가락 검사에서 빠진다(덮였는지 볼 때 자기를 맞히지 않게)
  const floats = [el, ...avoid];
  const prev = floats.map((f) => f.style.pointerEvents);
  floats.forEach((f) => (f.style.pointerEvents = 'none'));
  try {
    return measure(el, avoid);
  } finally {
    floats.forEach((f, i) => (f.style.pointerEvents = prev[i]!));
  }
}

function measure(el: HTMLElement, avoid: HTMLElement[]): number | null {
  const app = el.closest('.app') as HTMLElement | null;
  if (!app) return null;
  const ar = app.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  const h = er.height;
  /** 위에 떠 있는 층(시트·방 배경·인물 카드)에 덮였나 — 덮인 것은 지금 보이지도 눌리지도 않는다 */
  const covered = (o: Element, r: DOMRect) => {
    const cx = Math.min(Math.max(r.left + r.width / 2, ar.left + 1), ar.right - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, ar.top + 1), ar.bottom - 1);
    const top = document.elementFromPoint(cx, cy);
    return !!top && !o.contains(top) && !top.contains(o);
  };
  let headBottom = ar.top;
  for (const hd of app.querySelectorAll<HTMLElement>(HEADERS)) {
    const r = hd.getBoundingClientRect();
    if (!visible(r) || r.top > ar.top + 140 || (!hd.matches(ALWAYS_HEADERS) && covered(hd, r))) continue;
    headBottom = Math.max(headBottom, r.bottom);
  }
  let floor = ar.bottom;
  for (const nb of app.querySelectorAll<HTMLElement>('nav.navbar, .dock')) {
    const r = nb.getBoundingClientRect();
    if (visible(r) && r.top > ar.top + ar.height / 2) floor = Math.min(floor, r.top);
  }
  const obs: R[] = [];
  for (const o of app.querySelectorAll<HTMLElement>(OBSTACLES)) {
    if (el.contains(o) || o.contains(el) || avoid.some((a) => a.contains(o))) continue;
    const r = o.getBoundingClientRect();
    if (!visible(r)) continue;
    if (covered(o, r)) continue; // 덮인 것은 피하지 않는다
    obs.push(r);
  }
  for (const a of avoid) {
    const r = a.getBoundingClientRect();
    if (visible(r)) obs.push({ top: r.top - 4, bottom: r.bottom + 4, left: r.left, right: r.right });
  }
  // 위에서부터 찾되, 화면이 아래쪽을 원하면(data-float="bottom" — 인물 카드: 이름 아래는 읽을 글) 아래에서부터
  const fromBottom = !!app.querySelector('[data-float="bottom"]');
  const ys: number[] = [];
  for (let y = headBottom + 6; y + h <= floor - 4; y += 4) ys.push(y);
  if (fromBottom) ys.reverse();
  let best = { y: ys[0] ?? headBottom + 6, cost: Infinity };
  for (const y of ys) {
    const rect = { top: y, bottom: y + h, left: er.left, right: er.right };
    let cost = 0;
    for (const o of obs) cost += overlap(rect, o);
    if (cost === 0) return y - ar.top;
    if (cost < best.cost) best = { y, cost };
  }
  return best.y - ar.top;
}
