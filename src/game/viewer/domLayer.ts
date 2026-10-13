/**
 * 뷰어 위에 얹는 DOM 층(말풍선·웅얼거림·셔터 번쩍임·훼손 모자이크). Phaser 밖이라 한글이 또렷하다.
 * 모든 요소 pointer-events: none — 제스처는 아래 캔버스가 받는다.
 */
export interface BubbleSpec {
  npcId: string;
  /** 컨테이너 기준 CSS px, 머리 위 */
  x: number;
  y: number;
  /** 풍선 대사(없으면 웅얼거림만) */
  text: string | null;
  lineId: string | null;
  mumble: boolean;
  /** 0..1 — 화면 중심에서 멀수록 흐리게(웅얼거림 용) */
  weight: number;
}

interface Item {
  wrap: HTMLDivElement;
  bubble: HTMLDivElement;
  textEl: HTMLSpanElement;
  mumble: HTMLDivElement;
  lineId: string | null;
  bubbleOn: boolean;
  hideTimer: number;
}

const CSS = `
.vw-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:5}
.vw-item{position:absolute;left:0;top:0;will-change:transform}
.vw-bubble{position:absolute;left:0;bottom:0;transform:translate(-50%,0);width:max-content;max-width:min(176px,56vw);
 padding:5px 7px 6px;background:#25211eF2;color:#efe6cf;border:2px solid #6b6048;box-shadow:0 0 0 1px #0b0d12,0 3px 0 #0b0d12;
 font:500 12px/1.35 'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif;letter-spacing:-.01em;word-break:keep-all;
 opacity:0;transition:opacity .32s ease;text-align:left;border-radius:2px}
.vw-bubble.on{opacity:1}
.vw-bubble.act{color:#b9ae94;font-style:italic}
.vw-bubble:after{content:"";position:absolute;left:calc(50% + var(--tail,0px));bottom:-7px;width:6px;height:6px;margin-left:-3px;
 background:#25211e;border-right:2px solid #6b6048;border-bottom:2px solid #6b6048;transform:rotate(45deg) translateY(-1px);transform-origin:center}
.vw-text{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.vw-mumble{position:absolute;left:0;bottom:0;transform:translate(-50%,0);padding:1px 6px 3px;background:#25211eE0;border:1px solid #6b6048;
 font:700 14px/1 'Noto Sans KR',monospace;color:#dccfae;letter-spacing:1px;opacity:0;transition:opacity .3s ease}
.vw-mumble.on{opacity:.8;animation:vw-pulse 1.4s steps(4) infinite}
@keyframes vw-pulse{0%,100%{opacity:.35}50%{opacity:.85}}
.vw-flash{position:absolute;inset:0;background:#f4f1e6;opacity:0;pointer-events:none;z-index:9}
.vw-flash.go{animation:vw-flash .22s ease-out}
@keyframes vw-flash{0%{opacity:.5}100%{opacity:0}}
.vw-corrupt{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none;z-index:4;display:none}
@media (prefers-reduced-motion:reduce){.vw-mumble.on{animation:none;opacity:.7}.vw-flash.go{animation-duration:.01s}}
`;

let cssDone = false;
function ensureCss(): void {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
}

export class DomLayer {
  readonly root: HTMLDivElement;
  private items = new Map<string, Item>();
  private flash: HTMLDivElement;
  private corrupt: HTMLCanvasElement;
  private cctx: CanvasRenderingContext2D | null;
  private small: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D | null;
  private bands: { y: number; h: number; dx: number }[] = [];
  private bandAt = 0;
  corruptOn = false;

