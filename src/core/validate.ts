import { impliedRange } from './chronology';
import { CONTENT_KEYS, evidenceView, factText, hasFact, indexContent, maxLevel, type ContentIndex } from './content';
import { personConflicts } from './deduction';
import type {
  CollectionCategory,
  ContentBase,
  ContentBundle,
  ContentKey,
  ContentModule,
  Deduction,
  Fact,
  Grants,
  Id,
  Reward,
  SourceRef,
  TimeConstraint,
} from './types';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  id: Id;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const CATEGORY_KEY: Record<CollectionCategory, ContentKey> = {
  artifact: 'artifacts',
  source: 'sources',
  person: 'persons',
  event: 'events',
  place: 'places',
};

const URL_RE = /^https?:\/\/\S+$/;

export function validateContent(content: ContentBundle, opts: { historical?: ContentModule } = {}): ValidationReport {
  const issues: ValidationIssue[] = [];
  const err = (id: Id, code: string, message: string) => issues.push({ severity: 'error', code, id, message });
  const warn = (id: Id, code: string, message: string) => issues.push({ severity: 'warning', code, id, message });
  const idx = indexContent(content);

  // 1. id 유일성(모든 종류 통틀어)
  const seen = new Map<Id, ContentKey>();
  for (const key of CONTENT_KEYS)
    for (const item of content[key]) {
      if (!item.id) err('(empty)', 'empty_id', `${key} 항목에 id 가 없습니다.`);
      else if (seen.has(item.id)) err(item.id, 'duplicate_id', `id 중복: ${seen.get(item.id)} / ${key}`);
      else seen.set(item.id, key);
    }
  const exists = (id: Id) => seen.has(id);
  const existsIn = (key: ContentKey, id: Id) => id in idx[key];

  // 2. 출처 규칙
  const checkProvenance = (owner: Id, p: ContentBase['provenance'], sources?: SourceRef[]) => {
    for (const s of sources ?? [])
      if (!s.title || !URL_RE.test(s.url ?? '')) err(owner, 'bad_source', `출처 '${s.title}'의 url 이 올바르지 않습니다.`);
    if (p === 'verified' && !(sources ?? []).some((s) => URL_RE.test(s.url ?? '')))
      err(owner, 'verified_without_source', 'verified 항목에는 url 이 있는 출처가 1개 이상 필요합니다.');
    if (p === 'reconstructed' && !sources?.length)
      warn(owner, 'reconstructed_without_source', 'reconstructed 항목은 근거 출처를 남기는 것이 좋습니다.');
  };
  for (const key of CONTENT_KEYS) for (const item of content[key]) checkProvenance(item.id, item.provenance, item.sources);
  for (const npc of content.npcs)
    for (const line of npc.dialogue) checkProvenance(`${npc.id}#${line.id}`, line.provenance, line.sources);

  for (const key of CONTENT_KEYS)
    for (const item of opts.historical?.[key] ?? []) {
      if (item.provenance === 'fictional')
        err(item.id, 'fictional_in_historical', 'historical 모듈에는 fictional 항목을 둘 수 없습니다.');
      if (key === 'npcs')
        for (const line of (item as ContentBundle['npcs'][number]).dialogue)
          if (line.provenance === 'fictional')
            err(`${item.id}#${line.id}`, 'fictional_in_historical', 'historical 모듈의 대사는 fictional 일 수 없습니다.');
    }

  // 3. 참조
  const ref = (owner: Id, id: Id, key?: ContentKey) => {
    if (key ? !existsIn(key, id) : !exists(id))
      err(owner, 'missing_ref', `참조 대상이 없습니다: ${id}${key ? ` (${key})` : ''}`);
  };
  const checkGrants = (owner: Id, g?: Grants) => {
    for (const e of g?.evidence ?? []) {
      ref(owner, e.id, 'evidence');
      const ev = idx.evidence[e.id];
      if (ev && (e.level ?? 0) > maxLevel(ev)) err(owner, 'bad_level', `증거 ${e.id}의 단계 ${e.level} 이 없습니다.`);
    }
    for (const c of g?.collect ?? []) ref(owner, c.entryId, 'collection');
    if (g?.observation) ref(owner, g.observation, 'observations');
  };
  const checkRewards = (owner: Id, rewards: readonly Reward[]) => {
    for (const r of rewards) {
      if (r.type === 'evidence') checkGrants(owner, { evidence: [{ id: r.evidenceId, level: r.level }] });
      if (r.type === 'collection') ref(owner, r.entryId, 'collection');
    }
  };

  for (const p of content.persons) p.relatedIds?.forEach((id) => ref(p.id, id));
  for (const a of content.artifacts) {
    a.sourceIds?.forEach((id) => ref(a.id, id, 'sources'));
    a.relatedIds?.forEach((id) => ref(a.id, id));
    if (a.made?.from !== undefined && a.made.to !== undefined && a.made.from > a.made.to)
      err(a.id, 'bad_range', '제작 시기 범위가 뒤집혀 있습니다.');
  }
  for (const s of content.sources) s.relatedIds?.forEach((id) => ref(s.id, id));
  for (const e of content.events) {
    e.personIds?.forEach((id) => ref(e.id, id, 'persons'));
    e.sourceIds?.forEach((id) => ref(e.id, id, 'sources'));
    if (e.placeId) ref(e.id, e.placeId, 'places');
  }
  for (const o of content.observations) checkGrants(o.id, o.grants);
  for (const w of content.worldObjects) checkGrants(w.id, w.grants);
  for (const n of content.npcs) {
    if (n.personId) ref(n.id, n.personId, 'persons');
    const lineIds = new Set<Id>();
    for (const l of n.dialogue) {
      if (lineIds.has(l.id)) err(n.id, 'duplicate_line', `대사 id 중복: ${l.id}`);
      lineIds.add(l.id);
      checkGrants(`${n.id}#${l.id}`, l.grants);
    }
    for (const w of n.schedule)
      if (w.time < 0 || w.time >= 1440) err(n.id, 'bad_schedule', `일정 시각 ${w.time} 은 0~1439 이어야 합니다.`);
  }
  for (const c of content.collection) {
    ref(c.id, c.refId, CATEGORY_KEY[c.category]);
    c.links?.forEach((id) => ref(c.id, id, 'collection'));
    const keys = new Set<string>();
    for (const f of c.fields) {
      if (keys.has(f.key)) err(c.id, 'duplicate_field', `필드 key 중복: ${f.key}`);
      keys.add(f.key);
      if (f.provenance === 'verified' && c.provenance !== 'verified' && !c.sources?.length)
        err(c.id, 'verified_without_source', `verified 필드 '${f.key}'에 출처가 없습니다.`);
    }
  }

  // 4. 증거 연대 제약
  const checkTime = (owner: Id, t: TimeConstraint) => {
    const { notBefore: nb, notAfter: na } = t;
    if (nb === undefined && na === undefined) err(owner, 'empty_time', '연대 제약에 notBefore/notAfter 가 모두 없습니다.');
    if ((nb !== undefined && !Number.isInteger(nb)) || (na !== undefined && !Number.isInteger(na)))
      err(owner, 'bad_time', '연대 경계는 정수 연도여야 합니다.');
    if (nb !== undefined && na !== undefined && nb > na) err(owner, 'bad_time', `notBefore(${nb}) > notAfter(${na})`);
    if (t.strength === 'weak' && !t.weakReason) warn(owner, 'weak_without_reason', 'weak 증거에는 weakReason 을 적어 주세요.');
  };
  for (const ev of content.evidence) ev.levels.forEach((lv) => lv.time && checkTime(ev.id, lv.time));

  // 5. 추리
  const obtainable = collectObtainable(content);
  for (const d of content.deductions) validateDeduction(d, idx, obtainable, err, warn, ref, checkRewards);

  const errors = issues.filter((i) => i.severity === 'error');
  return { ok: errors.length === 0, errors, warnings: issues.filter((i) => i.severity === 'warning') };
}

