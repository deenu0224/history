/** 화면 글 처리(순수 함수). 시각 표기, 검색어 밑줄, 실록 용어 풀이, 스크램블, 연도 스텝. */
import type { Gloss } from '@/core/types';

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** 하루 분(0~1439) → 'HH:MM' */
export function fmtMinute(m: number): string {
  const t = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`;
}

/** 'HH:MM' → 분. 형식이 아니면 null */
export function parseClock(s: string | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export interface Seg {
  text: string;
  /** 검색어(밑줄, 탭하면 검색) */
  term?: string;
  /** 실록 용어(점선, 탭하면 한 줄 풀이) */
  gloss?: string;
}

function split(text: string, words: readonly string[], min: number, key: 'term' | 'gloss'): Seg[] {
  const list = [...new Set(words.map((t) => t.trim()).filter((t) => t.length >= min))].sort((a, b) => b.length - a.length);
  if (!list.length || !text) return [{ text }];
  const hits: { s: number; e: number; w: string }[] = [];
  for (const w of list) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(w, from);
      if (i < 0) break;
      const e = i + w.length;
      if (!hits.some((h) => i < h.e && e > h.s)) hits.push({ s: i, e, w });
      from = e;
    }
  }
  hits.sort((a, b) => a.s - b.s);
  const out: Seg[] = [];
  let pos = 0;
  for (const h of hits) {
    if (h.s > pos) out.push({ text: text.slice(pos, h.s) });
    out.push({ text: text.slice(h.s, h.e), [key]: h.w });
    pos = h.e;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}

export { glossInline } from '@/core/reality';

/** terms 중 text 에 나오는 말을 긴 것 우선·겹치지 않게 찾아 조각낸다. */
export const splitTerms = (text: string, terms: readonly string[]): Seg[] => split(text, terms, 2, 'term');

/** 검색어 밑줄 + (밑줄이 아닌 부분의) 실록 용어 풀이 조각. */
export function richSegments(text: string, terms: readonly string[], glossary: readonly Gloss[]): Seg[] {
  const out: Seg[] = [];
  for (const sg of splitTerms(text, terms)) {
    if (sg.term) out.push(sg);
    else out.push(...split(sg.text, glossary.map((g) => g.term), 2, 'gloss'));
  }
  return out;
}

// ── 연도 스텝퍼 ───────────────────────────────────────────────
export const YEAR_MIN = 1;
export const YEAR_MAX = 2100;
export const YEAR_START = 1500;
export const clampYear = (y: number) => Math.min(YEAR_MAX, Math.max(YEAR_MIN, Math.round(y)));
/** 꾹 누르는 동안 점점 빨라지는 걸음(틱 수 → 한 번에 바뀌는 해) */
export const yearStepFor = (ticks: number) => (ticks < 5 ? 1 : ticks < 12 ? 5 : 10);

// ── 메신저 스레드 ──────────────────────────────────────────────
// ── 스크램블(다시 쓰기 연출) ─────────────────────────────────────
const SCRAMBLE_GLYPHS = '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주';

/** t(0~1) 만큼 진행된 스크램블 문자열. 왼쪽부터 목표 글자로 굳는다. 공백·문장부호는 그대로. rnd 는 테스트용 주입. */
export function scrambleAt(from: string, to: string, t: number, rnd: () => number = Math.random): string {
  if (t >= 1) return to;
  const n = Math.max(from.length, to.length);
  let out = '';
  for (let i = 0; i < n; i++) {
    const target = to[i];
    if (target === undefined) {
      // 목표가 더 짧다: 남는 글자는 끝에서부터 사라진다
      if (rnd() > t * 1.1) out += from[i] === ' ' ? ' ' : SCRAMBLE_GLYPHS[Math.floor(rnd() * SCRAMBLE_GLYPHS.length)];
      continue;
    }
    const settleAt = (i / n) * 0.7 + 0.05;
    if (t >= settleAt + 0.25 || /[\s.,!?…「」『』“”"'()·:]/.test(target)) out += target;
    else if (t < settleAt) out += from[i] ?? ' ';
    else out += SCRAMBLE_GLYPHS[Math.floor(rnd() * SCRAMBLE_GLYPHS.length)];
  }
  return out;
}

/** 'label: value' 줄 목록 중 다시 쓰인 줄(after 에만 있는 줄)과 그 전 줄(같은 label)을 묶는다. */
export function changedLines(before: string, after: string): { label: string; from: string; to: string }[] {
  const b = new Map(before.split('\n').map((l) => [l.split(':')[0]!.trim(), l]));
  const out: { label: string; from: string; to: string }[] = [];
  for (const l of after.split('\n')) {
    const label = l.split(':')[0]!.trim();
    const prev = b.get(label);
    if (prev !== l) out.push({ label, from: prev ?? '', to: l });
  }
  return out;
}

/**
 * 긴 단락을 접을 때 보이는 앞부분. 괄호 안(한자 풀이 등)에서 자르지 않고, 되도록 낱말 사이에서 자른다.
 * max 안에 끝나면 그대로 돌려준다(truncated: false).
 */
export function shorten(text: string, max = 80): { head: string; truncated: boolean } {
  if (text.length <= max) return { head: text, truncated: false };
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < text.length && i < max; i++) {
    const c = text[i];
    if (c === '(' || c === '（') depth += 1;
    else if (c === ')' || c === '）') depth = Math.max(0, depth - 1);
    else if (depth === 0 && (c === ' ' || c === ',' || c === '.')) cut = i + 1;
  }
  if (cut < max / 2) {
    // 낱말 경계가 없으면 괄호가 닫힌 곳까지 늘린다
    cut = max;
    let d = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '(' || c === '（') d += 1;
      else if (c === ')' || c === '）') d = Math.max(0, d - 1);
      if (i + 1 >= cut && d === 0) {
        cut = i + 1;
        break;
      }
    }
  }
  return { head: text.slice(0, cut).trimEnd(), truncated: true };
}

// ── 한자 규칙 ───────────────────────────────────────────────────
const HANJA_RUN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff][\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff·\s]*/g;

/**
 * 한글 읽기가 옆(앞뒤 24자 안)에 없는 한자 덩어리들. 화면의 한자는 늘 한글 읽기를 옆에 붙인다(DEDUCTION_RULES 7).
 * 시험(단위·e2e)이 화면 글을 이 함수로 훑는다.
 */
export function bareHanja(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(HANJA_RUN)) {
    const i = m.index!;
    const before = text.slice(Math.max(0, i - 24), i);
    const after = text.slice(i + m[0].length, i + m[0].length + 24);
    if (!/[가-힣]/.test(before) && !/[가-힣]/.test(after)) out.push(m[0].trim());
  }
  return out;
}
