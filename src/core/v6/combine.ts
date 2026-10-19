/**
 * 「맞춰 보기」 판정(DESIGN_V6 §3). 단서·결론 = 사실 묶음, 맞춰 보기 = 사실 잇기.
 * 답은 이 파일에 없다 — 사실·규칙·숨은 물음·큰 목표는 모두 데이터(World)에서 온다.
 *
 * 판정 순서(고른 카드만 쓴다):
 *   1 어긋남(직함처럼 한 값만 가지는 키가 갈림) → 2 같은 말 두 번(한 카드의 사실이 다른 카드에 다 들어 있음)
 *   → 3 다른 대상(주된 대상이 서로 다르다고 알려짐) → 4 새 답: 하나로 좁혀지지 않음 / 이미 맞춰 봄 / 결론 / 큰 목표 풀림
 *   → 5 새로 이어진 것은 있으나 숨은 물음·목표에 닿지 않음(목표와 닿지 않음) → 6 이어지지 않음
 * 새 답은 「고른 카드에서 하나씩 뺀 묶음」 어느 것도 못 내는 답이다 — 모든 카드가 쓰여야 통과한다.
 */
import { josa } from '@/core/josa';
import type { Card, Conclusion, Fact, FailCode, Id, Judgement, KeySpec, Pat, Question, Rule, Val, WhyOverride, World } from './types';

// ── 같은 대상 묶기(합집합-찾기; 대표 = 순서가 가장 앞선 것) ──────────
class UF {
  private parent = new Map<Id, Id>();
  private rank: Map<Id, number>;
  constructor(order: readonly Id[]) {
    this.rank = new Map(order.map((e, i) => [e, i]));
  }
  private r(x: Id) {
    return this.rank.get(x) ?? 1e6;
  }
  find(x: Id): Id {
    let p = this.parent.get(x) ?? x;
    if (p !== x) {
      p = this.find(p);
      this.parent.set(x, p);
    }
    return p;
  }
  union(a: Id, b: Id): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (this.r(ra) <= this.r(rb)) this.parent.set(rb, ra);
    else this.parent.set(ra, rb);
    return true;
  }
}

const valKey = (v: Val, f: (e: Id) => Id): string => ('e' in v ? `e:${f(v.e)}` : 't' in v ? `t:${v.t}` : `w:${[...v.w].sort().join(',')}`);
export const factKey = (f: Fact): string => `${f.s}|${f.k}|${valKey(f.v, (e) => e)}`;

export interface Closure {
  uf: UF;
  facts: Fact[];
  /** 규칙·낱말·직함으로 새로 이어진 것(원래 id 로 적은 키) */
  derived: Set<string>;
  distinct: [Id, Id][];
}

type Binding = Record<string, string>;

function bindEnt(uf: UF, b: Binding, pat: string, actual: Id): Binding | null {
  if (!pat.startsWith('?')) return uf.find(pat) === uf.find(actual) ? b : null;
  const cur = b[pat];
  if (cur === undefined) return { ...b, [pat]: actual };
  return uf.find(cur) === uf.find(actual) ? b : null;
}

function matchPat(uf: UF, p: Pat, f: Fact, b: Binding): Binding | null {
  if (f.k !== p.k) return null;
  const b1 = bindEnt(uf, b, p.s, f.s);
  if (!b1) return null;
  if ('e' in p.v) return 'e' in f.v ? bindEnt(uf, b1, p.v.e, f.v.e) : null;
  if (!('t' in f.v)) return null;
  const t = p.v.t;
  if (!t.startsWith('?')) return t === f.v.t ? b1 : null;
  const cur = b1[t];
  if (cur === undefined) return { ...b1, [t]: f.v.t };
  return cur === f.v.t ? b1 : null;
}

function matchAll(uf: UF, pats: readonly Pat[], facts: readonly Fact[], i = 0, b: Binding = {}, out: Binding[] = []): Binding[] {
  if (i === pats.length) {
    out.push(b);
    return out;
  }
  for (const f of facts) {
    const nb = matchPat(uf, pats[i]!, f, b);
    if (nb) matchAll(uf, pats, facts, i + 1, nb, out);
  }
  return out;
}

const subst = (s: string, b: Binding) => (s.startsWith('?') ? b[s] : s);