type Report = (id: Id, code: string, message: string) => void;

function collectObtainable(c: ContentBundle): Set<Id> {
  const out = new Set<Id>();
  const add = (g?: Grants) => g?.evidence?.forEach((e) => out.add(e.id));
  c.observations.forEach((o) => add(o.grants));
  c.worldObjects.forEach((w) => add(w.grants));
  c.npcs.forEach((n) => n.dialogue.forEach((l) => add(l.grants)));
  for (const d of c.deductions)
    for (const r of [...d.rewards.confirmed, ...(d.rewards.partial ?? [])])
      if (r.type === 'evidence') out.add(r.evidenceId);
  return out;
}

/** 관련 증거를 최고 단계로 펼쳤을 때 입증 가능한 사실 */
function provableFacts(d: Deduction, idx: ContentIndex): Fact[] {
  const facts: Fact[] = [];
  for (const id of d.relevantEvidence) {
    const ev = idx.evidence[id];
    if (ev) for (const f of evidenceView(ev, maxLevel(ev)).facts) if (!hasFact(facts, f)) facts.push(f);
  }
  return facts;
}

function validateDeduction(
  d: Deduction,
  idx: ContentIndex,
  obtainable: Set<Id>,
  err: Report,
  warn: Report,
  ref: (owner: Id, id: Id, key?: ContentKey) => void,
  checkRewards: (owner: Id, r: readonly Reward[]) => void,
) {
  d.relevantEvidence.forEach((id) => {
    ref(d.id, id, 'evidence');
    if (idx.evidence[id] && !obtainable.has(id))
      warn(d.id, 'unobtainable_evidence', `증거 ${id}을(를) 얻을 수 있는 경로가 없습니다.`);
  });
  checkRewards(d.id, [...d.rewards.confirmed, ...(d.rewards.partial ?? [])]);

  if (d.kind === 'year') {
    const { from, to } = d.target;
    if (!Number.isInteger(from) || !Number.isInteger(to) || from > to)
      return err(d.id, 'bad_target', '정답 범위가 올바르지 않습니다.');
    if (d.maxPartialWidth < to - from + 1)
      err(d.id, 'bad_threshold', 'maxPartialWidth 는 정답 범위 폭 이상이어야 합니다.');
    if ((d.context?.from ?? -Infinity) > from || (d.context?.to ?? Infinity) < to)
      err(d.id, 'context_excludes_target', '전제(context) 범위가 정답을 포함하지 않습니다.');
    const views = [];
    for (const id of d.relevantEvidence) {
      const ev = idx.evidence[id];
      if (!ev) continue;
      ev.levels.forEach((lv, i) => {
        const t = lv.time;
        if (t && ((t.notBefore ?? -Infinity) > from || (t.notAfter ?? Infinity) < to))
          err(d.id, 'evidence_contradicts_target', `증거 ${id}(단계 ${i})의 연대 제약이 정답 범위와 모순됩니다.`);
      });
      views.push(evidenceView(ev, maxLevel(ev)));
    }
    if (!views.some((v) => v.time)) err(d.id, 'no_time_evidence', '연대 정보를 가진 관련 증거가 없습니다.');
    const dec = impliedRange(views, d.context, false);
    if (dec.from !== from || dec.to !== to)
      warn(d.id, 'not_confirmable', '결정적 증거만으로 정답 범위를 정확히 좁힐 수 없어 확정 판정이 불가능합니다.');
    return;
  }

  const provable = provableFacts(d, idx);
  for (const f of d.requiredFacts)
    if (!hasFact(provable, f)) err(d.id, 'unprovable_fact', `필수 사실 '${factText(f)}'을(를) 입증하는 관련 증거가 없습니다.`);

  if (d.kind === 'person') {
    ref(d.id, d.subjectEvidenceId, 'evidence');
    d.candidates.forEach((id) => ref(d.id, id, 'persons'));
    if (!d.candidates.includes(d.answer)) err(d.id, 'answer_not_candidate', '정답이 후보 목록에 없습니다.');
    const answer = idx.persons[d.answer];
    if (!answer) return;
    for (const f of d.requiredFacts)
      if (!hasFact(answer.facts, f)) err(d.id, 'answer_lacks_fact', `정답 인물에게 필수 사실 '${factText(f)}'이(가) 없습니다.`);
    for (const f of personConflicts(answer.facts, provable))
      err(d.id, 'evidence_contradicts_answer', `관련 증거의 사실 '${factText(f)}'이(가) 정답 인물과 모순됩니다.`);
    for (const id of d.candidates) {
      const p = idx.persons[id];
      if (p && id !== d.answer && d.requiredFacts.every((f) => hasFact(p.facts, f)))
        err(d.id, 'indistinguishable', `후보 ${id}은(는) 필수 사실만으로 정답과 구별되지 않습니다.`);
    }
    return;
  }

  ref(d.id, d.eventId, 'events');
  const ids = new Set<Id>();
  for (const s of d.statements) {
    if (ids.has(s.id)) err(d.id, 'duplicate_statement', `진술 id 중복: ${s.id}`);
    ids.add(s.id);
  }
  const answer = d.statements.find((s) => s.id === d.answer);
  if (!answer) return err(d.id, 'missing_answer', '정답 진술이 없습니다.');
  if ((answer.refutedBy ?? []).some((f) => hasFact(provable, f) || hasFact(d.requiredFacts, f)))
    err(d.id, 'answer_refuted', '정답 진술이 관련 증거로 반박됩니다.');
  for (const s of d.statements)
    if (s.id !== d.answer && !(s.refutedBy ?? []).some((f) => hasFact(provable, f)))
      warn(d.id, 'unrefuted_statement', `오답 진술 ${s.id}을(를) 반박하는 증거가 없습니다(피드백이 빈약해집니다).`);
}
