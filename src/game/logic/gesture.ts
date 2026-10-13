/**
 * 포인터 제스처 상태기계(순수). DOM 이벤트를 받아 팬/핀치/탭/더블탭/플링 콜백으로 바꾼다.
 * 좌표·속도는 CSS px, 시간은 ms.
 *  - 한 손가락: 슬롭(10px)을 넘으면 팬, 안 넘고 떼면 탭. 두 번째 탭이 320ms·32px 안이면 더블탭(탭 콜백 대신).
 *  - 두 손가락: 핀치(배율 비 + 중심 이동). 하나를 떼면 남은 손가락으로 계속 팬(탭 아님).
 */
export interface GestureHandlers {
  pan(dx: number, dy: number): void;
  pinch(ratio: number, cx: number, cy: number, dcx: number, dcy: number): void;
  tap(x: number, y: number): void;
  doubleTap(x: number, y: number): void;
  fling(vx: number, vy: number): void;
  /** 모든 손가락이 떨어졌을 때 한 번(제스처가 팬/핀치였다면 dragged=true) */
  end(dragged: boolean): void;
  /** 제스처 시작(관성·카메라 이동 중단용) */
  begin(): void;
  hover?(x: number, y: number): void;
}

interface P {
  x: number;
  y: number;
  sx: number;
  sy: number;
  trail: { x: number; y: number; t: number }[];
}

export interface GestureOpts {
  tapSlop?: number;
  doubleTapMs?: number;
  doubleTapDist?: number;
  flingMin?: number;
}

export class Gesture {
  private ps = new Map<number, P>();
  private dragging = false;
  private everMulti = false;
  private lastTap: { x: number; y: number; t: number } | null = null;
  private lastMoveT = 0;
  private readonly slop: number;
  private readonly dtMs: number;
  private readonly dtDist: number;
  private readonly flingMin: number;

  constructor(
    private h: GestureHandlers,
    o: GestureOpts = {},
  ) {
    this.slop = o.tapSlop ?? 10;
    this.dtMs = o.doubleTapMs ?? 320;
    this.dtDist = o.doubleTapDist ?? 32;
    this.flingMin = o.flingMin ?? 120;
  }

  get active(): boolean {
    return this.ps.size > 0;
  }
  get isDragging(): boolean {
    return this.dragging;
  }

  down(id: number, x: number, y: number, t: number): void {
    if (this.ps.size === 0) {
      this.dragging = false;
      this.everMulti = false;
      this.h.begin();
    }
    this.ps.set(id, { x, y, sx: x, sy: y, trail: [{ x, y, t }] });
    if (this.ps.size >= 2) {
      this.everMulti = true;
      this.dragging = true;
    }
  }

  move(id: number, x: number, y: number, t: number): void {
    const p = this.ps.get(id);
    if (!p) {
      this.h.hover?.(x, y);
      return;
    }
    const px = p.x;
    const py = p.y;
    p.trail.push({ x, y, t });
    while (p.trail.length > 2 && t - p.trail[0]!.t > 120) p.trail.shift();
    this.lastMoveT = t;
    if (this.ps.size >= 2) {
      const others = [...this.ps.entries()].filter(([k]) => k !== id);
      const o = others[0]![1];
      const d0 = Math.hypot(px - o.x, py - o.y);
      const d1 = Math.hypot(x - o.x, y - o.y);
      const c0x = (px + o.x) / 2;
      const c0y = (py + o.y) / 2;
      const c1x = (x + o.x) / 2;
      const c1y = (y + o.y) / 2;
      p.x = x;
      p.y = y;
      if (d0 > 1) this.h.pinch(d1 / d0, c1x, c1y, c1x - c0x, c1y - c0y);
      return;
    }
    if (!this.dragging) {
      if (Math.hypot(x - p.sx, y - p.sy) <= this.slop) {
        p.x = x;
        p.y = y;
        return;
      }
      this.dragging = true;
      // 슬롭을 넘는 순간 시작점부터의 이동을 한 번에 반영해 끊김이 없게 한다.
      this.h.pan(x - p.sx, y - p.sy);
      p.x = x;
      p.y = y;
      return;
    }
    p.x = x;
    p.y = y;
    this.h.pan(x - px, y - py);
  }

  up(id: number, x: number, y: number, t: number): void {
    const p = this.ps.get(id);
    if (!p) return;
    this.ps.delete(id);
    if (this.ps.size > 0) return; // 남은 손가락은 계속 팬(탭 아님)
    const dragged = this.dragging;
    if (!dragged && !this.everMulti) {
      const lt = this.lastTap;
      if (lt && t - lt.t <= this.dtMs && Math.hypot(x - lt.x, y - lt.y) <= this.dtDist) {
        this.lastTap = null;
        this.h.doubleTap(x, y);
      } else {
        this.lastTap = { x, y, t };
        this.h.tap(x, y);
      }
    } else if (!this.everMulti && t - this.lastMoveT < 80) {
      const first = p.trail[0]!;
      const dt = (t - first.t) / 1000;
      if (dt > 0.005) {
        const vx = (x - first.x) / dt;
        const vy = (y - first.y) / dt;
        if (Math.hypot(vx, vy) >= this.flingMin) this.h.fling(vx, vy);
      }
    }
    this.dragging = false;
    this.everMulti = false;
    this.h.end(dragged);
  }

  cancel(): void {
    const dragged = this.dragging;
    const had = this.ps.size > 0;
    this.ps.clear();
    this.dragging = false;
    this.everMulti = false;
    if (had) this.h.end(dragged);
  }
}
