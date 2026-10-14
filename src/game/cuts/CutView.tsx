/**
 * 컷 표시 컴포넌트.
 *  - <CutView>  : 컷 한 장(캔버스 + 보이지 않는 인물 탭 버튼). 컷이 바뀌면 이전 장면이 페이드·슬라이드로 사라진다.
 *  - <CutStrip> : 여러 컷을 가로로 넘기는 컨테이너(스와이프 스냅 · 좌우 탭 영역 · 방향키). 세로 스크롤은 건드리지 않는다.
 * 크기는 부모 요소를 꽉 채운다(ResizeObserver). 부모에 높이를 줄 것.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent } from 'react';
import { getFigureHitboxes, renderCut } from './render';
import { specHash } from './math';
import type { CutSpec } from './types';

const reducedMotion = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const dprNow = () => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

function useSize(ref: React.RefObject<HTMLElement | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export interface CutViewProps {
  spec: CutSpec;
  /** 인물 탭(id). 버튼은 스펙의 figures 에서 자동 생성 */
  onTapFigure?: (figureId: string) => void;
  /** 탭으로 강조할 인물 id(DOM 링 — 다시 굽지 않는다) */
  highlightIds?: readonly string[];
  /** 인물 id → 스크린리더 라벨. 없으면 "인물 N" (정체를 밝히지 않는다) */
  labels?: Record<string, string>;
  /** 컷이 바뀔 때 전환. 기본 'fade' (prefers-reduced-motion 이면 무시) */
  transition?: 'fade' | 'none';
  className?: string;
  style?: CSSProperties;
}

export function CutView({ spec, onTapFigure, highlightIds, labels, transition = 'fade', className, style }: CutViewProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const back = useRef<HTMLCanvasElement>(null);
  const { w, h } = useSize(wrap);
  const dpr = dprNow();
  const hash = useMemo(() => specHash(spec), [spec]);
  const lastHash = useRef<string | null>(null);
  const lastSize = useRef('');

  useLayoutEffect(() => {
    const cv = front.current;
    if (!cv || w <= 0 || h <= 0) return;
    const src = renderCut(spec, w, h, dpr);
    const sizeKey = `${w}x${h}@${dpr}`;
    const changed = lastHash.current !== null && lastHash.current !== hash && lastSize.current === sizeKey;
    const bk = back.current;
    if (changed && transition === 'fade' && !reducedMotion() && bk && typeof cv.animate === 'function') {
      bk.width = cv.width;
      bk.height = cv.height;
      bk.getContext('2d')!.drawImage(cv, 0, 0);
      bk.style.visibility = 'visible';
      const dur = 260;
      const a = bk.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-14px)' }], { duration: dur, easing: 'ease-out', fill: 'forwards' });
      a.onfinish = () => {
        bk.style.visibility = 'hidden';
      };
      cv.animate([{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: dur, easing: 'ease-out' });
    }
    cv.width = src.width;
    cv.height = src.height;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0);
    lastHash.current = hash;
    lastSize.current = sizeKey;
  }, [spec, hash, w, h, dpr, transition]);

  const boxes = useMemo(() => (w > 0 && h > 0 ? getFigureHitboxes(spec, w, h, dpr) : []), [spec, w, h, dpr]);
  const hl = useMemo(() => new Set(highlightIds ?? []), [highlightIds]);
  const order = useMemo(() => new Map((spec.figures ?? []).map((f, i) => [f.id, i + 1])), [spec]);

  const canvasStyle: CSSProperties = { position: 'absolute', left: 0, top: 0, width: w, height: h, imageRendering: 'pixelated', display: 'block' };
  return (
    <div ref={wrap} className={className} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#0b0a08', touchAction: 'pan-y', ...style }} data-cut={spec.id}>
      <canvas ref={back} style={{ ...canvasStyle, visibility: 'hidden', pointerEvents: 'none' }} aria-hidden="true" />
      <canvas ref={front} style={canvasStyle} role="img" aria-label="기억 속 한 장면" />
      {boxes.map((b) => {
        const on = hl.has(b.id);
        return (
          <button
            key={b.id}
            type="button"
            aria-label={labels?.[b.id] ?? `인물 ${order.get(b.id) ?? ''}`}
            aria-pressed={onTapFigure ? on : undefined}
            data-figure={b.id}
            onClick={onTapFigure ? () => onTapFigure(b.id) : undefined}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              padding: 0,
              margin: 0,
              border: on ? '2px solid #ffd25a' : '0',
              borderRadius: 6,
              background: on ? 'rgba(255,210,90,0.14)' : 'transparent',
              boxShadow: on ? '0 0 0 1px rgba(18,16,13,0.8), 0 0 14px rgba(255,210,90,0.45)' : 'none',
              cursor: onTapFigure ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'pan-y',
              outline: 'none',
              transition: 'background 120ms, box-shadow 120ms',
            }}
          />
        );
      })}
    </div>
  );
}