export function closure(world: World, cards: readonly Card[]): Closure {
  const uf = new UF(world.order);
  const facts: Fact[] = [];
  const seen = new Set<string>();
  const derived = new Set<string>();
  const distinct: [Id, Id][] = [];
  const canonKey = (f: Fact) => `${uf.find(f.s)}|${f.k}|${valKey(f.v, (e) => uf.find(e))}`;
  const add = (f: Fact, why?: string): boolean => {
    const k = canonKey(f);
    if (seen.has(k)) return false;
    seen.add(k);
    facts.push(f);
    if (why) derived.add(why);
    return true;
  };
  for (const f of world.facts) add(f);
  for (const c of cards) for (const f of c.facts) add(f);
  const pairKeyOf = (a: Id, b: Id) => (a < b ? `~${a}|${b}` : `~${b}|${a}`);
  const link = (a: Id, b: Id, why: boolean): boolean => {
    if (!uf.union(a, b)) return false;
    if (why) derived.add(pairKeyOf(a, b));
    return true;
  };

  for (let iter = 0; iter < 60; iter++) {
    let changed = false;
    // 카드·세계가 직접 말하는 같음
    for (const f of [...facts]) if (f.k === '≡' && 'e' in f.v) changed = link(f.s, f.v.e, false) || changed;
    // 직함 같은 키: 같은 값이면 같은 대상 / 낱말 키: 겹치는 말이면 같은 화자
    const byTok = new Map<string, Id>();
    const wordsFacts: { s: Id; w: string[] }[] = [];
    for (const f of facts) {
      const spec: KeySpec | undefined = world.keys[f.k];
      if (!spec) continue;
      if (spec.kind === 'ident' && 't' in f.v) {
        const id = `${f.k}:${f.v.t}`;
        const first = byTok.get(id);
        if (first === undefined) byTok.set(id, f.s);
        else changed = link(first, f.s, true) || changed;
      } else if (spec.kind === 'words' && 'w' in f.v) wordsFacts.push({ s: f.s, w: f.v.w });
    }
    for (let i = 0; i < wordsFacts.length; i++)
      for (let j = i + 1; j < wordsFacts.length; j++) {
        const a = wordsFacts[i]!;
        const b = wordsFacts[j]!;
        if (a.w.some((w) => b.w.includes(w))) changed = link(a.s, b.s, true) || changed;
      }
    // 규칙
    for (const rule of world.rules as readonly Rule[]) {
      const snapshot = [...facts];
      for (const b of matchAll(uf, rule.if, snapshot)) {
        const t = rule.then;
        const s = subst(t.s, b);
        if (t.k === '≡' || t.k === '≠') {
          const e = 'e' in t.v ? subst(t.v.e, b) : undefined;
          if (!s || !e || uf.find(s) === uf.find(e)) continue;
          if (t.k === '≡') changed = link(s, e, true) || changed;
          else if (!distinct.some(([x, y]) => (uf.find(x) === uf.find(s) && uf.find(y) === uf.find(e)) || (uf.find(x) === uf.find(e) && uf.find(y) === uf.find(s)))) {
            distinct.push([s, e]);
            derived.add(`≠${s < e ? `${s}|${e}` : `${e}|${s}`}`);
            changed = true;
          }
          continue;
        }
        const v: Val = 'e' in t.v ? { e: subst(t.v.e, b)! } : { t: subst(t.v.t, b)! };
        if (!s) continue;
        const f: Fact = { s, k: t.k, v };
        if (add(f, `${s}|${t.k}|${valKey(v, (x) => x)}`)) changed = true;
      }
    }
    if (!changed) break;
  }
  return { uf, facts, derived, distinct };
}

// ── 대답(숨은 물음·큰 목표의 값) ───────────────────────────────
export interface Answer {
  q: Id;
  value: string;
  ambiguous?: boolean;
}

export function answers(world: World, clo: Closure, qs: readonly Question[]): Answer[] {
  const out: Answer[] = [];
  for (const q of qs) {
    const root = clo.uf.find(q.subject);
    if (q.key === '누구') {
      const accept = q.accept ?? ['named', 'role', 'word'];
      const m = world.order.filter((e) => e !== q.subject && clo.uf.find(e) === root && accept.includes(world.entities[e]!.kind));
      if (m.length) out.push({ q: q.id, value: m[0]!, ...(m.length > 1 ? { ambiguous: true } : {}) });
    } else {
      const vals = [...new Set(clo.facts.filter((f) => f.k === q.key && 't' in f.v && clo.uf.find(f.s) === root).map((f) => (f.v as { t: string }).t))];
      if (vals.length) out.push({ q: q.id, value: vals[0]!, ...(vals.length > 1 ? { ambiguous: true } : {}) });
    }
  }
  return out;
}

