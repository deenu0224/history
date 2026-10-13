import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';

export type Layout = 'desktop' | 'portrait' | 'landscape';

function calc(): Layout {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w < 720 && h >= w) return 'portrait';
  if (h < 520) return 'landscape';
  if (w < 720) return 'portrait';
  return 'desktop';
}

export function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>(calc);
  useEffect(() => {
    const on = () => setLayout(calc());
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
