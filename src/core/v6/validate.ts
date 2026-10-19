/**
 * v6 검증기(빌드·테스트 때). DESIGN_V6 §3.4 V1~V8, §4.2 F1~F8.
 * 오류는 문자열 목록으로 모은다 — 0개여야 한다.
 */
import { choose, combinations } from './bag';
import { judge, pairKey, type JudgeCtx } from './combine';
import { clueOrigins, reachable } from './graph';
import { fillLabels, holeCount, isDamaged, kukyeokView, modernView, sourceView, wonmunView } from './lines';
import type { Card, Ep0Data, Id, Judgement } from './types';

const HANJA = /[一-鿿]/;
const norm = (s: string) => s.replace(/\s/g, '');
const digits = (s: string) => [...new Set(s.match(/\d+/g) ?? [])].sort().join(',');
const sentences = (s: string) => s.split(/(?<=[.?!])\s+/).filter(Boolean).length;
const DEFAULT_LABELS: Record<string, string> = { holder: '두루마리를 편 관원' };

export const allCards = (d: Ep0Data): Card[] => [...Object.values(d.clues), ...Object.values(d.conclusions)];
export const judgeCtx = (d: Ep0Data): JudgeCtx => ({ world: d.world, why: d.why, templates: d.whyTemplates, conclusions: d.conclusions });

/** n = 2 묶음 하나의 결과(이미 맞춰 봄 제외) */
export function judgePair(d: Ep0Data, a: Card, b: Card): Judgement {
  return judge(judgeCtx(d), [a, b], [], false);
}

/** 한 묶음이 주는 것(결론 id 또는 'goal'), 없으면 null */
export function gives(d: Ep0Data, a: Card, b: Card): Id | 'goal' | null {
  const j = judgePair(d, a, b);
  return j.status === 'conclusion' ? j.conclusionId : j.status === 'goal' ? 'goal' : null;
}

// ── V2: 찍기 확률 ───────────────────────────────────────────
export interface OddsState {
  bag: Id[];
  found: Id[];
  newPairs: number;
  pairs: number;
  odds: number;
}
export interface OddsReport {
  max: number;
  maxState: OddsState | null;
  /** 상태 수 */
  states: number;
  /** 카드 수별 최대 */
  bySize: Record<number, number>;
}

/** 무리(그룹) 단위로 모으는 상태를 모두 열거한다. unit = 같은 기록·쪽의 단서 묶음 */
export function enumerateOdds(d: Ep0Data, mode: 'unit' | 'clue', minBag = 2): OddsReport {
  const cards = allCards(d);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const memo = new Map<string, Id | 'goal' | null>();
  const giv = (x: Id, y: Id) => {
    const k = pairKey([x, y]);
    if (!memo.has(k)) memo.set(k, gives(d, byId.get(x)!, byId.get(y)!));
    return memo.get(k)!;
  };
  const origins = clueOrigins(d.nodes);
  const unitKey = (id: Id) => {
    const o = origins[id]?.[0];
    return o ? `${o.node}#${o.page}` : id;
  };
  const clueIds = Object.keys(d.clues);
  const units: Id[][] = [];
  if (mode === 'unit') {
    const m = new Map<string, Id[]>();
    for (const id of clueIds) (m.get(unitKey(id)) ?? m.set(unitKey(id), []).get(unitKey(id))!).push(id);
    units.push(...m.values());
  } else units.push(...clueIds.map((i) => [i]));

  const stateKey = (bag: Id[], found: Id[]) => `${[...bag].sort().join(',')}|${[...found].sort().join(',')}`;
  const seen = new Set<string>();
  const out: OddsState[] = [];
  const queue: { bag: Id[]; found: Id[] }[] = [{ bag: [], found: [] }];
  while (queue.length) {
    const { bag, found } = queue.shift()!;
    const key = stateKey(bag, found);
    if (seen.has(key)) continue;
    seen.add(key);
    const ids = [...bag, ...found.filter((f) => f !== 'goal')];
    const pairs = choose(ids.length, 2);
    let newPairs = 0;
    const nextFound = new Set<Id>();
    let goalNew = false;
    for (const [x, y] of combinations(ids, 2)) {
      const g = giv(x!, y!);
      if (g === null) continue;
      if (g === 'goal') {
        goalNew = !found.includes('goal');
        if (goalNew) {
          newPairs += 1;
          nextFound.add('goal');
        }
      } else if (!found.includes(g)) {
        newPairs += 1;
        nextFound.add(g);
      }
    }
    if (ids.length >= minBag) out.push({ bag, found, newPairs, pairs, odds: pairs ? newPairs / pairs : 0 });
    for (const u of units) if (!u.every((x) => bag.includes(x))) queue.push({ bag: [...new Set([...bag, ...u])], found });
    // 결론 만들기(한 번에 하나)
    for (const f of nextFound) queue.push({ bag, found: [...found, f] });
  }
  let max = 0;
  let maxState: OddsState | null = null;
  const bySize: Record<number, number> = {};
  for (const s of out) {
    if (s.odds > max) {
      max = s.odds;
      maxState = s;
    }
    const n = s.bag.length + s.found.length;
    bySize[n] = Math.max(bySize[n] ?? 0, s.odds);
  }
  return { max, maxState, states: out.length, bySize };
}