  constructor(private parent: HTMLElement) {
    ensureCss();
    this.corrupt = document.createElement('canvas');
    this.corrupt.className = 'vw-corrupt';
    this.corrupt.setAttribute('aria-hidden', 'true');
    this.cctx = this.corrupt.getContext('2d');
    this.small = document.createElement('canvas');
    this.sctx = this.small.getContext('2d');
    this.root = document.createElement('div');
    this.root.className = 'vw-layer';
    this.root.setAttribute('aria-live', 'off');
    this.flash = document.createElement('div');
    this.flash.className = 'vw-flash';
    this.flash.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.corrupt);
    parent.appendChild(this.root);
    parent.appendChild(this.flash);
  }

  /** 풍선/웅얼거림 갱신(매 프레임). 목록에 없는 인물은 내린다. */
  setBubbles(list: readonly BubbleSpec[]): void {
    const W = this.parent.clientWidth;
    const alive = new Set<string>();
    for (const b of list) {
      alive.add(b.npcId);
      let it = this.items.get(b.npcId);
      if (!it) it = this.make(b.npcId);
      it.wrap.style.transform = `translate(${Math.round(b.x)}px, ${Math.round(b.y)}px)`;
      it.wrap.dataset.npc = b.npcId;
      // 풍선
      const want = b.text !== null && b.lineId !== null;
      if (want) {
        window.clearTimeout(it.hideTimer);
        if (it.lineId !== b.lineId) {
          it.lineId = b.lineId;
          it.textEl.textContent = b.text;
          it.bubble.dataset.line = b.lineId!;
          it.bubble.classList.toggle('act', b.text!.startsWith('('));
        }
        if (!it.bubbleOn) {
          it.bubbleOn = true;
          it.bubble.classList.add('on');
        }
        // 가장자리에서 잘리지 않게 풍선만 옮기고, 꼬리는 인물 쪽을 가리킨다
        const bw = it.bubble.offsetWidth || 120;
        const half = bw / 2 + 6;
        const dx = Math.min(Math.max(b.x, half), W - half) - b.x;
        it.bubble.style.marginLeft = `${Math.round(dx)}px`;
        it.bubble.style.setProperty('--tail', `${Math.round(-dx)}px`);
        it.bubble.style.bottom = '8px';
      } else if (it.bubbleOn) {
        it.bubbleOn = false;
        it.bubble.classList.remove('on');
        const cur = it;
        cur.hideTimer = window.setTimeout(() => {
          if (!cur.bubbleOn) {
            cur.lineId = null;
            delete cur.bubble.dataset.line;
          }
        }, 380);
      }
      it.mumble.classList.toggle('on', b.mumble);
      it.mumble.style.opacity = b.mumble ? String(0.35 + 0.5 * b.weight) : '';
      it.mumble.style.bottom = '2px';
    }
    for (const [id, it] of this.items) {
      if (alive.has(id)) continue;
      it.bubble.classList.remove('on');
      it.mumble.classList.remove('on');
      it.bubbleOn = false;
      it.lineId = null;
      delete it.bubble.dataset.line;
      it.wrap.style.display = 'none';
    }
    for (const b of list) this.items.get(b.npcId)!.wrap.style.display = 'block';
  }

  private make(id: string): Item {
    const wrap = document.createElement('div');
    wrap.className = 'vw-item';
    const bubble = document.createElement('div');
    bubble.className = 'vw-bubble';
    bubble.setAttribute('role', 'status');
    const textEl = document.createElement('span');
    textEl.className = 'vw-text';
    bubble.appendChild(textEl);
    const mumble = document.createElement('div');
    mumble.className = 'vw-mumble';
    mumble.textContent = '…';
    mumble.setAttribute('aria-hidden', 'true');
    wrap.append(bubble, mumble);
    this.root.appendChild(wrap);
    const it: Item = { wrap, bubble, textEl, mumble, lineId: null, bubbleOn: false, hideTimer: 0 };
    this.items.set(id, it);
    return it;
  }

  /** 셔터 번쩍임 */
  doFlash(): void {
    this.flash.classList.remove('go');
    void this.flash.offsetWidth;
    this.flash.classList.add('go');
  }

  /**
   * 훼손 화면: 원본 캔버스를 작게 줄여 그린 뒤(모자이크) 픽셀 그대로 확대해 덮는다. 가로 띠가 가끔 밀려 나고, 탈채색·어둡게.
   * level 0..1. 0 이면 숨긴다. 렌더 직후(POST_RENDER)에 불러야 WebGL 캔버스도 읽힌다.
   */
  renderCorrupt(src: HTMLCanvasElement, level: number, now: number, still: boolean): void {
    const c = this.cctx;
    const s = this.sctx;
    if (!c || !s || level < 0.02) {
      if (this.corruptOn) {
        this.corrupt.style.display = 'none';
        this.corruptOn = false;
      }
      return;
    }
    const cssW = Math.max(1, this.parent.clientWidth);
    const cssH = Math.max(1, this.parent.clientHeight);
    const block = 1 + 6 * level; // CSS px 당 한 칸
    const w = Math.max(8, Math.round(cssW / block));
    const h = Math.max(8, Math.round(cssH / block));
    if (this.small.width !== w || this.small.height !== h) {
      this.small.width = w;
      this.small.height = h;
    }
    if (this.corrupt.width !== w || this.corrupt.height !== h) {
      this.corrupt.width = w;
      this.corrupt.height = h;
    }
    if (!this.corruptOn) {
      this.corrupt.style.display = 'block';
      this.corruptOn = true;
    }
    s.imageSmoothingEnabled = true;
    s.globalCompositeOperation = 'source-over';
    s.filter = `grayscale(${0.75 * level}) contrast(${1 - 0.18 * level}) brightness(${1 - 0.28 * level}) sepia(${0.25 * level})`;
    s.drawImage(src, 0, 0, w, h);
    s.filter = 'none';
    // 거친 입자(고정 수의 어두운/밝은 점)
    if (!still) {
      const n = Math.round(w * h * 0.035 * level);
      for (let i = 0; i < n; i++) {
        const v = Math.random() < 0.5 ? 20 : 200;
        s.fillStyle = `rgba(${v},${v},${v - 6},${0.12 + Math.random() * 0.2})`;
        s.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 1, 1);
      }
    }
    // 가로 띠 밀림
    if (!still && now - this.bandAt > 110) {
      this.bandAt = now;
      this.bands = [];
      const k = Math.random() < 0.45 ? 0 : 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < k; i++) {
        const bh = Math.max(1, Math.round(h * (0.02 + Math.random() * 0.08)));
        this.bands.push({ y: (Math.random() * (h - bh)) | 0, h: bh, dx: Math.round((Math.random() * 2 - 1) * w * 0.07) });
      }
    }
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, w, h);
    c.drawImage(this.small, 0, 0);
    for (const b of this.bands) {
      c.clearRect(0, b.y, w, b.h);
      c.drawImage(this.small, 0, b.y, w, b.h, b.dx, b.y, w, b.h);
      c.drawImage(this.small, 0, b.y, w, b.h, b.dx + (b.dx > 0 ? -w : w), b.y, w, b.h);
    }
    // 어두운 가장자리
    const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(10,12,16,0)');
    g.addColorStop(1, `rgba(10,12,16,${0.55 * level})`);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    this.corrupt.style.opacity = String(Math.min(1, level * 1.4));
  }

  /** 현재 화면의 작은 JPEG. 훼손 중이면 보이는 그대로(훼손된) 화면을 담는다. */
  thumb(src: HTMLCanvasElement, width = 240): string {
    try {
      const useCorrupt = this.corruptOn && this.corrupt.width > 0;
      const from = useCorrupt ? this.corrupt : src;
      const sw = from.width;
      const sh = from.height;
      if (!sw || !sh) return '';
      const w = Math.min(width, Math.max(1, Math.round(this.parent.clientWidth)));
      const h = Math.max(1, Math.round((w * (this.parent.clientHeight || sh)) / (this.parent.clientWidth || sw)));
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d');
      if (!ctx) return '';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(from, 0, 0, sw, sh, 0, 0, w, h);
      return cv.toDataURL('image/jpeg', 0.72);
    } catch {
      return '';
    }
  }

  destroy(): void {
    for (const it of this.items.values()) window.clearTimeout(it.hideTimer);
    this.items.clear();
    this.root.remove();
    this.flash.remove();
    this.corrupt.remove();
  }
}