export const allQuestions = (w: World): Question[] => [...w.questions, w.goal.question];
const ansKey = (a: Answer) => `${a.q}=${a.value}${a.ambiguous ? '*' : ''}`;

export interface Outcome {
  /** 새 답(고른 카드를 하나씩 빼면 나오지 않는 것) */
  fresh: Answer[];
  clo: Closure;
  /** 새로 이어진 것이 있는가(규칙·직함·말로) */
  derivedNew: boolean;
}

export function outcome(world: World, picks: readonly Card[]): Outcome {
  const clo = closure(world, picks);
  const subs = picks.length > 1 ? picks.map((_, i) => closure(world, picks.filter((__, j) => j !== i))) : [];
  const subAns = new Set(subs.flatMap((c) => answers(world, c, allQuestions(world)).map(ansKey)));
  const fresh = answers(world, clo, allQuestions(world)).filter((a) => !subAns.has(ansKey(a)));
  const derivedNew = [...clo.derived].some((d) => subs.every((c) => !c.derived.has(d)));
  return { fresh, clo, derivedNew };
}

// ── 실패 코드 ──────────────────────────────────────────────────
export interface Conflict {
  key: string;
  a: { card: Card; value: string; subject: Id };
  b: { card: Card; value: string; subject: Id };
}

const isNamedClass = (world: World, clo: Closure, root: Id) => world.order.some((e) => clo.uf.find(e) === root && world.entities[e]!.kind === 'named');

export function findConflict(world: World, clo: Closure, picks: readonly Card[]): Conflict | null {
  const owner = (f: Fact): Card => {
    const k = factKey(f);
    return (
      picks.find((c) => c.facts.some((x) => factKey(x) === k)) ??
      picks.find((c) => clo.uf.find(c.about) === clo.uf.find(f.s)) ??
      picks[0]!
    );
  };
  for (const [key, spec] of Object.entries(world.keys)) {
    if (spec.kind !== 'ident') continue;
    const fs = clo.facts.filter((f) => f.k === key && 't' in f.v);
    for (let i = 0; i < fs.length; i++)
      for (let j = i + 1; j < fs.length; j++) {
        const x = fs[i]!;
        const y = fs[j]!;
        const vx = (x.v as { t: string }).t;
        const vy = (y.v as { t: string }).t;
        if (vx === vy) continue;
        const rx = clo.uf.find(x.s);
        const ry = clo.uf.find(y.s);
        if (rx !== ry && isNamedClass(world, clo, rx) && isNamedClass(world, clo, ry)) continue; // 서로 다른 이름 = 다른 대상
        return { key, a: { card: owner(x), value: vx, subject: x.s }, b: { card: owner(y), value: vy, subject: y.s } };
      }
  }
  return null;
}

export function isDistinct(world: World, clo: Closure, a: Id, b: Id): boolean {
  const ra = clo.uf.find(a);
  const rb = clo.uf.find(b);
  if (ra === rb) return false;
  if (isNamedClass(world, clo, ra) && isNamedClass(world, clo, rb)) return true;
  return clo.distinct.some(([x, y]) => (clo.uf.find(x) === ra && clo.uf.find(y) === rb) || (clo.uf.find(x) === rb && clo.uf.find(y) === ra));
}

export const pairKey = (ids: readonly Id[]) => [...ids].sort().join('+');

export interface Verdict {
  /** 맞는 묶음이면 새 답, 아니면 실패 코드 */
  code: FailCode | 'ok';
  fresh: Answer[];
  conflict?: Conflict;
  distinctPair?: [Card, Card];
  twicePair?: [Card, Card];
}

/** 순수 판정(문구·이미 맞춰 봄 제외) */
export function verdict(world: World, picks: readonly Card[]): Verdict {
  const o = outcome(world, picks);
  const conflict = findConflict(world, o.clo, picks);
  if (conflict) return { code: 'conflict', fresh: [], conflict };
  const fk = picks.map((c) => new Set(c.facts.map(factKey)));
  for (let i = 0; i < picks.length; i++)
    for (let j = 0; j < picks.length; j++)
      if (i !== j && [...fk[i]!].every((k) => fk[j]!.has(k))) return { code: 'twice', fresh: [], twicePair: [picks[i]!, picks[j]!] };
  for (let i = 0; i < picks.length; i++)
    for (let j = i + 1; j < picks.length; j++)
      if (isDistinct(world, o.clo, picks[i]!.about, picks[j]!.about)) return { code: 'other', fresh: [], distinctPair: [picks[i]!, picks[j]!] };
  if (o.fresh.some((a) => a.ambiguous)) return { code: 'ambiguous', fresh: o.fresh };
  const usable = o.fresh.filter((a) => a.q === world.goal.question.id || world.questions.some((q) => q.id === a.q));
  if (usable.length) return { code: 'ok', fresh: usable };
  return { code: o.derivedNew ? 'off_goal' : 'unlinked', fresh: [] };
}

