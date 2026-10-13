/**
 * 씬 전환 효과. 캔버스 CSS filter + 얇은 주사선 오버레이 + 미세한 가로 흔들림으로 '관측'의 질감을 낸다.
 * (네온/파티클 없음) observe: 어두워지고 탈채색 → 안정, return: 밝게 바래며 → 안정, fade: 단순 암전.
 */
export type TransitionKind = 'observe' | 'return' | 'fade';

interface Handles {
  overlay: HTMLDivElement;
  bands: HTMLDivElement[];
  timer: number | null;
}
const state = new WeakMap<HTMLCanvasElement, Handles>();

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function ensure(canvas: HTMLCanvasElement): Handles | null {
  const hit = state.get(canvas);
  if (hit) return hit;
  const parent = canvas.parentElement;
  if (!parent) return null;
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  const overlay = document.createElement('div');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText =
    'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 300ms ease;' +
    'background:repeating-linear-gradient(to bottom, rgba(10,10,14,0.22) 0px, rgba(10,10,14,0.22) 1px, transparent 1px, transparent 3px);overflow:hidden;';
  const bands: HTMLDivElement[] = [];
  for (let i = 0; i < 3; i++) {
    const b = document.createElement('div');
    b.style.cssText = 'position:absolute;left:0;right:0;height:3px;background:rgba(18,20,26,0.28);opacity:0;';
    overlay.appendChild(b);
    bands.push(b);
  }
  parent.appendChild(overlay);
  const h: Handles = { overlay, bands, timer: null };
  state.set(canvas, h);
  return h;
}

function startJitter(canvas: HTMLCanvasElement, h: Handles, amp: number): void {
  stopJitter(canvas, h);
  let tick = 0;
  h.overlay.style.opacity = '1';
  h.timer = window.setInterval(() => {
    tick++;
    const a = amp * (Math.random() < 0.35 ? 1 : 0);
    const dx = Math.round((Math.random() * 2 - 1) * a);
    canvas.style.transform = dx ? `translateX(${dx}px)` : '';
    const H = h.overlay.clientHeight || 400;
    h.bands.forEach((b, i) => {
      const on = Math.random() < 0.4;
      b.style.opacity = on ? '1' : '0';
      if (on) {
        b.style.top = `${Math.floor(Math.random() * H)}px`;
        b.style.height = `${2 + ((tick + i) % 4)}px`;
      }
    });
  }, 70);
}

function stopJitter(canvas: HTMLCanvasElement, h: Handles): void {
  if (h.timer !== null) {
    clearInterval(h.timer);
    h.timer = null;
  }
  canvas.style.transform = '';
  h.bands.forEach((b) => (b.style.opacity = '0'));
  h.overlay.style.opacity = '0';
}

const LOOK = {
  observeDark: 'brightness(0.22) saturate(0.15) contrast(1.1)',
  returnBright: 'brightness(1.8) saturate(0.2) contrast(0.9)',
  black: 'brightness(0)',
  normal: 'brightness(1) saturate(1) contrast(1)',
};

function setFilter(canvas: HTMLCanvasElement, filter: string, ms: number, ease = 'ease'): void {
  canvas.style.transition = ms > 0 ? `filter ${ms}ms ${ease}` : 'none';
  canvas.style.filter = filter;
}

/** 현재 화면을 전환 상태로 몰고 간다. 끝나면 resolve (이 시점에 씬을 교체한다). */
export async function transitionOut(canvas: HTMLCanvasElement, kind: TransitionKind): Promise<void> {
  const h = ensure(canvas);
  if (kind === 'fade') {
    setFilter(canvas, LOOK.black, 260);
    await wait(280);
    return;
  }
  if (h) startJitter(canvas, h, kind === 'observe' ? 3 : 2);
  if (kind === 'observe') {
    setFilter(canvas, LOOK.observeDark, 650, 'ease-in');
    await wait(700);
  } else {
    setFilter(canvas, LOOK.returnBright, 450, 'ease-in');
    await wait(500);
  }
}

/** 새 씬이 준비된 뒤 호출: 효과에서 서서히 안정된다. */
export async function transitionIn(canvas: HTMLCanvasElement, kind: TransitionKind): Promise<void> {
  const h = ensure(canvas);
  if (kind === 'fade') {
    setFilter(canvas, LOOK.normal, 320);
    await wait(340);
    canvas.style.filter = '';
    canvas.style.transition = '';
    return;
  }
  if (kind === 'observe') {
    setFilter(canvas, LOOK.observeDark, 0);
    void canvas.offsetWidth;
    setFilter(canvas, LOOK.normal, 1300, 'ease-out');
    await wait(900);
    if (h) stopJitter(canvas, h);
    await wait(500);
  } else {
    setFilter(canvas, LOOK.returnBright, 0);
    void canvas.offsetWidth;
    setFilter(canvas, LOOK.normal, 1000, 'ease-out');
    await wait(650);
    if (h) stopJitter(canvas, h);
    await wait(400);
  }
  canvas.style.filter = '';
  canvas.style.transition = '';
}

export function resetTransition(canvas: HTMLCanvasElement): void {
  const h = state.get(canvas);
  if (h) {
    stopJitter(canvas, h);
    h.overlay.remove();
    state.delete(canvas);
  }
  canvas.style.filter = '';
  canvas.style.transition = '';
}