export interface CutStripProps {
  specs: readonly CutSpec[];
  index: number;
  onIndexChange: (i: number) => void;
  onTapFigure?: (figureId: string, cutIndex: number) => void;
  highlightIds?: readonly string[];
  labels?: Record<string, string>;
  className?: string;
  style?: CSSProperties;
}

const SWIPE_LOCK_PX = 8;
const SWIPE_COMMIT = 0.2; // 폭의 20% 또는 빠른 휙
const SWIPE_VELOCITY = 0.4; // px/ms

export function CutStrip({ specs, index, onIndexChange, onTapFigure, highlightIds, labels, className, style }: CutStripProps) {
  const root = useRef<HTMLDivElement>(null);
  const { w } = useSize(root);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const st = useRef<{ id: number; x: number; y: number; t: number; locked: 'x' | 'y' | null; lastX: number; lastT: number; v: number } | null>(null);
  const n = specs.length;
  const clamp = useCallback((i: number) => Math.max(0, Math.min(n - 1, i)), [n]);
  const go = useCallback((i: number) => onIndexChange(clamp(i)), [onIndexChange, clamp]);

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    st.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, locked: null, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.locked) {
      if (Math.abs(dx) > SWIPE_LOCK_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
        s.locked = 'x';
        try {
          root.current?.setPointerCapture(e.pointerId);
        } catch {
          /* 캡처 불가 환경 */
        }
        setDragging(true);
      } else if (Math.abs(dy) > SWIPE_LOCK_PX) {
        s.locked = 'y'; // 세로 스크롤은 브라우저에 맡긴다
      }
    }
    if (s.locked === 'x') {
      const dt = Math.max(1, e.timeStamp - s.lastT);
      s.v = (e.clientX - s.lastX) / dt;
      s.lastX = e.clientX;
      s.lastT = e.timeStamp;
      // 양 끝에서는 저항
      const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === n - 1);
      setDrag(atEdge ? dx * 0.25 : dx);
    }
  };
  const finish = (e: RPointerEvent<HTMLDivElement>, cancel: boolean) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    st.current = null;
    if (s.locked === 'x') {
      const dx = e.clientX - s.x;
      const fast = Math.abs(s.v) > SWIPE_VELOCITY && Math.abs(dx) > 16;
      if (!cancel && (Math.abs(dx) > w * SWIPE_COMMIT || fast)) go(index + (dx < 0 ? 1 : -1));
      setDragging(false);
      setDrag(0);
      try {
        root.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
  };
  const onKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(index - 1);
    }
  };

  const slow = reducedMotion();
  const zoneStyle = (side: 'left' | 'right'): CSSProperties => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    [side]: 0,
    width: 44,
    padding: 0,
    margin: 0,
    border: 0,
    background: 'transparent',
    color: 'rgba(240,226,190,0.7)',
    fontSize: 22,
    cursor: 'pointer',
    zIndex: 3,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'pan-y',
  });

  return (
    <div
      ref={root}
      className={className}
      tabIndex={0}
      role="group"
      aria-roledescription="컷 넘기기"
      aria-label={`컷 ${index + 1} / ${n}`}
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', outline: 'none', ...style }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          transform: `translate3d(${-index * w + drag}px,0,0)`,
          transition: dragging || slow ? 'none' : 'transform 280ms cubic-bezier(.2,.8,.2,1)',
          willChange: 'transform',
        }}
      >
        {specs.map((sp, i) => (
          <div key={sp.id} style={{ flex: '0 0 100%', width: '100%', height: '100%', position: 'relative' }} aria-hidden={i !== index}>
            {Math.abs(i - index) <= 1 ? (
              <CutView spec={sp} transition="none" onTapFigure={i === index && onTapFigure ? (id) => onTapFigure(id, i) : undefined} highlightIds={i === index ? highlightIds : undefined} labels={labels} />
            ) : null}
          </div>
        ))}
      </div>
      {index > 0 ? (
        <button type="button" aria-label="이전 컷" style={zoneStyle('left')} onClick={() => go(index - 1)}>
          ‹
        </button>
      ) : null}
      {index < n - 1 ? (
        <button type="button" aria-label="다음 컷" style={zoneStyle('right')} onClick={() => go(index + 1)}>
          ›
        </button>
      ) : null}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 10, display: 'flex', justifyContent: 'center', gap: 6, pointerEvents: 'none', zIndex: 3 }} aria-hidden="true">
        {specs.map((sp, i) => (
          <span key={sp.id} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 3, background: i === index ? '#e8d9b0' : 'rgba(232,217,176,0.35)', transition: 'width 200ms' }} />
        ))}
      </div>
    </div>
  );
}