export interface Report {
  errors: string[];
  /** 전수 묶음의 실패 코드 개수 */
  codes: Record<string, number>;
  oddsUnit: OddsReport;
  oddsClue: OddsReport;
}

/** 밑줄을 하나씩 고른 주머니(손으로 고른 카드)는 7장부터 찍기로 본다. 무리 단위 상태는 크기와 상관없이 모두 본다 */
export const MIN_RANDOM_BAG = 7;

export function validateEp0(d: Ep0Data): Report {
  const errors: string[] = [];
  const err = (code: string, msg: string) => errors.push(`${code} ${msg}`);
  const cards = allCards(d);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const L = d.lines;
  const tokens = d.answerTokens;
  const leaks = (text: string) => tokens.filter((t) => text.includes(t));
  const checkLeak = (where: string, text: string) => {
    const l = leaks(text);
    if (l.length) err('V4', `${where}에 답 낱말 ${l.join(',')}: ${text}`);
  };
  const codes: Record<string, number> = {};

  // ── V1: 맞는 묶음은 통과, 나머지는 실패 코드 ──
  const designed = new Map<string, Id | 'goal'>();
  for (const c of d.combos) for (const set of c.sets) designed.set(pairKey(set), c.gives);
  for (const [a, b] of combinations(cards, 2)) {
    const k = pairKey([a!.id, b!.id]);
    const j = judgePair(d, a!, b!);
    const want = designed.get(k);
    if (want) {
      const got = j.status === 'conclusion' ? j.conclusionId : j.status === 'goal' ? 'goal' : j.status;
      if (got !== want) err('V1', `맞는 묶음 ${k} 이(가) ${want} 를 줘야 하는데 ${got}${j.status === 'fail' ? `(${j.code})` : ''}`);
      continue;
    }
    if (j.status !== 'fail') {
      err('V1', `틀린 묶음 ${k} 이(가) 실패하지 않음: ${j.status}`);
      continue;
    }
    codes[j.code] = (codes[j.code] ?? 0) + 1;
    // ── V4/V8: 문구 ──
    if (!j.text || j.text.includes('{')) err('V8', `${k} 문구가 비었거나 채워지지 않음: ${j.text}`);
    checkLeak(`왜 아닌지 ${k}`, j.text);
    if (sentences(j.text) > 2) err('V8', `${k} 문구가 두 문장을 넘음: ${j.text}`);
    const named = [a!, b!].some((c) => [...c.short.split('·').map((s) => s.trim()), c.short, ...(c.mentions ?? [])].filter((s) => s.length >= 3).some((s) => j.text.includes(s)));
    if (!named) err('V8', `${k} 문구가 고른 단서의 이름을 들지 않음: ${j.text}`);
  }
  for (const w of d.why) {
    const [x, y] = w.pair.map((id) => byId.get(id));
    if (!x || !y) {
      err('V8', `대표 오답 ${w.pair.join('+')} 카드 없음`);
      continue;
    }
    const j = judgePair(d, x, y);
    if (j.status !== 'fail' || j.code !== w.code) err('V8', `대표 오답 ${w.pair.join('+')} 의 코드 ${w.code} 가 엔진 코드(${j.status === 'fail' ? j.code : j.status})와 다름`);
  }
  for (const t of Object.values(d.whyTemplates)) checkLeak('왜 아닌지 틀', t);

  // ── V2: 찍기 ──
  const oddsUnit = enumerateOdds(d, 'unit');
  const oddsClue = enumerateOdds(d, 'clue', MIN_RANDOM_BAG);
  if (oddsUnit.max > 1 / 5) err('V2', `무리 단위 최대 확률 ${oddsUnit.max.toFixed(3)} > 1/5`);
  if (oddsClue.max > 1 / 5) err('V2', `밑줄 단위(주머니 ${MIN_RANDOM_BAG}장 이상) 최대 확률 ${oddsClue.max.toFixed(3)} > 1/5`);

  // ── V3·V7: 길과 칩 ──
  const ctx0 = { found: [] as Id[], restored: false };
  const reach = reachable(d.nodes, d.start, ctx0);
  const origins = clueOrigins(d.nodes);
  for (const c of Object.values(d.clues)) {
    const os = origins[c.id] ?? [];
    if (!os.length) err('V3', `${c.id} 가 어느 기록에도 밑줄·관측 블록으로 나오지 않음`);
    else if (!os.some((o) => reach.has(o.node))) err('V3', `${c.id} 의 나온 곳이 시작 기록에서 보이는 연결로 닿지 않음`);
    const line = L.modern[c.line] ?? L.scenes[c.line];
    if (!line) err('V6', `${c.id} 의 글 ${c.line} 없음`);
    for (const s of c.sources) if (!L.verified[s]) err('F1', `${c.id} 의 출처 ${s} 가 검증 문장이 아님`);
  }
  for (const n of Object.values(d.nodes))
    for (const l of n.links) if (!d.nodes[l.to]) err('V7', `${n.id} 의 칩 ${l.id} 목적지 ${l.to} 없음`);
  for (const n of Object.values(d.nodes))
    n.pages.forEach((p) =>
      p.blocks.forEach((b) => {
        if (b.kind === 'line') {
          for (const mk of b.marks ?? []) {
            const m = L.modern[b.line];
            if (!d.clues[mk.clue]) err('V7', `${n.id} 밑줄 ${mk.clue} 단서 없음`);
            else if (d.clues[mk.clue]!.line !== b.line) err('V7', `${mk.clue} 의 글과 ${n.id} 블록의 글이 다름`);
            if (m && mk.text !== '*' && !m.modern.includes(mk.text)) err('V7', `${n.id} 밑줄 「${mk.text}」 가 글에 없음`);
          }
          if (!L.modern[b.line]) err('V7', `${n.id} 블록 글 ${b.line} 없음`);
        } else if (b.kind === 'heard' || b.kind === 'scene') {
          const cl = b.kind === 'heard' ? b.clue : b.clue;
          if (cl && d.clues[cl]?.line !== b.line) err('V7', `${cl} 의 글과 ${n.id} 블록의 글이 다름`);
        }
      }),
    );
  for (const c of d.combos)
    for (const set of c.sets) for (const id of set) if (!byId.has(id)) err('V1', `조합 ${c.id} 카드 ${id} 없음`);

  // ── V4: 답 누출(복원 전에 보이는 모든 글) ──
  checkLeak('목표 띠', d.world.goal.text);
  for (const c of Object.values(d.conclusions)) {
    checkLeak(`결론 ${c.id} 문구`, c.text);
    checkLeak(`결론 ${c.id} 이름`, c.short);
    if (c.goalLine) checkLeak(`결론 ${c.id} 밝힌 것`, c.goalLine);
    for (const v of Object.values(c.renames ?? {})) checkLeak(`결론 ${c.id} 이름 바꾸기`, v);
  }
  for (const c of Object.values(d.clues)) {
    checkLeak(`단서 ${c.id} 이름`, c.short);
    for (const ch of c.chips) checkLeak(`단서 ${c.id} 낱말 칩`, ch);
    for (const ch of c.chips) {
      const text = `${c.stage ?? ''}${L.modern[c.line] ? modernView(L, c.line, false, {}, DEFAULT_LABELS) : L.scenes[c.line]?.text ?? ''}`;
      if (!text.includes(ch)) err('V6', `단서 ${c.id} 의 낱말 칩 「${ch}」 가 카드 글에 없음`);
    }
    const sc = L.scenes[c.line];
    if (sc) checkLeak(`묘사 ${sc.id}`, sc.text);
    if (c.stage) checkLeak(`단서 ${c.id} 무대 지시`, c.stage);
  }
  for (const n of Object.values(d.nodes)) {
    if (n.restoredOnly) continue;
    checkLeak(`기록 ${n.id} 제목`, n.title);
    if (n.header) checkLeak(`기록 ${n.id} 머리`, n.header.text);
    for (const l of n.links) if (!l.restoredOnly) checkLeak(`칩 ${l.id}`, `${l.label} ${l.locked?.reason ?? ''}`);
    for (const p of n.pages)
      for (const b of p.blocks) {
        if (b.kind === 'note' || b.kind === 'heading') checkLeak(`기록 ${n.id} 글`, b.text);
        if (b.kind === 'scene') checkLeak(`기록 ${n.id} 묘사`, L.scenes[b.line]?.text ?? '');
      }
  }
  for (const m of d.monologues.filter((x) => !x.postRestore)) for (const t of m.lines) checkLeak(`독백 ${m.id}`, t);
  for (const [lineId, v] of Object.entries(L.verified)) {
    // 복원 전 풀이: 검증된 사료 줄의 현대어와 원문 보기는 예외(V4). 그 밖의 낱말 풀이는 검사
    const usedBy = Object.values(L.modern).filter((m) => m.sourceId === lineId);
    for (const m of usedBy) {
      const exempt = leaks(modernView(L, m.id, true)).length > 0 || leaks(v.kukyeok).length > 0;
      if (exempt) continue;
      for (const g of m.glossTerms) if (L.gloss[g]) checkLeak(`낱말 풀이 ${g}`, L.gloss[g]!);
    }
  }

  // ── V5: 손상된 줄은 모든 층에서 같은 자리가 뚫려 있다 ──
  for (const v of Object.values(L.verified)) {
    if (!isDamaged(v)) continue;
    const n = holeCount(v);
    const k = kukyeokView(L, v.id, false);
    const markers = (k.match(/\[ [?─]+ \]/g) ?? []).length;
    if (markers !== n) err('V5', `${v.id} 국역 구멍 ${markers}개 ≠ ${n}`);
    const w = wonmunView(L, v.id, false);
    if (w.status !== 'damaged' || w.holes !== n) err('V5', `${v.id} 원문 보기가 같은 자리 손상이 아님`);
    for (const m of Object.values(L.modern).filter((x) => x.sourceId === v.id)) {
      const mv = modernView(L, m.id, false);
      if ((mv.match(/\[ [?─]+ \]/g) ?? []).length !== n) err('V5', `${m.id} 현대어 구멍 수가 ${n} 와 다름`);
      if (m.modern !== '') err('V5', `${m.id} 의 modern 은 비워 둔다(손상된 줄은 modernParts 만)`);
      const fills = L.restoredModern[m.id];
      if (!fills || fills.length !== n) err('F7', `${m.id} 복원 풀이 수가 구멍 수와 다름`);
      // 구멍 안 낱말은 복원 전 어떤 층에도 없다
      for (const h of (v.parts ?? []).filter((p): p is Extract<typeof p, { hole: true }> => 'hole' in p && !('text' in p))) {
        const probe = h.restored.slice(0, 8);
        if (probe.length >= 6 && (k.includes(probe) || mv.includes(probe) || w.text.includes(probe))) err('V5', `${v.id} 구멍 안 글이 복원 전에 보임: ${probe}`);
      }
      const after = modernView(L, m.id, true);
      if (/\[ [?─]+ \]/.test(after)) err('V5', `${m.id} 복원 뒤에도 구멍이 남음`);
    }
    if (kukyeokView(L, v.id, true).includes('[ ')) err('V5', `${v.id} 복원 뒤 국역에 구멍이 남음`);
  }
  // 원문 보기: 복원 전에는 왕대·연도가 드러나는 출처를 가린다
  const YEAR = /(\d{3,4}\s*년)|세종|태종|재위|\d+\s*권/;
  for (const v of Object.values(L.verified)) {
    if (v.source !== 'sillok') continue;
    const s = sourceView(L, v.id, false);
    if (YEAR.test(s.text) || s.url) err('V5', `${v.id} 출처가 복원 전에 왕대·연도·주소를 드러냄: ${s.text}`);
    if (!sourceView(L, v.id, true).url) err('V5', `${v.id} 복원 뒤 출처에 주소가 없음`);
    const k = kukyeokView(L, v.id, false);
    const w = wonmunView(L, v.id, false);
    if (YEAR.test(k) || YEAR.test(w.text)) err('V5', `${v.id} 국역·원문에 왕대·연도 낱말이 있음`);
  }

  // ── V6: 현대어 풀이 F1~F8 ──
  for (const m of Object.values(L.modern)) {
    const v = L.verified[m.sourceId];
    if (!v) {
      err('F1', `${m.id} 이(가) 검증 문장에 묶이지 않음`);
      continue;
    }
    if (v.provenance !== 'verified') err('F1', `${m.id} 의 출처가 verified 가 아님`);
    if (!m.reviewed) err('F1', `${m.id} 이(가) 대조 승인(reviewed)되지 않음`);
    const full = modernView(L, m.id, true);
    if (HANJA.test(full) || (m.modernParts && m.modernParts.some((p) => 'text' in p && HANJA.test(p.text)))) err('F4', `${m.id} 현대어에 한자가 있음`);
    const ko = v.kukyeok;
    if (norm(full).length > norm(ko).length * 1.2) err('F6', `${m.id} 이(가) 국역의 120% 를 넘음`);
    if (digits(full) !== digits(ko)) err('F8', `${m.id} 수 집합이 국역과 다름(${digits(full)} ≠ ${digits(ko)})`);
    for (const nm of d.names) if (full.includes(nm) && !ko.includes(nm)) err('F2', `${m.id} 에 국역에 없는 이름 ${nm}`);
    for (const g of m.glossTerms) if (!L.gloss[g]) err('F8', `${m.id} 의 낱말 ${g} 풀이 없음`);
    const text = fillLabels(full, {}, DEFAULT_LABELS);
    if (text.includes('{')) err('F8', `${m.id} 채우지 않은 자리표시 ${text}`);
  }
  for (const s of Object.values(L.scenes)) {
    if (!s.basis.length || s.basis.some((b) => !L.verified[b])) err('F1', `묘사 ${s.id} 의 근거가 검증 문장이 아님`);
    for (const run of s.text.match(/[一-鿿]+/g) ?? []) if (!new RegExp(`${run}\\([가-힣]+\\)`).test(s.text)) err('F4', `묘사 ${s.id} 의 한자 ${run} 에 한글 읽기가 없음`);
  }
  for (const v of Object.values(L.verified)) if (!v.url || !v.citation) err('F1', `${v.id} 에 출처가 없음`);

  // ── 메신저 예산 ──
  // (한 선임 줄 수·길이는 messenger 데이터가 core 타입이라 테스트에서 따로 확인한다)
  return { errors, codes, oddsUnit, oddsClue };
}
