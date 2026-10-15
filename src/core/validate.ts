/**
 * 콘텐츠 검증기(v5). DESIGN_V5 §3 의 규칙 11개 + 기본 무결성. 빌드·테스트에서 돌린다(tests/unit/validate.test.ts).
 *
 *  ① 이름 붙이기: TagRule 근거의 사실 키(함의 포함) ⊆ 카드 키, refers 가 그 figure 를 가리킴, 원장 기준 유일
 *     (이 방의 카드 ∪ 그날 방의 실명 인물), 카드 키 ⊇ 원장의 판정 관련 키(사실 숨기기 금지), 판정 시뮬레이션 ok
 *  ② 컷의 들림·보임 = 방 계산(또렷/흐림, 시야·거리·가림), 가리키는 사람은 그 컷에 보인다
 *  ③ 모순의 계산된 승자 = 검증 문장의 값
 *  ④ 두 길 규칙: 다시 쓰기에 필요한 값은 닫힐 수 있는 눈 밖에서도 얻는다. 닫힘은 그 눈이 연 다음 단계 뒤에만
 *  ⑤ 해결 전 컷·방·홈·메시지에 4자리 연도·장소 이름 없음
 *  ⑥ 힌트·피드백·복원 전 메시지에 정답(인물 이름·연도·사건 이름) 없음 + 메신저 규칙(≤30자, 반말/존댓말, 선택지 수)
 *  ⑦ verified 대사·복원 문장은 국역과 글자 단위 일치, 오역 문장 금지(접힌 전문만 예외), verified 는 URL 출처
 *  ⑧ 검증 대사의 화자는 실록이 적은 단위로만, 아뢰는 포즈는 그 단위의 사람만(홍귀달·어세겸 금지)
 *  ⑨ 눈 주인의 컷에는 주인의 이름·성을 부르는 말이 없다
 *  ⑩ 「?」(revealOnRestore) figure 를 가리키는 근거 0개
 *  ⑪ 금지 낱말(영감·파면·틀린 소문)
 *  ⑫ 현실 재기록: 소실 사실(erasedFacts)에 기대는 대화 줄(동료·07 의 답)은 facts 로 그 사실을 달고 restored 를 갖는다.
 *     복원 뒤 대화 기록(지난 에피소드에서 이어진 줄 포함)의 어떤 글도 소실 사실의 무늬(tells)에 걸리지 않는다(validateDialogueAcross)
 *  + 컷 id 는 CUT_IDS 안에, 모든 컷 id 에 판정 데이터가 있다, id 중복 없음, provenance·출처
 */
import { claimById, winningClaims } from './contradiction';
import { appearances, cutAppearances, idx, trueFigureOf } from './ep';
import { closureDue } from './eyes';
import { hearing, hasPos, posOf, sameMoment, seatOf, sight } from './room';
import { cardKeys, evidenceKeys, evidenceRefers, judgeTag, ledgerKeys, roomKeyOf } from './tag';
import type { Episode, Id, Step } from './types';

export interface Issue {
  rule: string;
  message: string;
}

export interface ValidateExtras {
  /** src/data/v5/ids.ts CUT_IDS */
  cutIds: readonly string[];
  cutTimes?: Readonly<Record<string, string>>;
  /** 「김일손」이 복원 전에 나와도 되는 묶음 */
  kimAllowedBursts?: readonly Id[];
  /** 오역 문장(§11.1). 없으면 검사 안 함 */
  mistranslated?: string;
}

/** 괄호 밖에 한자가 있는가(한자는 늘 한글 읽기 뒤 괄호 안에 — DEDUCTION_RULES 규칙 7) */
export function bareHanja(text: string): string | null {
  const outside = text.replace(/\([^()]*\)/g, '');
  const m = outside.match(/[\u3400-\u9fff]+/);
  return m ? m[0] : null;
}

