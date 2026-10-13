/**
 * 현실 재기록(reality shift) 표시.
 * 사실이 복원되면 과거의 메신저 메시지·DB 레코드가 새 현실로 다시 쓰인다. 스토어가 최근 재기록 목록을 내놓는다
 * (state.rewrites). 형태가 확정되기 전까지 덕 타이핑으로 읽고, 없으면 아무 일도 하지 않는다.
 *
 * UI 규칙: 제자리에서 글자가 흔들리다 새 문장으로 가라앉는다(네온 금지, 화면은 한 칸 어두워짐).
 * 손글씨 노트만 before/after 를 둘 다 보여 준다(연필로 그은 옛 줄 + 새 줄). 기록관은 '복원' 도장, DB 는 표식 없음.
 */
import { useEffect, useRef, useState } from 'react';
import type { Id } from '@/core/types';
import { useGameStore } from '@/store/gameStore';
import { prefersReducedMotion } from '../hooks';
import { useUi } from '../uiStore';

export type RewriteKind = 'message' | 'record' | 'memo' | 'notebook' | string;

export interface RewriteEntry {
  /** 고유 키 */
  id: string;
  kind: RewriteKind;
  /** 바뀐 대상 id(메시지 id / 레코드 id / 메모 id) */
  targetId: Id;
  /** 레코드 필드 키(있으면) */
  field?: string;
  before: string;
  after: string;
  /** 어느 사실의 복원으로 바뀌었나(있으면) */
  factId?: Id;
  seq: number;
}

/** 스토어 상태에서 재기록 목록을 읽는다(없으면 빈 배열). */
export function readRewrites(state: unknown): RewriteEntry[] {
  const raw = (state as { rewrites?: unknown })?.rewrites;
  if (!Array.isArray(raw)) return [];
  const out: RewriteEntry[] = [];
  raw.forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    const o = r as Record<string, unknown>;
    const before = typeof o.before === 'string' ? o.before : typeof o.from === 'string' ? o.from : undefined;
    const after = typeof o.after === 'string' ? o.after : typeof o.to === 'string' ? o.to : undefined;
    const targetId = (o.targetId ?? o.messageId ?? o.recordId ?? o.target ?? o.id) as string | undefined;
    if (before === undefined || after === undefined || typeof targetId !== 'string') return;
    out.push({
      id: String(o.id ?? `${targetId}:${i}`),
      kind: String(o.kind ?? o.type ?? 'message'),
      targetId,
      field: typeof o.field === 'string' ? o.field : typeof o.key === 'string' ? o.key : undefined,
      before,
      after,
      factId: typeof o.factId === 'string' ? o.factId : undefined,
      seq: typeof o.seq === 'number' ? o.seq : i,
    });
  });
  return out;
}

/** 스토어 상태에서 '복원'된 항목 id(전시물·사실)를 읽는다. */
export function readRestored(state: unknown): Id[] {
  const raw = (state as { restored?: unknown })?.restored;
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
  if (raw && typeof raw === 'object') return Object.keys(raw as object).filter((k) => (raw as Record<string, unknown>)[k]);
  return [];
}

export function useRewrites(): RewriteEntry[] {
  const raw = useGameStore((s) => (s as unknown as { rewrites?: unknown }).rewrites);
  return Array.isArray(raw) ? readRewrites({ rewrites: raw }) : [];
}

const GLYPHS = '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주';

/** before 가 after 로 가라앉는 중간 문자열(진행도 0~1). 공백·구두점은 유지한다. */
export function scrambleFrame(before: string, after: string, t: number, rnd: () => number = Math.random): string {
  const len = Math.round(before.length + (after.length - before.length) * Math.min(1, t * 1.2));
  let out = '';
  for (let i = 0; i < len; i++) {
    const target = after[i] ?? '';
    // 앞쪽부터 새 글자로 굳는다
    const settled = i / Math.max(1, after.length) < t * 1.15 - 0.1;
    if (settled && target) out += target;
    else if (/[\s.,!?·…'"“”‘’~:;()\[\]-]/.test(target || before[i] || 'a')) out += target || before[i] || '';
    else out += rnd() < 0.55 ? GLYPHS[Math.floor(rnd() * GLYPHS.length)]! : (before[i] ?? target);
  }
  return t >= 1 ? after : out;
}

/**
 * 표시용 문장. text 가 마운트된 채로 바뀌면(복원) 흔들리다 가라앉는다.
 * 이미 바뀐 뒤 처음 열었다면 재기록 목록의 before 에서 시작한다(한 번만).
 */
export function useRewriteText(kind: RewriteKind, targetId: Id, text: string, field?: string): { text: string; busy: boolean } {
  const rewrites = useRewrites();
  const seen = useUi((s) => s.seenRewrites);
  const mark = useUi((s) => s.markRewriteSeen);
  const flicker = useGameStore((s) => s.settings.reduceFlicker);
  const prev = useRef(text);
  const [shown, setShown] = useState(text);
  const [busy, setBusy] = useState(false);
  const raf = useRef(0);
  const startedFor = useRef<string | null>(null);

  const run = (from: string, to: string) => {
    cancelAnimationFrame(raf.current);
    if (prefersReducedMotion() || flicker) {
      setShown(to);
      setBusy(false);
      return;
    }
    const t0 = performance.now();
    const dur = 900;
    setBusy(true);
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      setShown(scrambleFrame(from, to, t));
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else setBusy(false);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const findHit = (to: string) =>
    rewrites.find(
      (r) => r.targetId === targetId && (r.kind === kind || kind === '*') && (!field || !r.field || r.field === field) && r.after === to,
    );

  // 마운트된 채로 문장이 바뀜
  useEffect(() => {
    if (text !== prev.current) {
      const from = prev.current;
      prev.current = text;
      const hit = findHit(text);
      if (hit) {
        startedFor.current = hit.id;
        mark(hit.id);
      }
      run(from, text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // 이미 바뀐 뒤 처음 보는 경우
  useEffect(() => {
    const hit = findHit(text);
    if (!hit) return;
    if (seen[hit.id] || startedFor.current === hit.id) return;
    startedFor.current = hit.id;
    mark(hit.id);
    run(hit.before, text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewrites.length, text, targetId]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return { text: busy ? shown : text, busy };
}
