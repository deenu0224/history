import { impliedRange } from './chronology';
import { windowsOverlap } from './observation';
import { normalizeQuery, searchIndex } from './search';
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
  StateCondition,
  TimeConstraint,
  TimeWindow,
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
    g?.sources?.forEach((id) => ref(owner, id, 'sources'));
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

  // 6. 결록 단말
  validateTerminal(content, idx, err, warn, ref, checkGrants);

  const errors = issues.filter((i) => i.severity === 'error');
  return { ok: errors.length === 0, errors, warnings: issues.filter((i) => i.severity === 'warning') };
}

type Report = (id: Id, code: string, message: string) => void;

/** 모든 획득처의 Grants(관측·핫스팟·대사·검색·사료 구절·메시지·전시물·보정). */
export function allGrants(c: ContentBundle): { owner: Id; grants: Grants }[] {
  const out: { owner: Id; grants: Grants }[] = [];
  const push = (owner: Id, g?: Grants) => g && out.push({ owner, grants: g });
  c.observations.forEach((o) => push(o.id, o.grants));
  c.worldObjects.forEach((w) => push(w.id, w.grants));
  c.npcs.forEach((n) => n.dialogue.forEach((l) => push(`${n.id}#${l.id}`, l.grants)));
  c.searchEntries.forEach((e) => {
    push(e.id, e.grants);
    (e.conditional ?? []).forEach((x, i) => push(`${e.id}#c${i}`, x.grants));
  });
  c.phrases.forEach((p) => push(p.id, p.grants));
  c.messages.forEach((m) => push(m.id, m.grants));
  c.exhibits.forEach((x) => push(x.id, x.grants));
  c.corrections.forEach((x) => push(x.id, x.grants));
  c.shifts.forEach((x) => push(x.id, x.unlocks));
  c.links.forEach((x) => push(x.id, { ...x.grants, evidence: [...(x.grants?.evidence ?? []), x.result] }));
  return out;
}