export const BAN_WORDS = ['영감', '파면', '틀린 소문'];
/** 1300~1999 네 자리 연도 */
export const YEAR_RE = /(^|[^0-9#\-])1[3-9][0-9]{2}(?![0-9])/;
export const PLACE_WORDS = ['실록청', '춘추관', '연산군', '연산 ', '성종', '궁궐', '창덕궁', '경복궁'];
export const EVENT_WORDS = ['무오사화', '사화'];
const HAN_POLITE_RE = /(습니다|니다|세요|에요|예요|어요|아요|해요|지요|네요|군요|까요|요)[.?!…」』"]*$/;
const MY_POLITE_RE = /(요|네)[.?!]?$/;

const chunksOf = (text: string) =>
  text
    .split('…')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
const squash = (t: string) => t.replace(/\s+/g, '');

/** 줄임(…)으로 나눈 조각들이 원문 안에 차례로 있는가 */
export function quotedFrom(text: string, full: string): boolean {
  let from = 0;
  const F = squash(full);
  for (const c of chunksOf(text)) {
    const at = F.indexOf(squash(c), from);
    if (at < 0) return false;
    from = at + squash(c).length;
  }
  return true;
}

function stepsOf(steps: readonly Step[]): Step[] {
  const out: Step[] = [];
  for (const s of steps) {
    out.push(s);
    if (s.kind === 'choice') {
      for (const o of s.options) out.push(...stepsOf(o.then));
      out.push(...stepsOf(s.after ?? []));
    }
  }
  return out;
}

/** 대화 기록에 남을 수 있는 모든 줄(모든 갈래·힌트·빠른 질문). text = 처음 보낸 글, restored = 복원 뒤 글 */
export interface DialogueLine {
  where: string;
  kind: 'say' | 'system' | 'attach' | 'mine' | 'hint' | 'ask';
  text: string;
  restored?: string;
  facts?: Id[];
  /** 복원 뒤에만 오는 묶음 */
  post: boolean;
}

export function dialogueLines(ep: Episode): DialogueLine[] {
  const out: DialogueLine[] = [];
  for (const b of ep.bursts) {
    const post = !!b.postRestore;
    for (const s of stepsOf(b.steps)) {
      if (s.kind === 'say') out.push({ where: `${b.id}/${s.id}`, kind: 'say', text: s.text, restored: s.restored, facts: s.facts, post });
      else if (s.kind === 'system') out.push({ where: `${b.id}/${s.id}`, kind: 'system', text: s.text, post });
      else if (s.kind === 'attach') out.push({ where: `${b.id}/${s.id}`, kind: 'attach', text: s.label, post });
      else if (s.kind === 'choice')
        for (const o of s.options) out.push({ where: `${b.id}/${s.id}:${o.id}`, kind: 'mine', text: o.text, restored: o.restored, facts: o.facts, post });
    }
  }
  for (const l of ep.ladders) for (const st of l.steps) out.push({ where: `힌트 ${st.id}`, kind: 'hint', text: st.text, post: false });
  out.push({ where: '빠른 질문', kind: 'ask', text: ep.askText, post: false });
  out.push({ where: '빠른 질문 답', kind: 'ask', text: ep.askFallback, post: false });
  return out;
}

/**
 * ⑫ 에피소드를 건너서: 대화 기록은 다음 에피소드로 이어진다. 에피소드 k 가 복원된 뒤에는
 *  - 모든 에피소드의 줄의 마지막 글(restored ?? text)이 k 의 소실 무늬에 걸리지 않고,
 *  - k 뒤 에피소드의 줄은 처음 보낸 글부터 k 의 소실 무늬에 걸리지 않는다(이미 새 현실에서 한 말).
 * order = 플레이 순서.
 */
export function validateDialogueAcross(order: readonly Episode[]): Issue[] {
  const issues: Issue[] = [];
  order.forEach((ek, k) => {
    for (const f of ek.erasedFacts ?? [])
      order.forEach((ej, j) => {
        for (const l of dialogueLines(ej)) {
          const finalText = l.restored ?? l.text;
          if (f.tells.some((re) => re.test(finalText))) issues.push({ rule: '⑫', message: `${ej.id} ${l.where}: 복원 뒤 기록이 ${ek.id} 소실 사실 '${f.id}' 을 말한다 「${finalText}」` });
          else if (j > k && f.tells.some((re) => re.test(l.text))) issues.push({ rule: '⑫', message: `${ej.id} ${l.where}: ${ek.id} 복원 뒤의 말인데 소실 사실 '${f.id}' 을 말한다 「${l.text}」` });
        }
      });
  });
  return issues;
}

export function validateEpisode(ep: Episode, x: ValidateExtras): Issue[] {
  const issues: Issue[] = [];
  const bad = (rule: string, message: string) => issues.push({ rule, message });
  const I = idx(ep);
  const room = ep.room;
  const cardNames = ep.cards.map((c) => c.name);

  // ── 무결성 ──
  const ids = new Map<string, string>();
  const claimId = (kind: string, id: string) => {
    if (ids.has(id)) bad('ids', `id 중복: ${id} (${ids.get(id)} / ${kind})`);
    else ids.set(id, kind);
  };
  for (const l of ep.lines) claimId('line', l.id);
  for (const d of ep.details) claimId('detail', d.id);
  for (const c of ep.cards) for (const f of c.facts) claimId('fact', f.id);
  for (const c of ep.cuts) {
    if (!x.cutIds.includes(c.id)) bad('cut_ids', `컷 ${c.id} 가 CUT_IDS 에 없다`);
    if (x.cutTimes && x.cutTimes[c.id] !== c.time) bad('cut_ids', `컷 ${c.id} 시각 ${c.time} ≠ CUT_TIMES`);
  }
  for (const id of x.cutIds) if (!I.cut.has(id)) bad('cut_ids', `CUT_IDS 의 ${id} 에 판정 데이터가 없다`);
  for (const e of ep.eyes) {
    for (const cid of e.cuts) {
      if (!x.cutIds.includes(cid)) bad('cut_ids', `눈 ${e.id} 의 컷 ${cid} 가 CUT_IDS 에 없다`);
      if (I.cut.get(cid)?.eyeId !== e.id) bad('cut_ids', `컷 ${cid} 의 눈이 ${e.id} 가 아니다`);
    }
    if (e.openWhen.kind !== 'never' && (e.cuts.length < 3 || e.cuts.length > 5)) bad('cut_ids', `눈 ${e.id} 의 컷 수 ${e.cuts.length}(3~5)`);
    if (e.seatId && !seatOf(room, e.seatId)) bad('room', `눈 ${e.id} 의 자리 ${e.seatId} 없음`);
  }
  // provenance·출처
  const verifiedNeedsUrl = (what: string, prov: string, sources?: { url: string }[]) => {
    if (prov === 'verified' && !(sources ?? []).some((s) => /^https:\/\//.test(s.url))) bad('provenance', `${what}: verified 인데 URL 출처가 없다`);
  };
  for (const l of ep.lines) verifiedNeedsUrl(`대사 ${l.id}`, l.provenance, l.sources);
  for (const d of ep.details) verifiedNeedsUrl(`본 것 ${d.id}`, d.provenance, d.sources);
  for (const c of ep.cards) {
    for (const f of c.facts) verifiedNeedsUrl(`카드 ${c.id}/${f.id}`, 'verified', [f.source]);
    for (const a of c.altered ?? []) {
      if (a.provenance !== 'fictional') bad('provenance', `${c.id}/${a.id}: 변조 줄은 fictional`);
      verifiedNeedsUrl(`복원 줄 ${c.id}/${a.id}`, 'verified', [a.restoredSource]);
    }
    for (const l of c.eye.never?.restoredLines ?? []) verifiedNeedsUrl(`${c.id} 눈 줄`, 'verified', [l.source]);
  }
  for (const r of ep.records) for (const l of r.lines) verifiedNeedsUrl(`기록 ${r.id}`, r.provenance, [l.source]);
  for (const s of ep.sentences) verifiedNeedsUrl(`문장 ${s.id}`, s.provenance, [s.source]);
  verifiedNeedsUrl('복원 전문', 'verified', [ep.article.source]);
  for (const f of ep.figures) if (!f.provenance) bad('provenance', `figure ${f.id} provenance 없음`);
  for (const p of ep.pieces) if (!p.provenance) bad('provenance', `조각 ${p.id} provenance 없음`);
  // 위치
  for (const l of ep.lines) for (const o of l.origin) if (!hasPos(room, o)) bad('room', `대사 ${l.id} 의 소리 자리 ${o} 없음`);
  for (const d of ep.details) if (!hasPos(room, d.targetPosId)) bad('room', `본 것 ${d.id} 의 자리 ${d.targetPosId} 없음`);
  for (const c of ep.cuts) for (const f of c.figures) if (!hasPos(room, f.seatId)) bad('room', `컷 ${c.id} ${f.figureId} 자리 ${f.seatId} 없음`);

  // ── ① 이름 붙이기 ──
  const relevantKeys = new Set<string>();
  for (const l of ep.lines) for (const k of evidenceKeys(ep, l.id)) relevantKeys.add(k);
  for (const d of ep.details) for (const k of evidenceKeys(ep, d.id)) relevantKeys.add(k);
  const roomKey = roomKeyOf(ep);
  const pool = [...new Set([...ep.cards.filter((c) => c.roomAnchored).map((c) => c.id), ...ep.roomPersons])];
  for (const c of ep.cards) {
    const ck = cardKeys(ep, c, true);
    const lk = ledgerKeys(ep, c.id);
    if (!ep.ledger[c.id]) bad('①', `카드 ${c.id} 가 원장에 없다`);
    for (const k of lk) if (relevantKeys.has(k) && !ck.has(k)) bad('①', `카드 ${c.id} 가 원장의 판정 관련 사실 '${k}' 를 숨겼다`);
    if (roomKey) {
      const anchored = ck.has(roomKey);
      if (anchored !== c.roomAnchored) bad('①', `카드 ${c.id} roomAnchored(${c.roomAnchored}) ≠ 방의 사실(${anchored})`);
    } else if (!c.roomAnchored) bad('①', `카드 ${c.id}: roomKey 없음 = 모든 카드가 그 방의 카드`);
    for (const f of c.facts)
      for (const l of f.links ?? []) {
        if (!I.card.has(l.cardId)) bad('①', `${c.id}/${f.id}: 링크 카드 ${l.cardId} 없음`);
        if (!f.text.includes(l.term)) bad('①', `${c.id}/${f.id}: 링크 낱말 '${l.term}' 이 줄에 없다`);
      }
  }
  for (const d of ep.derivedKeys ?? []) {
    const via = I.fact.get(d.via.factId);
    if (!via || via.cardId !== d.via.cardId) bad('①', `파생 키 ${d.key}: via ${d.via.cardId}/${d.via.factId} 없음`);
    if (!I.card.has(d.to)) bad('①', `파생 키 ${d.key}: 카드 ${d.to} 없음`);
    if (!(ep.ledger[d.to] ?? []).some((e) => e.key === d.key)) bad('①', `파생 키 ${d.key}: ${d.to} 의 원장에 없다`);
  }
  // 모든 것을 본 지식(판정 시뮬레이션용)
  const allCuts = ep.cuts.map((c) => c.id);
  const allMerges = (() => {
    const out: string[][] = [];
    const times = [...new Set(ep.cuts.map((c) => c.time))];
    for (const t of times) {
      const near = appearances(ep, allCuts).filter((a) => sameMoment(a.time, t));
      const byPos = new Map<string, string[]>();
      for (const a of near) byPos.set(a.posId, [...(byPos.get(a.posId) ?? []), a.key]);
      for (const keys of byPos.values()) if (keys.length > 1) out.push(keys.sort());
    }
    return out;
  })();
  for (const r of ep.tags) {
    const card = I.card.get(r.personId);
    const fig = I.figure.get(r.figureId);
    if (!card || !fig) {
      bad('①', `${r.id}: 카드/figure 없음`);
      continue;
    }
    if (fig.truePersonId !== r.personId) bad('①', `${r.id}: figure 의 정체가 ${r.personId} 가 아니다`);
    if (!r.uniquenessNote.trim()) bad('①', `${r.id}: uniquenessNote 없음`);
    if (!r.acceptedEvidence.length) bad('①', `${r.id}: 근거 없음`);
    for (const e of r.acceptedEvidence) {
      const keys = evidenceKeys(ep, e);
      if (!keys.size) bad('①', `${r.id}/${e}: 근거에 사실 키가 없다`);
      const ck = cardKeys(ep, card);
      for (const k of keys) if (!ck.has(k)) bad('①', `${r.id}/${e}: 키 '${k}' 가 카드 ${card.id} 에 없다`);
      const holders = pool.filter((p) => [...keys].every((k) => ledgerKeys(ep, p).has(k)));
      if (holders.length !== 1 || holders[0] !== r.personId) bad('①', `${r.id}/${e}: 원장 기준 유일하지 않다(${holders.join(', ')})`);
      const ref = evidenceRefers(ep, e);
      if (I.fact.has(e)) bad('①', `${r.id}/${e}: 카드 사실 줄은 근거가 아니다(들은 말·본 것만)`);
      if (!ref) bad('①', `${r.id}/${e}: 근거가 아무도 가리키지 않는다`);
      else if ('figureId' in ref && ref.figureId !== r.figureId) bad('①', `${r.id}/${e}: 근거가 다른 figure 를 가리킨다`);
      else if ('posId' in ref) {
        const at = ep.cuts.flatMap((c) => cutAppearances(ep, c.id)).filter((a) => a.kind === 'figure' && a.posId === ref.posId && sameMoment(a.time, ref.time));
        if (!at.length || at.some((a) => a.kind === 'figure' && a.figureId !== r.figureId)) bad('①', `${r.id}/${e}: 그 자리·시각의 사람이 ${r.figureId} 가 아니다`);
      }
      // 시뮬레이션: 모두 보고, 모든 겹침을 알고, 카드를 다 찾았을 때 그 figure 가 나온 컷에서 ok
      const k = {
        viewedCuts: allCuts,
        named: {},
        merges: allMerges,
        openedEyes: ep.eyes.map((y) => y.id),
        closedEyes: [],
        cardsFound: ep.cards.map((c) => c.id),
        restored: false,
      };
      const cut = ep.cuts.find((c) => c.figures.some((f) => f.figureId === r.figureId));
      if (cut) {
        const j = judgeTag(ep, k, { cutId: cut.id, figureId: r.figureId }, r.personId, e);
        if (j.status !== 'judged' || j.verdict !== 'ok') bad('①', `${r.id}/${e}: 판정 시뮬레이션이 ok 가 아니다(${JSON.stringify(j)})`);
        for (const d of r.decoys) {
          const jd = judgeTag(ep, k, { cutId: cut.id, figureId: r.figureId }, d.personId, e);
          if (jd.status === 'judged' && jd.verdict === 'ok') bad('①', `${r.id}: 미끼 ${d.personId} 가 통과한다`);
        }
        for (const other of ep.cards) {
          if (other.id === r.personId) continue;
          const jo = judgeTag(ep, k, { cutId: cut.id, figureId: r.figureId }, other.id, e);
          if (jo.status === 'judged' && jo.verdict === 'ok') bad('①', `${r.id}: 다른 카드 ${other.id} 가 통과한다`);
        }
      }
    }
  }

  // ── ② 들림·보임 ──
  for (const c of ep.cuts) {
    const eye = I.eye.get(c.eyeId)!;
    if (!eye.seatId) continue;
    const seat = posOf(room, eye.seatId);
    for (const h of c.heard) {
      const l = I.line.get(h.lineId);
      if (!l) {
        bad('②', `컷 ${c.id}: 대사 ${h.lineId} 없음`);
        continue;
      }
      const hr = hearing(room, seat, l.origin, l.volume);
      if (hr.clarity === 'none') bad('②', `컷 ${c.id}: ${l.id} 는 이 자리에서 들리지 않는다(${hr.distance}칸)`);
      else if (hr.clarity !== h.clarity) bad('②', `컷 ${c.id}: ${l.id} 들림 ${h.clarity} ≠ 계산 ${hr.clarity}(${hr.distance}칸)`);
      if (h.clarity === 'garbled' && !h.garbledText) bad('②', `컷 ${c.id}: 흐린 말풍선 글자 없음`);
      if (l.refers && 'figureId' in l.refers && h.clarity === 'clear' && !c.figures.some((f) => f.figureId === (l.refers as { figureId: string }).figureId))
        bad('②', `컷 ${c.id}: ${l.id} 가 가리키는 사람이 이 컷에 없다`);
      const hj = bareHanja(l.text);
      if (hj) bad('⑦', `${l.id}: 한글 읽기 없는 한자 '${hj}'`);
    }
    for (const f of c.figures) {
      if (f.figureId === eye.figureId) bad('②', `컷 ${c.id}: 눈의 주인이 자기 컷에 나온다`);
      const sg = sight(room, seat, c.viewpoint.dirDeg, posOf(room, f.seatId));
      if (!sg.visible) bad('②', `컷 ${c.id}: ${f.figureId}(${f.seatId}) 가 시야 밖(${sg.distance}칸, 시야 ${sg.inCone})`);
    }
    for (const did of c.details) {
      const d = I.detail.get(did);
      if (!d) {
        bad('②', `컷 ${c.id}: 본 것 ${did} 없음`);
        continue;
      }
      const sg = sight(room, seat, c.viewpoint.dirDeg, posOf(room, d.targetPosId));
      if (!sg.visible) bad('②', `컷 ${c.id}: ${d.id} 가 보이지 않는다(${sg.distance}칸)`);
      if (d.refers && !c.figures.some((y) => y.figureId === d.refers!.figureId)) bad('②', `컷 ${c.id}: ${d.id} 가 가리키는 사람이 이 컷에 없다`);
      const hj = bareHanja(d.label);
      if (hj) bad('⑦', `${d.id}: 한글 읽기 없는 한자 '${hj}'(규칙 7)`);
      if (d.size === 'small') {
        if (d.occludedView) {
          if (!sg.occluded || sg.distance > room.sight.detailRange) bad('②', `컷 ${c.id}: ${d.id} 는 가린 모습인데 계산은 가림 없음`);
        } else if (!sg.countable) bad('②', `컷 ${c.id}: ${d.id} 를 셀 수 없다(${sg.distance}칸, 가림 ${sg.occluded})`);
      }
    }
  }
  // 같은 자리·같은 시각(±5분)의 등장은 같은 사람이어야 한다(겹침이 거짓말을 하지 않는다)
  const apps = appearances(ep, allCuts);
  for (let i = 0; i < apps.length; i++)
    for (let j = i + 1; j < apps.length; j++) {
      const a = apps[i];
      const b = apps[j];
      if (a.posId !== b.posId || !sameMoment(a.time, b.time) || a.cutId === b.cutId) continue;
      const ta = trueFigureOf(ep, a);
      const tb = trueFigureOf(ep, b);
      if (ta !== tb) bad('②', `겹침 거짓: ${a.key}(${ta}) / ${b.key}(${tb}) 같은 자리 ${a.posId}`);
    }

  // ── ③ 모순 ──
  for (const xc of ep.contradictions) {
    const w = winningClaims(ep, xc);
    if (w.length !== 1) {
      bad('③', `${xc.id}: 계산된 승자가 ${w.length}개`);
      continue;
    }
    const win = claimById(ep, w[0]);
    const accepts = ep.sentences.filter((s) => ep.requiredSentences.includes(s.id)).flatMap((s) => s.segments.filter((g) => g.slot?.kind === xc.slot).map((g) => g.slot!.accepts));
    if (!accepts.length || accepts.some((v) => v !== win.value)) bad('③', `${xc.id}: 승자 '${win.value}' ≠ 검증 문장 값 ${accepts.join('/')}`);
  }

  // ── ④ 두 길 ──
  const closable = new Set(ep.eyes.filter((e) => e.closeAt).map((e) => e.id));
  const safeEvidence = (eid: Id) => (I.evidenceCuts.get(eid) ?? []).some((cid) => !closable.has(I.cut.get(cid)!.eyeId));
  for (const sid of ep.requiredSentences) {
    const s = ep.sentences.find((y) => y.id === sid);
    if (!s) {
      bad('④', `필수 문장 ${sid} 없음`);
      continue;
    }
    const pieces = ep.pieces.filter((p) => p.sentenceId === sid);
    if (!pieces.some((p) => p.from.some(safeEvidence))) bad('④', `${sid}: 닫히지 않는 눈에서 얻는 조각이 없다`);
    for (const g of s.segments) {
      if (!g.slot) continue;
      if (g.slot.kind === 'who') {
        const rule = ep.tags.find((t) => I.card.get(t.personId)?.name === g.slot!.accepts);
        if (!rule || !rule.acceptedEvidence.some(safeEvidence)) bad('④', `${sid}/who: '${g.slot.accepts}' 의 이름 근거가 닫히지 않는 눈에 없다`);
        continue;
      }
      const claims = ep.claims.filter((c) => c.slot === g.slot!.kind && c.value === g.slot!.accepts);
      if (!claims.some((c) => c.from.some(safeEvidence))) bad('④', `${sid}/${g.slot.kind}: '${g.slot.accepts}' 를 닫히지 않는 눈에서 얻을 수 없다`);
    }
  }
  for (const cl of ep.closures) {
    // 닫히는 눈에만 근거가 있는 태그 → 그 태그가 연 눈이 열린 뒤에만 닫혀야 한다
    for (const r of ep.tags) {
      const onlyHere = r.acceptedEvidence.every((e) => (I.evidenceCuts.get(e) ?? []).every((cid) => I.cut.get(cid)!.eyeId === cl.eyeId));
      if (!onlyHere) continue;
      const opens = ep.eyes.filter((e) => e.openWhen.kind === 'tag' && e.openWhen.figureId === r.figureId).map((e) => e.id);
      if (!opens.includes(cl.trigger.eyeOpen)) bad('④', `${cl.id}: ${r.id} 가 연 눈(${opens.join(',')}) 전에 닫힐 수 있다`);
    }
    const k0 = { viewedCuts: [], named: {}, merges: [], openedEyes: [cl.eyeId], closedEyes: [], cardsFound: [], restored: false };
    if (closureDue(ep, k0, cl, { eyeOpenedAt: {}, now: 1e12, done: [] })) bad('④', `${cl.id}: 트리거 눈이 열리기 전에 닫힌다`);
  }

  // ── ⑤ 해결 전 화면 글에 연도·장소 없음 ──
  const preTexts: { where: string; text: string }[] = [];
  for (const c of ep.cuts) {
    preTexts.push({ where: `컷 ${c.id} alt`, text: c.alt });
    for (const h of c.heard) {
      const l = I.line.get(h.lineId);
      if (l) preTexts.push({ where: `컷 ${c.id} ${l.id}`, text: h.garbledText ?? l.text });
    }
    for (const d of c.details) preTexts.push({ where: `컷 ${c.id} ${d}`, text: I.detail.get(d)?.label ?? '' });
  }
  for (const f of ep.figures) preTexts.push({ where: `figure ${f.id}`, text: [f.label, ...f.visibleTraits].join(' ') });
  for (const g of ep.groups) preTexts.push({ where: `화자 ${g.id}`, text: g.label });
  for (const p of ep.pieces) preTexts.push({ where: `조각 ${p.id}`, text: p.label });
  for (const c of ep.claims) preTexts.push({ where: `주장 ${c.id}`, text: c.label });
  for (const xc of ep.contradictions) preTexts.push({ where: `모순 ${xc.id}`, text: [xc.loserLabel, xc.loserNote ?? '', xc.retryText, ...xc.buttons].join(' ') });
  preTexts.push({ where: '홈(전)', text: [ep.home.date.before, ep.home.place.before, ep.home.task, ep.home.detection, ep.home.status.before].join(' ') });
  for (const t of preTexts) {
    if (YEAR_RE.test(t.text)) bad('⑤', `${t.where}: 해결 전 화면에 연도 — 「${t.text}」`);
    for (const w of PLACE_WORDS) if (t.text.includes(w)) bad('⑤', `${t.where}: 해결 전 화면에 장소·왕대 '${w}'`);
  }

  // ── ⑥ 메신저·힌트 ──
  const kimOk = new Set(x.kimAllowedBursts ?? []);
  /** 이름 붙이기 전에는 말하지 않는다 — 그 태그가 끝난 뒤에만 켜지는 사다리는 그 사람 이름을 써도 된다 */
  let allowedNames = new Set<string>();
  const hasRevealFigures = ep.figures.some((f) => f.revealOnRestore);
  const checkSay = (where: string, from: string, text: string, pre: boolean, allowKim: boolean) => {
    if (text.length > 30) bad('⑥', `${where}: 말풍선 30자 초과(${text.length}) 「${text}」`);
    if (from === 'han' && HAN_POLITE_RE.test(text)) bad('⑥', `${where}: 한 선임 대사에 존댓말 「${text}」`);
    if (pre) {
      if (YEAR_RE.test(text)) bad('⑥', `${where}: 복원 전 메시지에 연도 「${text}」`);
      for (const w of EVENT_WORDS) if (text.includes(w)) bad('⑥', `${where}: 복원 전 메시지에 사건 이름 '${w}'`);
      for (const n of cardNames) if (text.includes(n) && !(n === '김일손' && allowKim) && !allowedNames.has(n)) bad('⑥', `${where}: 복원 전 메시지에 인물 이름 '${n}'`);
      // 「?」(실록에 이름이 있는 사람)가 있는 에피소드에서만: 그들에 대해 「기록에 없다」고 말하지 않는다
      if (hasRevealFigures && /기록에 없/.test(text)) bad('⑥', `${where}: 「기록에 없다」류 금지`);
    }
  };
  for (const b of ep.bursts) {
    const pre = !b.postRestore;
    for (const s of stepsOf(b.steps)) {
      if (s.kind === 'say') {
        checkSay(`${b.id}/${s.id}`, s.from, s.text, pre, kimOk.has(b.id));
        if (s.restored) checkSay(`${b.id}/${s.id}⟲`, s.from, s.restored, false, true);
      } else if (s.kind === 'system') {
        if (pre && YEAR_RE.test(s.text)) bad('⑥', `${b.id}: 시스템 줄 연도`);
      } else if (s.kind === 'choice') {
        const n = s.options.length;
        if (!(n >= 2 && n <= 3) && !(n === 1 && s.allowNoReply)) bad('⑥', `${b.id}/${s.id}: 선택지 ${n}개`);
        for (const o of s.options) {
          if (!MY_POLITE_RE.test(o.text)) bad('⑥', `${b.id}/${s.id}: 07 선택지는 존댓말 「${o.text}」`);
          if (pre) checkSay(`${b.id}/${o.id}`, 'me', o.text, pre, kimOk.has(b.id));
          if (o.restored) {
            checkSay(`${b.id}/${o.id}⟲`, 'me', o.restored, false, true);
            if (!MY_POLITE_RE.test(o.restored)) bad('⑥', `${b.id}/${o.id}⟲: 07 선택지는 존댓말 「${o.restored}」`);
          }
        }
      }
    }
  }
  for (const l of ep.ladders) {
    if (l.steps.length > 3) bad('⑥', `${l.id}: 사다리 3단 초과`);
    allowedNames = new Set(
      ep.tags.filter((t) => (l.activeWhen.tagsDone ?? []).includes(t.id)).map((t) => I.card.get(t.personId)?.name ?? ''),
    );
    for (const st of l.steps) checkSay(`힌트 ${st.id}`, 'han', st.text, true, false);
    allowedNames = new Set();
  }
  for (const xc of ep.contradictions) checkSay(`모순 ${xc.id} 다시`, 'sys', xc.retryText, true, false);

  // ── ⑫ 현실 재기록(이 에피소드 안) ──
  const erased = new Map((ep.erasedFacts ?? []).map((f) => [f.id, f]));
  const used = new Set<Id>();
  for (const l of dialogueLines(ep)) {
    const tagged = l.facts ?? [];
    for (const f of tagged) {
      used.add(f);
      if (!erased.has(f)) bad('⑫', `${l.where}: 모르는 소실 사실 '${f}'`);
    }
    if (l.kind === 'system' && tagged.length) bad('⑫', `${l.where}: 관측기 줄(시스템)은 다시 쓰이지 않는다`);
    if (l.post && (tagged.length || l.restored)) bad('⑫', `${l.where}: 복원 뒤 줄은 소실 사실에 기댈 수 없다`);
    if (tagged.length && !l.restored) bad('⑫', `${l.where}: 소실 사실에 기대는데 복원 뒤 글이 없다 「${l.text}」`);
    if (l.restored && !tagged.length) bad('⑫', `${l.where}: 다시 쓰이는 까닭(facts)이 없다`);
    if (l.restored && l.restored === l.text) bad('⑫', `${l.where}: 복원 뒤 글이 원래 글과 같다`);
    // 태그를 빠뜨린 줄 잡기: 다시 쓰이지 않는 줄은 소실 사실의 무늬에 걸리면 안 된다
    if (!l.restored)
      for (const f of erased.values())
        if (f.tells.some((re) => re.test(l.text))) bad('⑫', `${l.where}: 소실 사실 '${f.id}' 에 기대는 줄인데 태그·복원 뒤 글이 없다 「${l.text}」`);
  }
  for (const f of erased.values()) if (!used.has(f.id)) bad('⑫', `소실 사실 ${f.id} 에 기대는 줄이 없다(무늬만 남음)`);

  // ── ⑦ 검증 문장 ──
  const full = ep.article.fullText;
  const joined = ep.article.parts.map((p) => p.text).join(' ');
  if (squash(joined) !== squash(full)) bad('⑦', '복원 전문의 조각을 이으면 국역 전문과 다르다');
  const mis = x.mistranslated;
  for (const p of ep.article.parts) {
    if (mis && p.text.includes(mis) && !p.folded) bad('⑦', '오역 문장이 접히지 않고 복원 전문에 있다');
    if (p.folded && (!mis || squash(p.text) !== squash(mis))) bad('⑦', '접힌 조각이 오역 문장이 아니다');
  }
  for (const l of ep.lines) {
    if ((mis && l.text.includes(squash(mis).slice(0, 12))) || l.text.includes('들어 아는 바이므로')) bad('⑦', `${l.id}: 오역 문장`);
    if (l.provenance !== 'verified') continue;
    if (!l.sources?.some((s) => s.id === ep.article.source.id)) continue;
    if (!quotedFrom(l.text, full)) bad('⑦', `${l.id}: 국역과 글자가 다르다 「${l.text}」`);
  }
  for (const s of ep.sentences) {
    const text = s.segments
      .filter((g) => !g.editorial)
      .map((g) => (g.slot ? g.slot.display : g.text))
      .join('');
    if (text.includes('들어 아는 바이므로')) bad('⑦', `${s.id}: 오역 문장`);
    if (!quotedFrom(text, full)) bad('⑦', `${s.id}: 국역과 글자가 다르다 「${text}」`);
  }

  // ── ⑧ 화자 단위 ──
  const allowedSpeakers = new Set<string>();
  for (const g of ep.groups) for (const m of g.members) allowedSpeakers.add(m);
  for (const l of ep.lines) {
    if (l.provenance !== 'verified' || !('groupId' in l.speaker)) continue;
    const gid = l.speaker.groupId;
    const g = ep.groups.find((y) => y.id === gid);
    if (!g) {
      bad('⑧', `${l.id}: 화자 단위 ${gid} 없음`);
      continue;
    }
    for (const fid of l.speaker.figureIds) {
      const f = I.figure.get(fid);
      const persons = f?.truePersonId ? [f.truePersonId] : (f?.revealOnRestore?.personIds ?? []);
      if (!persons.length || persons.some((p) => !g.members.includes(p))) bad('⑧', `${l.id}: ${fid} 는 '${g.label}' 의 사람이 아니다`);
    }
  }
  for (const l of ep.lines)
    if (l.provenance === 'verified' && 'figureId' in l.speaker) {
      const f = I.figure.get(l.speaker.figureId);
      if (f && !f.anonymous) bad('⑧', `${l.id}: 검증 대사를 한 사람의 입에 넣었다(실록이 적은 단위로만)`);
    }
  for (const c of ep.cuts)
    for (const f of c.figures) {
      if (f.pose !== 'remonstrate' && f.pose !== 'propose') continue;
      const fig = I.figure.get(f.figureId);
      const persons = fig?.truePersonId ? [fig.truePersonId] : (fig?.revealOnRestore?.personIds ?? []);
      if (!persons.length || persons.some((p) => !allowedSpeakers.has(p))) bad('⑧', `컷 ${c.id}: ${f.figureId} 가 아뢰는 포즈(실록 화자 단위 밖)`);
    }

  // ── ⑨ 주인의 이름 ──
  for (const e of ep.eyes) {
    const card = I.card.get(e.personId);
    if (!card || e.openWhen.kind !== 'given') continue;
    const name = card.name;
    const sur = name[0];
    for (const cid of e.cuts) {
      const c = I.cut.get(cid)!;
      const texts = [c.alt, ...c.heard.map((h) => I.line.get(h.lineId)?.text ?? ''), ...c.details.map((d) => I.detail.get(d)?.label ?? '')];
      for (const t of texts) if (t.includes(name) || t.includes(`${sur} 대감`) || t.includes(`${sur}대감`)) bad('⑨', `컷 ${cid}: 주인의 이름을 부른다 「${t}」`);
    }
  }

  // ── ⑩ 「?」를 가리키는 근거 없음 ──
  for (const f of ep.figures.filter((y) => y.revealOnRestore))
    for (const l of ep.lines) if (l.refers && 'figureId' in l.refers && l.refers.figureId === f.id) bad('⑩', `${l.id} 가 「?」 ${f.id} 를 가리킨다`);
  for (const f of ep.figures.filter((y) => y.revealOnRestore))
    for (const l of ep.lines)
      if (l.refers && 'posId' in l.refers) {
        const r = l.refers;
        const at = apps.filter((a) => a.kind === 'figure' && a.posId === r.posId && sameMoment(a.time, r.time));
        if (at.some((a) => a.kind === 'figure' && a.figureId === f.id)) bad('⑩', `${l.id} 가 자리로 「?」 ${f.id} 를 가리킨다`);
      }

  // ── ⑪ 금지 낱말 ──
  const everything: { where: string; text: string }[] = [...preTexts];
  for (const c of ep.cards) {
    for (const f of c.facts) everything.push({ where: `카드 ${c.id}`, text: f.text });
    for (const a of c.altered ?? []) everything.push({ where: `카드 ${c.id} 변조`, text: `${a.display} ${a.restoredText}` });
  }
  for (const r of ep.records) everything.push({ where: `기록 ${r.id}`, text: [r.title, ...r.lines.map((l) => l.text), r.tag ?? ''].join(' ') });
  for (const b of ep.bursts) for (const s of stepsOf(b.steps)) if ('text' in s) everything.push({ where: `메신저 ${b.id}`, text: `${s.text} ${'restored' in s && s.restored ? s.restored : ''}` });
  for (const l of ep.ladders) for (const st of l.steps) everything.push({ where: `힌트 ${st.id}`, text: st.text });
  for (const d of ep.docs) everything.push({ where: `문서 ${d.id}`, text: [d.note, d.result, ...d.fields.map((f) => f.value)].join(' ') });
  everything.push({ where: '에필로그', text: [...ep.epilogue.monologue, ep.epilogue.aboutScene].join(' ') });
  for (const t of everything) for (const w of BAN_WORDS) if (t.text.includes(w)) bad('⑪', `${t.where}: 금지 낱말 '${w}'`);

  return issues;
}