// ── 문구(§5) ──────────────────────────────────────────────────
/** 조사 고르기(받침 있을 때 앞 것: 은/는 이/가 을/를, 와/과 는 받침 없을 때 앞 것) */
export function particle(word: string, pair: string): string {
  if (pair === '와/과') return word + josa(word, '이/가').slice(word.length).replace('이', '과').replace('가', '와');
  return josa(word, pair as '은/는');
}

export function fillTemplate(tpl: string, vars: Readonly<Record<string, string>>): string {
  return tpl.replace(/\{(\w+)(?:\|([^}]+))?\}/g, (_m, k: string, pair?: string) => {
    const v = vars[k] ?? '';
    return pair ? particle(v, pair) : v;
  });
}

export interface WhyCtx {
  world: World;
  why: readonly WhyOverride[];
  templates: Readonly<Record<FailCode, string>>;
}

export function explain(ctx: WhyCtx, v: Verdict, picks: readonly Card[]): string {
  const key = picks.map((c) => c.id);
  const sorted = [...key].sort();
  const ov = ctx.why.find((w) => w.code === v.code && w.pair.length === sorted.length && w.pair.every((id, i) => id === sorted[i]));
  if (ov) return ov.text;
  const ent = (id: Id) => ctx.world.entities[id]?.label ?? id;
  const [a, b] = v.conflict ? [v.conflict.a.card, v.conflict.b.card] : v.distinctPair ?? v.twicePair ?? [picks[0]!, picks[1] ?? picks[0]!];
  const q = (c: Card) => `「${c.short}」`;
  const vars: Record<string, string> = {
    A: q(a),
    B: q(b),
    key: v.conflict ? (ctx.world.keys[v.conflict.key]?.label ?? v.conflict.key) : '',
    vA: v.conflict?.a.value ?? '',
    vB: v.conflict?.b.value ?? '',
    aboutA: ent(a.about),
    aboutB: ent(b.about),
    reachA: a.reach,
    reachB: b.reach,
    group: picks.map((c) => ent(c.about)).join('·'),
  };
  return fillTemplate(ctx.templates[v.code as FailCode], vars);
}

export interface JudgeCtx extends WhyCtx {
  conclusions: Readonly<Record<Id, Conclusion>>;
}

/** 맞춰 보기 한 번. found = 이미 얻은 결론 id, goalSolved = 큰 목표가 풀렸는가 */
export function judge(ctx: JudgeCtx, picks0: readonly Card[], found: readonly Id[], goalSolved: boolean): Judgement {
  // 같은 묶음엔 같은 문구: 고른 순서와 상관없이 id 순으로 본다
  const picks = [...picks0].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const v = verdict(ctx.world, picks);
  if (v.code !== 'ok' && v.code !== undefined) {
    const code = v.code as FailCode;
    const shake = (v.conflict ? [v.conflict.a.card.id, v.conflict.b.card.id] : v.distinctPair ?? v.twicePair ?? picks).map((c) => (typeof c === 'string' ? c : c.id));
    return { status: 'fail', code, text: explain(ctx, v, picks), shake: [...new Set(shake)] };
  }
  const goal = v.fresh.find((a) => a.q === ctx.world.goal.question.id);
  if (goal) return goalSolved ? { status: 'already', goal: true } : { status: 'goal', value: goal.value };
  for (const a of v.fresh) {
    const c = Object.values(ctx.conclusions).find((x) => x.question === a.q && x.value === a.value);
    if (!c) continue;
    return found.includes(c.id) ? { status: 'already', conclusionId: c.id } : { status: 'conclusion', conclusionId: c.id, question: a.q, value: a.value };
  }
  // 새 답이 있으나 결론 칸이 없다 = 설계 오류. 검증기가 잡는다.
  return { status: 'fail', code: 'unlinked', text: explain(ctx, { code: 'unlinked', fresh: [] }, picks), shake: picks.map((c) => c.id) };
}
