import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useGameStore } from '@/store/gameStore';

export type ShellMode = 'desktop' | 'mobile';
export interface Layout {
  mode: ShellMode;
  /** 가로로 낮은 화면(폰 가로) */
  short: boolean;
  w: number;
  h: number;
}

export const DESKTOP_MIN_W = 900;

function calc(): Layout {
  if (typeof window === 'undefined') return { mode: 'desktop', short: false, w: 1280, h: 800 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  return { mode: w >= DESKTOP_MIN_W && h >= 480 ? 'desktop' : 'mobile', short: h < 520, w, h };
}

export function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>(calc);
  useEffect(() => {
    const on = () =>
      setLayout((prev) => {
        const n = calc();
        return prev.mode === n.mode && prev.short === n.short && prev.w === n.w && prev.h === n.h ? prev : n;
      });
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return layout;
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** 요소 너비(px). 창 안의 앱이 컨테이너 크기에 맞춰 배치를 바꾼다. */
export function useWidth<T extends HTMLElement>(ref: RefObject<T | null>, fallback = 360): number {
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth || fallback);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}

/** 글자 단위 타자기 효과. textSpeed: 설정값(1=기본, 4 이상=즉시). */
export function useTypewriter(text: string, speedOverride?: number) {
  const setting = useGameStore((s) => s.settings.textSpeed);
  const speed = speedOverride ?? setting;
  const instant = speed >= 4 || prefersReducedMotion();
  const [n, setN] = useState(instant ? text.length : 0);
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    if (instant) {
      setN(text.length);
      return;
    }
    setN(0);
    const cps = 28 * Math.max(0.25, speed);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(textRef.current.length, Math.floor(((now - t0) / 1000) * cps));
      setN(k);
      if (k < textRef.current.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, instant, speed]);

  return {
    shown: text.slice(0, n),
    done: n >= text.length,
    finish: () => setN(text.length),
  };
}

/** 입력 포커스 중이 아닐 때만 키를 받는다. */
export function useKey(handler: (e: KeyboardEvent) => void, deps: unknown[] = [], enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const on = (e: KeyboardEvent) => ref.current(e);
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
}

export const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
};

// ── 뒤로 가기(모바일): 앱 안쪽 화면부터 닫고, 없으면 앱을 닫는다 ──────────────
const backStack: (() => boolean)[] = [];

/** active 인 동안 뒤로 가기를 가로챈다. 핸들러가 true 를 돌려주면 처리된 것. */
export function useBackHandler(active: boolean, handler: () => boolean) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const fn = () => ref.current();
    backStack.push(fn);
    return () => {
      const i = backStack.lastIndexOf(fn);
      if (i >= 0) backStack.splice(i, 1);
    };
  }, [active]);
}

/** 셸의 뒤로 가기 버튼/제스처가 호출. 안쪽에서 처리하면 true. */
export function runBack(): boolean {
  for (let i = backStack.length - 1; i >= 0; i--) if (backStack[i]!()) return true;
  return false;
}

// ── 마지막 입력 시각(방치 시간 → tickIdle) ────────────────────────
let lastInputAt = typeof performance !== 'undefined' ? performance.now() : 0;
export const touchInput = () => {
  lastInputAt = performance.now();
};
export const idleSeconds = () => (performance.now() - lastInputAt) / 1000;