function collectObtainable(c: ContentBundle): Set<Id> {
  const out = new Set<Id>();
  for (const { grants } of allGrants(c)) grants.evidence?.forEach((e) => out.add(e.id));
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
  if (d.kind === 'causal') {
    const nodes = new Set<Id>();
    for (const n of d.nodes) {
      if (nodes.has(n.id)) err(d.id, 'duplicate_node', `마디 id 중복: ${n.id}`);
      if (!n.text.trim()) err(d.id, 'empty_node', `마디 ${n.id} 의 문장이 비었습니다.`);
      nodes.add(n.id);
    }
    if (d.chain.length < 2) err(d.id, 'bad_chain', '정답 고리는 마디 2개 이상이어야 합니다.');
    d.chain.forEach((id) => !nodes.has(id) && err(d.id, 'missing_ref', `고리의 마디가 없습니다: ${id}`));
    const pairs = d.chain.slice(1).map((to, i) => `${d.chain[i]}>${to}`);
    const rules = d.links.map((l) => `${l.from}>${l.to}`);
    if (pairs.length !== rules.length || pairs.some((p) => !rules.includes(p)))
      err(d.id, 'chain_links_mismatch', '정답 연결(links)은 고리(chain)의 연속한 쌍과 정확히 같아야 합니다.');
    for (const l of d.links) {
      if (!l.requires.length) err(d.id, 'unsupported_link', `연결 ${l.from}→${l.to} 에 필요한 사실이 없습니다.`);
      for (const f of l.requires)
        if (!hasFact(provable, f)) err(d.id, 'unprovable_fact', `연결 ${l.from}→${l.to} 의 사실 '${factText(f)}'을(를) 입증하는 관련 증거가 없습니다.`);
    }
    for (const w of d.wrongLinks ?? []) {
      if (!nodes.has(w.from) || !nodes.has(w.to)) err(d.id, 'missing_ref', `오답 연결의 마디가 없습니다: ${w.from}→${w.to}`);
      if (rules.includes(`${w.from}>${w.to}`)) err(d.id, 'wrong_link_is_answer', `오답 연결 ${w.from}→${w.to} 이 정답에 있습니다.`);
    }
    if (d.nodes.length <= d.chain.length) warn(d.id, 'no_distractor', '인과 추리에 헷갈릴 만한 마디(오답)가 없습니다.');
    return;
  }
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

// ── 결록 단말 검증 ─────────────────────────────────────────────
const SEARCH_REF_KEY: Record<string, ContentKey> = {
  person: 'persons',
  artifact: 'artifacts',
  source: 'sources',
  event: 'events',
  place: 'places',
  evidence: 'evidence',
  record: 'records',
};

function stateConds(c: ContentBundle): { owner: Id; cond: StateCondition }[] {
  const out: { owner: Id; cond: StateCondition }[] = [];
  const push = (owner: Id, cond?: StateCondition) => cond && out.push({ owner, cond });
  c.apps.forEach((a) => push(a.id, a.unlockWhen));
  c.searchEntries.forEach((e) => {
    push(e.id, e.requires);
    (e.conditional ?? []).forEach((x) => push(e.id, x.when));
  });
  c.phrases.forEach((p) => push(p.id, p.when));
  c.messages.forEach((m) => push(m.id, m.when));
  c.exhibits.forEach((x) => push(x.id, x.requires));
  c.memos.forEach((m) => push(m.id, m.when));
  c.corrections.forEach((x) => push(x.id, x.trigger));
  c.shifts.forEach((x) => push(x.id, x.when));
  c.links.forEach((x) => push(x.id, x.requires));
  c.acts.forEach((x) => push(x.id, x.requires));
  c.tutorial.forEach((t) => {
    push(t.id, t.showWhen);
    push(t.id, t.doneWhen);
  });
  c.npcs.forEach((n) => n.dialogue.forEach((l) => push(`${n.id}#${l.id}`, l.when)));
  c.timelines.forEach((t) => t.hotspots.forEach((h) => push(h.id, h.visibleWhen)));
  return out;
}

function flatten(c: StateCondition): StateCondition[] {
  return [c, ...(c.any ?? []).flatMap(flatten)];
}

function validateTerminal(
  content: ContentBundle,
  idx: ContentIndex,
  err: Report,
  warn: Report,
  ref: (owner: Id, id: Id, key?: ContentKey) => void,
  checkGrants: (owner: Id, g?: Grants) => void,
) {
  const hotspotIds = new Set(content.timelines.flatMap((t) => t.hotspots.map((h) => h.id)));
  const puzzleFlags = new Set<string>();
  for (const d of content.deductions) {
    if (d.requires) puzzleFlags.add(d.requires);
    for (const r of [...d.rewards.confirmed, ...(d.rewards.partial ?? [])]) if (r.type === 'flag') puzzleFlags.add(r.flag);
  }

  // 6.1 생산 가능한 플래그
  const produced = new Set<string>();
  for (const { grants } of allGrants(content)) grants.flags?.forEach((f) => produced.add(f));
  for (const d of content.deductions)
    for (const r of [...d.rewards.confirmed, ...(d.rewards.partial ?? [])]) if (r.type === 'flag') produced.add(r.flag);
  for (const m of content.messages) for (const ch of m.choices ?? []) ch.setsFlags?.forEach((f) => produced.add(f));
  const needFlag = (owner: Id, f: string) => {
    if (!produced.has(f)) err(owner, 'unreachable_flag', `플래그 '${f}'을(를) 세우는 곳이 없습니다.`);
  };
  for (const d of content.deductions) if (d.requires) needFlag(d.id, d.requires);
  for (const w of content.worldObjects) if (w.requires) needFlag(w.id, w.requires);

  // 6.2 상태 조건의 참조
  for (const { owner, cond } of stateConds(content))
    for (const c of flatten(cond)) {
      [...(c.all ?? []), ...(c.none ?? [])].forEach((f) => needFlag(owner, f));
      c.evidence?.forEach((id) => ref(owner, id, 'evidence'));
      c.searched?.forEach((id) => ref(owner, id, 'searchEntries'));
      c.read?.forEach((id) => ref(owner, id, 'messages'));
      c.phrases?.forEach((id) => ref(owner, id, 'phrases'));
      c.attempted?.forEach((id) => ref(owner, id, 'deductions'));
      c.corrections?.forEach((id) => ref(owner, id, 'corrections'));
      c.shifts?.forEach((id) => ref(owner, id, 'shifts'));
      c.links?.forEach((id) => ref(owner, id, 'links'));
      c.recorded?.forEach((id) => ref(owner, id, 'acts'));
      c.tapped?.forEach((id) => {
        if (!hotspotIds.has(id)) err(owner, 'missing_ref', `핫스팟이 없습니다: ${id}`);
      });
    }

  // 6.3 앱
  const appSeen = new Set<string>();
  for (const a of content.apps) {
    if (appSeen.has(a.app)) err(a.id, 'duplicate_app', `앱 중복: ${a.app}`);
    appSeen.add(a.app);
  }

  // 6.4 검색 색인
  const visibleAll = () => true;
  for (const e of content.searchEntries) {
    if (!e.terms.length) err(e.id, 'empty_terms', '색인어가 없습니다.');
    for (const t of e.terms) {
      const n = normalizeQuery(t);
      if (!n) err(e.id, 'bad_term', `색인어 '${t}'이(가) 정규화 후 비었습니다.`);
      else if (n.length < 2) warn(e.id, 'short_term', `색인어 '${t}'은(는) 한 글자라 정확히 일치할 때만 맞습니다.`);
    }
    if (!e.results.length && !e.noArticle) err(e.id, 'empty_results', '결과가 없는 색인 항목입니다.');
    if (e.noArticle && e.results.length) err(e.id, 'no_article_with_results', '말소된 기사(noArticle)는 결과를 두지 않습니다(복원이 채운다).');
    if (e.noArticle && !content.shifts.some((sh) => sh.searchRewrites?.some((r) => r.entryId === e.id)))
      err(e.id, 'no_article_unrestorable', '말소된 기사를 복원하는 현실 이동이 없습니다.');
    for (const r of e.results) ref(e.id, r.id, SEARCH_REF_KEY[r.kind]);
    checkGrants(e.id, e.grants);
    (e.conditional ?? []).forEach((x) => checkGrants(e.id, x.grants));
    const progress = [e.grants, ...(e.conditional ?? []).map((x) => x.grants)].some(
      (g) => g?.evidence?.length || g?.flags?.some((f) => puzzleFlags.has(f) || produced.has(f)),
    );
    if (e.optional && progress && e.grants?.flags?.length)
      err(e.id, 'optional_progress', '선택 검색(optional)이 진행 플래그를 주면 안 됩니다.');
    if (e.optional && [e.grants, ...(e.conditional ?? []).map((x) => x.grants)].some((g) => g?.evidence?.length))
      err(e.id, 'optional_progress', '선택 검색(optional)이 증거를 주면 안 됩니다.');
  }
  // 칩(검색어 수첩)으로 주어지는 표현은 반드시 색인에 맞아야 한다
  const chipTerms = new Set<string>();
  for (const { owner, grants } of allGrants(content))
    for (const t of grants.terms ?? []) {
      chipTerms.add(t);
      if (searchIndex(content.searchEntries, t, visibleAll).status !== 'ok')
        err(owner, 'term_unindexed', `검색어 '${t}'이(가) 어떤 색인에도 맞지 않습니다.`);
    }
  // 진행에 필요한 색인 항목은 칩만으로 닿아야 한다(모바일 탭 전용 플레이 보장)
  const chipReach = new Set<Id>();
  for (const t of chipTerms) searchIndex(content.searchEntries, t, visibleAll).matches.forEach((m) => chipReach.add(m.entry.id));
  for (const e of content.searchEntries) {
    const givesProgress =
      !!e.grants?.flags?.length || [e.grants, ...(e.conditional ?? []).map((x) => x.grants)].some((g) => g?.evidence?.length);
    if (!e.optional && givesProgress && !chipReach.has(e.id))
      err(e.id, 'search_needs_typing', '진행에 필요한 색인 항목이 검색어 칩으로 닿지 않습니다.');
  }

  // 6.5 레코드
  for (const r of content.records) {
    if (r.altered && r.provenance !== 'fictional')
      err(r.id, 'altered_not_fictional', '변조된 레코드(altered)는 fictional 이어야 합니다(실제 역사로 표시 금지).');
    const keys = new Set<string>();
    for (const f of r.fields) {
      if (keys.has(f.key)) err(r.id, 'duplicate_field', `필드 key 중복: ${f.key}`);
      keys.add(f.key);
    }
  }

  // 6.6 사료 구절: 검증된 사료의 원문 그대로
  for (const p of content.phrases) {
    ref(p.id, p.sourceId, 'sources');
    const src = idx.sources[p.sourceId];
    if (!src) continue;
    if (src.provenance === 'reconstructed' || (p.provenance === 'verified' && src.provenance !== 'verified'))
      err(p.id, 'phrase_unverified_source', '구절은 verified 사료(샘플은 fictional)에서만 고를 수 있습니다.');
    if (!src.excerpt || !src.excerpt.includes(p.text))
      err(p.id, 'phrase_not_in_excerpt', `구절이 사료 원문(excerpt)에 없습니다: ${p.text}`);
    checkGrants(p.id, p.grants);
  }

  // 6.7 관측 타임라인
  for (const tl of content.timelines) {
    if (!(tl.start < tl.end) || tl.initial < tl.start || tl.initial > tl.end)
      err(tl.id, 'bad_timeline', '타임라인 범위(start < end, start ≤ initial ≤ end)가 올바르지 않습니다.');
    ref(tl.id, tl.observationId, 'observations');
    if (tl.returnObservationId) ref(tl.id, tl.returnObservationId, 'observations');
    const span: TimeWindow = { from: tl.start, to: tl.end + 1 };
    const checkWindows = (owner: Id, ws?: TimeWindow[]) => {
      for (const w of ws ?? []) {
        if (!(w.from < w.to)) err(owner, 'bad_window', `시각 구간 [${w.from}, ${w.to}) 이 올바르지 않습니다.`);
        else if (!windowsOverlap(w, span))
          err(owner, 'window_outside_timeline', `시각 구간 [${w.from}, ${w.to}) 이 타임라인 밖입니다.`);
      }
    };
    const ids = new Set<Id>();
    for (const h of tl.hotspots) {
      if (ids.has(h.id)) err(tl.id, 'duplicate_hotspot', `핫스팟 중복: ${h.id}`);
      ids.add(h.id);
      checkWindows(h.id, h.windows);
      if (h.kind === 'object') {
        const o = idx.worldObjects[h.targetId];
        if (!o) err(h.id, 'missing_ref', `오브젝트가 없습니다: ${h.targetId}`);
        else if (o.sceneId !== tl.sceneId) err(h.id, 'wrong_scene', `${o.id} 은(는) ${tl.sceneId} 씬에 없습니다.`);
      } else {
        const n = idx.npcs[h.targetId];
        if (!n) {
          err(h.id, 'missing_ref', `인물이 없습니다: ${h.targetId}`);
          continue;
        }
        if (n.sceneId !== tl.sceneId) err(h.id, 'wrong_scene', `${n.id} 은(는) ${tl.sceneId} 씬에 없습니다.`);
        for (const l of n.dialogue) checkWindows(`${n.id}#${l.id}`, l.at);
      }
    }
    // 씬의 모든 사물·인물이 핫스팟이어야 한다(관측 경계 제외)
    for (const o of content.worldObjects.filter((w) => w.sceneId === tl.sceneId && w.kind !== 'door' && w.kind !== 'observe'))
      if (![...tl.hotspots].some((h) => h.targetId === o.id)) err(o.id, 'not_in_timeline', '관측 뷰어 핫스팟이 아닙니다.');
    for (const n of content.npcs.filter((x) => x.sceneId === tl.sceneId))
      if (![...tl.hotspots].some((h) => h.targetId === n.id)) err(n.id, 'not_in_timeline', '관측 뷰어 핫스팟이 아닙니다.');
    for (const o of content.worldObjects) checkWindows(o.id, o.windows);
    // 증거를 주는 사물은 구간 안 어딘가에서 열려 있어야 한다
    for (const h of tl.hotspots.filter((x) => x.kind === 'object')) {
      const o = idx.worldObjects[h.targetId];
      if (o?.grants && h.windows?.length && !h.windows.some((w) => windowsOverlap(w, span)))
        err(h.id, 'unreachable_hotspot', '핫스팟이 타임라인 안에서 한 번도 열리지 않습니다.');
    }
  }

  // 6.8 메시지
  for (const m of content.messages) {
    checkGrants(m.id, m.grants);
    const ch = new Set<Id>();
    for (const c of m.choices ?? []) {
      if (ch.has(c.id)) err(m.id, 'duplicate_choice', `선택지 id 중복: ${c.id}`);
      ch.add(c.id);
      for (const f of c.setsFlags ?? [])
        if (puzzleFlags.has(f) || content.apps.some((a) => a.unlockWhen?.all?.includes(f)))
          err(m.id, 'choice_solves_puzzle', `답장 선택지가 진행·퍼즐 플래그 '${f}'을(를) 세웁니다.`);
    }
  }

  // 6.9 기록관·보정·메모
  for (const x of content.exhibits) {
    checkGrants(x.id, x.grants);
    x.collectionIds?.forEach((id) => ref(x.id, id, 'collection'));
  }
  for (const e of content.corrections) {
    checkGrants(e.id, e.grants);
    for (const p of e.recordPatches) {
      const r = idx.records[p.recordId];
      if (!r) err(e.id, 'missing_ref', `레코드가 없습니다: ${p.recordId}`);
      else if (r.provenance !== 'fictional') err(e.id, 'correction_touches_fact', '보정은 fictional 레코드만 바꿀 수 있습니다.');
      else if (!r.fields.some((f) => f.key === p.key)) err(e.id, 'missing_ref', `레코드 필드가 없습니다: ${p.key}`);
    }
    for (const p of e.memoPatches) {
      const m = idx.memos[p.memoId];
      if (!m) err(e.id, 'missing_ref', `메모가 없습니다: ${p.memoId}`);
      else if (m.provenance !== 'fictional') err(e.id, 'correction_touches_fact', '보정은 fictional 메모만 바꿀 수 있습니다.');
      if (p.text === undefined && !p.remove) err(e.id, 'empty_patch', `메모 보정 ${p.memoId} 에 text 도 remove 도 없습니다.`);
    }
  }

  // 6.9b 현실 이동(복원) · 기록하기 · 카드 겹치기
  validateReality(content, idx, err, ref, checkGrants, produced);

  // 6.10 튜토리얼
  for (const t of content.tutorial) {
    if (t.coach.length > 45 || (t.coach.match(/[.?!。]/g) ?? []).length > 2)
      warn(t.id, 'coach_too_long', '코치마크는 짧은 한 문장이어야 합니다.');
    if (t.hints.some((h) => !h.trim())) err(t.id, 'empty_hint', '힌트 3단계가 모두 있어야 합니다.');
  }
}

const isUrl = (u?: string) => !!u && URL_RE.test(u);

function validateReality(
  content: ContentBundle,
  idx: ContentIndex,
  err: Report,
  ref: (owner: Id, id: Id, key?: ContentKey) => void,
  checkGrants: (owner: Id, g?: Grants) => void,
  produced: Set<string>,
) {
  const restoredIds = new Set<Id>();
  for (const sh of content.shifts) {
    checkGrants(sh.id, sh.unlocks);
    if (!sh.messageRewrites.length && !sh.recordRewrites.length)
      err(sh.id, 'shift_rewrites_nothing', '현실 이동은 메시지나 레코드를 하나 이상 다시 써야 합니다.');
    for (const r of sh.messageRewrites) {
      ref(sh.id, r.messageId, 'messages');
      if (!r.newText.trim()) err(sh.id, 'empty_rewrite', `메시지 ${r.messageId} 의 새 본문이 비었습니다.`);
    }
    for (const r of sh.recordRewrites) {
      const rec = idx.records[r.recordId];
      if (!rec) {
        err(sh.id, 'missing_ref', `레코드가 없습니다: ${r.recordId}`);
        continue;
      }
      if (!rec.altered) err(sh.id, 'shift_touches_unaltered', `변조되지 않은 레코드 ${rec.id} 는 복원 대상이 아닙니다.`);
      const prov = r.provenance ?? rec.provenance;
      if (prov === 'verified' && !(r.sources ?? rec.sources ?? []).some((x) => isUrl(x.url)))
        err(sh.id, 'verified_without_source', `복원된 레코드 ${rec.id} 에 url 출처가 없습니다.`);
    }
    for (const r of sh.searchRewrites ?? []) {
      ref(sh.id, r.entryId, 'searchEntries');
      for (const x of r.results) ref(sh.id, x.id, SEARCH_REF_KEY[x.kind]);
    }
    if (!sh.restores.length) err(sh.id, 'shift_restores_nothing', '복원 목록(restores)이 비었습니다.');
    for (const r of sh.restores) {
      const key: ContentKey = r.kind === 'source' ? 'sources' : r.kind === 'event' ? 'events' : 'records';
      ref(sh.id, r.id, key);
      const item = idx[key][r.id] as ContentBase | undefined;
      if (item && r.kind !== 'record' && item.provenance !== 'verified')
        err(sh.id, 'restored_unverified', `복원되는 ${r.id} 는 verified 여야 합니다.`);
      if (r.kind === 'record' && item && !sh.recordRewrites.some((x) => x.recordId === r.id && (x.provenance ?? item.provenance) === 'verified'))
        err(sh.id, 'restored_unverified', `복원되는 레코드 ${r.id} 는 verified 로 다시 쓰여야 합니다.`);
      if (r.kind !== 'record') restoredIds.add(r.id);
    }
    if (!sh.notebookDiff.length) err(sh.id, 'no_notebook_diff', '손 노트의 이전/이후가 없습니다.');
    for (const d of sh.notebookDiff) if (!d.before.trim() || !d.after.trim()) err(sh.id, 'empty_diff', `손 노트 diff ${d.id} 가 비었습니다.`);
    // 도달 가능: 기록하기가 이 이동을 일으키거나, when 이 생산 가능한 조건이어야
    const byAct = content.acts.some((a) => a.restores === sh.id);
    const recorded = sh.when.recorded ?? [];
    if (!byAct && !(sh.when.all ?? []).length) err(sh.id, 'shift_unreachable', '이 현실 이동을 일으키는 기록하기가 없습니다.');
    for (const a of recorded) if (idx.acts[a] && idx.acts[a]!.restores !== sh.id) err(sh.id, 'act_mismatch', `기록 ${a} 는 다른 현실 이동을 가리킵니다.`);
  }

  // 말소된 사료·사건은 복원 전에 닿을 수 없어야 한다
  for (const e of content.searchEntries)
    for (const r of e.results) if (restoredIds.has(r.id)) err(e.id, 'erased_reachable', `복원 전 검색 결과에 말소된 ${r.id} 가 있습니다.`);
  for (const { owner, grants } of allGrants(content)) {
    if (idx.shifts[owner]) continue;
    for (const id of grants.sources ?? []) if (restoredIds.has(id)) err(owner, 'erased_reachable', `복원 전에 말소된 사료 ${id} 를 줍니다.`);
  }

  for (const a of content.acts) {
    ref(a.id, a.restores, 'shifts');
    if (a.provenance !== 'verified') err(a.id, 'act_unverified', '기록하기 문장은 verified 여야 합니다(검증된 문장만 직필).');
    if (!a.sentence.trim()) err(a.id, 'empty_sentence', '기록할 문장이 비었습니다.');
    const sh = idx.shifts[a.restores];
    if (sh && !(sh.when.recorded ?? []).includes(a.id))
      err(a.id, 'act_mismatch', `현실 이동 ${sh.id} 의 when 에 recorded: ['${a.id}'] 가 없습니다.`);
    for (const f of a.requires.all ?? []) if (!produced.has(f)) err(a.id, 'unreachable_flag', `플래그 '${f}'을(를) 세우는 곳이 없습니다.`);
  }

  const sets = new Set<string>();
  for (const l of content.links) {
    if (l.inputs.length < 2) err(l.id, 'bad_link', '카드 겹치기는 2장 이상이어야 합니다.');
    l.inputs.forEach((id) => ref(l.id, id, 'evidence'));
    ref(l.id, l.result.id, 'evidence');
    if (l.inputs.includes(l.result.id)) err(l.id, 'bad_link', '결과 카드가 입력에 들어 있습니다.');
    const key = [...l.inputs].sort().join('+');
    if (sets.has(key)) err(l.id, 'duplicate_link', '같은 카드 조합의 겹치기가 둘 있습니다.');
    sets.add(key);
    checkGrants(l.id, l.grants);
  }
}
