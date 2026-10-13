/**
 * 콘텐츠 검증기(v3 「대조」). 레지스트리 전체를 테스트가 검사한다(tests/unit/validate.test.ts).
 *  1. id 유일성(대사 id 포함)          2. provenance·출처 규칙          3. 모든 참조
 *  4. 단서 프레임 조건이 실제로 만족 가능한가(대사 시각 구간이 겹치는가)
 *  5. 연대 제약 정합                   6. 보고서 4칸이 데이터로 풀리는가(브루트포스) + 오답 후보가 가려지는가
 *  7. 복원 규칙(복원되는 사료·사건 verified, 복원 레코드 verified+출처, 변조 레코드 fictional)
 *  8. 들은 말의 칩이 색인에 있는가     9. 해결 전 화면의 4자리 연도 금지 · 힌트·피드백의 정답 금지 · 현대 문장의 '졸' 금지
 */
import { findLine, inWindow } from './observation';
import { normalizeQuery, searchIndex } from './search';
import { CONTENT_KEYS, indexContent, type ContentIndex } from './content';
import { judgeReport, emptyDraft, frameClues, type Frame, type ReportDraft, type ViewerSnapshot } from './report';
import type { BlankKey, ContentBase, ContentBundle, ContentKey, ContentModule, Id, SourceRef, TimeWindow } from './types';
import { BLANK_KEYS } from './types';

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

const URL_RE = /^https?:\/\/\S+$/;
/** 4자리 연도(좌표 코드 #C-0000 은 제외) */
export const YEAR_RE = /(?<![\d-])\d{4}(?!\d)/;
export const hasYear = (text: string) => YEAR_RE.test(text.replace(/#C-\d{4}/g, ''));
/** 현대 문장에서 쓰지 않는 말(실록 인용 밖) */
export const ARCHAIC_DEATH_RE = /졸/;

export interface ValidateOptions {
  historical?: ContentModule;
  /** 힌트·보고서 피드백에 나오면 안 되는 정답 낱말 */
  answerWords?: string[];
}

export function validateContent(content: ContentBundle, opts: ValidateOptions = {}): ValidationReport {
  const issues: ValidationIssue[] = [];
  const err = (id: Id, code: string, message: string) => issues.push({ severity: 'error', code, id, message });
  const warn = (id: Id, code: string, message: string) => issues.push({ severity: 'warning', code, id, message });
  const idx: ContentIndex = indexContent(content);

  // 1. id 유일성
  const seen = new Map<Id, ContentKey>();
  for (const key of CONTENT_KEYS)
    for (const item of content[key]) {
      if (!item.id) err('(empty)', 'empty_id', `${key} 항목에 id 가 없습니다.`);
      else if (seen.has(item.id)) err(item.id, 'duplicate_id', `id 중복: ${seen.get(item.id)} / ${key}`);
      else seen.set(item.id, key);
    }
  const lineIds = new Set<Id>();
  for (const npc of content.npcs)
    for (const l of npc.dialogue) {
      if (lineIds.has(l.id)) err(`${npc.id}#${l.id}`, 'duplicate_line_id', '대사 id 는 콘텐츠 전체에서 유일해야 합니다.');
      lineIds.add(l.id);
    }
  const has = (key: ContentKey, id: Id) => id in idx[key];
  const ref = (owner: Id, id: Id, key: ContentKey) => {
    if (!has(key, id)) err(owner, 'missing_ref', `참조 대상이 없습니다: ${id} (${key})`);
  };

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
  for (const npc of content.npcs) for (const l of npc.dialogue) checkProvenance(`${npc.id}#${l.id}`, l.provenance, l.sources);
  for (const key of CONTENT_KEYS)
    for (const item of opts.historical?.[key] ?? [])
      if (item.provenance === 'fictional') err(item.id, 'fictional_in_historical', 'historical 모듈에는 fictional 항목을 둘 수 없습니다.');

  // 3. 참조
  for (const e of content.events) {
    for (const id of e.personIds ?? []) ref(e.id, id, 'persons');
    for (const id of e.sourceIds ?? []) ref(e.id, id, 'sources');
    if (e.placeId) ref(e.id, e.placeId, 'places');
  }
  for (const se of content.searchEntries) {
    if (!se.terms.length) err(se.id, 'no_terms', '색인어가 없습니다.');
    for (const r of se.results) ref(se.id, r.id, KIND_KEY[r.kind]);
    if (se.noArticle && se.results.length) err(se.id, 'no_article_with_results', '말소된 기사 항목은 결과가 비어 있어야 합니다.');
  }
  for (const r of content.records) if (r.personId) ref(r.id, r.personId, 'persons');
  for (const tl of content.timelines)
    for (const h of tl.hotspots) ref(`${tl.id}#${h.id}`, h.targetId, h.kind === 'npc' ? 'npcs' : 'worldObjects');
  const hotspotIds = new Set(content.timelines.flatMap((t) => t.hotspots.map((h) => h.id)));
  for (const a of content.assignments) {
    ref(a.id, a.timelineId, 'timelines');
    ref(a.id, a.reportId, 'reports');
    for (const r of a.refs) {
      if (r.recordId) ref(a.id, r.recordId, 'records');
      if (r.searchEntryId) ref(a.id, r.searchEntryId, 'searchEntries');
    }
    const finals = a.checklist.filter((i) => i.final);
    if (finals.length !== 1) err(a.id, 'final_item', '체크리스트에는 마지막 판정 항목이 정확히 하나 있어야 합니다.');
    for (const i of a.checklist) {
      if (!i.final && !i.expected) err(i.id, 'no_expected', '판정 항목이 아니면 기대 판정이 필요합니다.');
      for (const c of i.final?.mismatchNeedsAnyClue ?? []) ref(i.id, c, 'clues');
      for (const c of i.ready.clues ?? []) ref(i.id, c, 'clues');
      for (const l of i.ready.heard ?? []) if (!lineIds.has(l)) err(i.id, 'missing_line', `없는 대사: ${l}`);
      for (const h of [...(i.ready.seen ?? []), ...(i.ready.any ?? []).flatMap((x) => x.seen ?? [])])
        if (!hotspotIds.has(h)) err(i.id, 'missing_hotspot', `없는 핫스팟: ${h}`);
    }
  }
  for (const m of content.messages) for (const c of m.choices ?? []) if (!c.text) err(m.id, 'empty_choice', '빈 답장');
  for (const h of content.hints)
    for (const st of h.steps) {
      ref(h.id, st.messageId, 'messages');
      if (idx.messages[st.messageId] && !idx.messages[st.messageId]!.hint)
        err(h.id, 'hint_not_hint', `힌트 메시지는 hint: true 여야 합니다: ${st.messageId}`);
    }
  for (const m of content.messages) if (m.hint && m.when) err(m.id, 'hint_with_when', '힌트 메시지는 when 으로 오지 않는다.');
  for (const e of content.corrections) {
    for (const d of e.degrade) {
      if (d.clue) ref(e.id, d.clue, 'clues');
      if (d.from >= d.to) err(e.id, 'bad_span', '훼손 구간이 비었습니다.');
    }
    if (e.closure) ref(e.id, e.closure.assignmentId, 'assignments');
  }
  for (const sh of content.shifts) {
    for (const r of sh.messageRewrites) ref(sh.id, r.messageId, 'messages');
    for (const r of sh.recordRewrites) ref(sh.id, r.recordId, 'records');
    for (const r of sh.searchRewrites ?? []) {
      ref(sh.id, r.entryId, 'searchEntries');
      for (const x of r.results) ref(sh.id, x.id, KIND_KEY[x.kind]);
    }
    for (const r of sh.assignmentRewrites ?? []) ref(sh.id, r.assignmentId, 'assignments');
    for (const r of sh.closedRewrites ?? []) ref(sh.id, r.reportId, 'closedReports');
    if (sh.closureRewrite) ref(sh.id, sh.closureRewrite.assignmentId, 'assignments');
    for (const r of sh.restores) ref(sh.id, r.id, r.kind === 'source' ? 'sources' : r.kind === 'event' ? 'events' : 'records');
  }

  // 4. 단서
  for (const c of content.clues) {
    const sources = [c.frame && 'frame', c.record && 'record', c.combo && 'combo'].filter(Boolean);
    if (sources.length !== 1) err(c.id, 'clue_source', '단서는 frame / record / combo 중 정확히 하나에서 생겨야 합니다.');
    if (c.record) ref(c.id, c.record, 'records');
    for (const x of [...(c.combo?.all ?? []), ...(c.combo?.report ?? [])]) ref(c.id, x, 'clues');
    if (c.frame) {
      const f = c.frame;
      for (const l of [...(f.heard ?? []), ...(f.heardAny ?? [])]) if (!lineIds.has(l)) err(c.id, 'missing_line', `없는 대사: ${l}`);
      for (const h of [...(f.visible ?? []), ...(f.visibleAny ?? [])]) if (!hotspotIds.has(h)) err(c.id, 'missing_hotspot', `없는 핫스팟: ${h}`);
      if (!idealSnapshot(c.frame, content)) err(c.id, 'clue_unsatisfiable', '이 단서를 만족하는 시각이 없습니다(대사 구간이 겹치지 않음).');
    }
    if (c.time) {
      const t = c.time;
      if (t.notBefore === undefined && t.notAfter === undefined) err(c.id, 'empty_time', '연대 제약에 경계가 없습니다.');
      if (t.notBefore !== undefined && t.notAfter !== undefined && t.notBefore > t.notAfter) err(c.id, 'bad_time', 'notBefore > notAfter');
      if (t.feedback && hasYear(t.feedback)) err(c.id, 'year_in_feedback', '연대 피드백에 4자리 연도가 있습니다.');
    }
  }

  // 5~6. 보고서
  for (const r of content.reports) {
    ref(r.id, r.assignmentId, 'assignments');
    ref(r.id, r.restores, 'shifts');
    for (const p of r.who.candidates) ref(r.id, p, 'persons');
    if (!r.who.candidates.includes(r.who.answer)) err(r.id, 'answer_not_candidate', '누구 칸의 정답이 후보에 없습니다.');
    const ans = idx.persons[r.who.answer];
    for (const f of r.who.requiredFacts)
      if (ans && !ans.facts.some((x) => x.kind === f.kind && x.value === f.value))
        err(r.id, 'answer_lacks_fact', `정답 인물에게 필요한 사실이 없습니다: ${f.value}`);
    const sol = solveReport(r.id, content);
    for (const k of BLANK_KEYS) if (!sol.solved[k]) err(r.id, 'blank_unsolvable', `'${k}' 칸을 데이터로 확인할 수 있는 첨부 조합이 없습니다.`);
    for (const p of r.who.candidates) {
      const person = idx.persons[p];
      if (p === r.who.answer || !person) continue;
      if (sol.candidateConfirms.includes(p)) err(r.id, 'indistinguishable', `오답 후보 ${p} 도 확인됩니다.`);
      else if (r.who.requiredFacts.every((f) => person.facts.some((x) => x.kind === f.kind && x.value === f.value)))
        err(r.id, 'indistinguishable', `오답 후보 ${p} 가 필요한 사실을 모두 가져 근거로 가려지지 않습니다.`);
    }
  }

  // 7. 복원 규칙
  for (const rec of content.records)
    if (rec.altered && rec.provenance !== 'fictional') err(rec.id, 'altered_not_fictional', '변조 레코드는 fictional 이어야 합니다.');
  for (const sh of content.shifts) {
    for (const r of sh.restores) {
      const item = r.kind === 'source' ? idx.sources[r.id] : r.kind === 'event' ? idx.events[r.id] : undefined;
      if (item && item.provenance !== 'verified') err(sh.id, 'restored_not_verified', `복원되는 ${r.kind} 는 verified 여야 합니다: ${r.id}`);
      if (r.kind === 'record' && !sh.recordRewrites.some((w) => w.recordId === r.id && w.provenance === 'verified'))
        err(sh.id, 'restored_record_not_verified', `복원 레코드는 verified 로 다시 써야 합니다: ${r.id}`);
    }
    for (const w of sh.recordRewrites)
      if (w.provenance === 'verified' && !(w.sources ?? []).some((s) => URL_RE.test(s.url)))
        err(sh.id, 'rewrite_without_source', `verified 로 다시 쓰는 레코드에는 출처가 필요합니다: ${w.recordId}`);
  }
  for (const se of content.searchEntries)
    if (se.noArticle && !content.shifts.some((sh) => sh.searchRewrites?.some((w) => w.entryId === se.id)))
      warn(se.id, 'no_article_never_restored', '이 말소된 기사를 채우는 현실 이동이 없습니다.');

  // 8. 들은 말의 칩은 색인에 있어야 한다
  const termOwners = [
    ...content.npcs.flatMap((n) => n.dialogue.map((l) => ({ owner: `${n.id}#${l.id}`, terms: l.grants?.terms ?? [] }))),
    ...content.worldObjects.map((o) => ({ owner: o.id, terms: o.grants?.terms ?? [] })),
    ...content.searchEntries.map((e) => ({ owner: e.id, terms: e.grants?.terms ?? [] })),
    ...content.messages.map((m) => ({ owner: m.id, terms: m.grants?.terms ?? [] })),
  ];
  for (const { owner, terms } of termOwners)
    for (const t of terms)
      if (!searchIndex(content.searchEntries, t).matches.some((m) => normalizeQuery(m.term) === normalizeQuery(t)))
        err(owner, 'term_not_indexed', `칩 '${t}' 이(가) 색인에 정확히 없습니다.`);

  // 9. 정보 공개 규칙
  const beforeSolve: { owner: Id; text: string }[] = [
    ...content.assignments.flatMap((a) => [
      { owner: a.id, text: [a.title, a.code, a.detection, ...a.header.map((h) => `${h.label} ${h.value}`), ...a.refs.map((r) => r.title)].join(' ') },
      ...a.checklist.map((i) => ({
        owner: i.id,
        text: [i.title, i.refLabel, i.prompt, i.notReadyText, i.wrongText ?? '', i.final?.recommendText ?? '', i.final?.mismatchNeedsText ?? ''].join(' '),
      })),
    ]),
    ...content.timelines.map((t) => ({ owner: t.id, text: [t.title, ...t.meta.map((m) => `${m.label} ${m.value}`)].join(' ') })),
    ...content.messages.filter((m) => m.hint).map((m) => ({ owner: m.id, text: m.text })),
    ...content.closedReports.map((c) => ({ owner: c.id, text: [c.code, c.when, c.verdict, c.classification, c.note, ...(c.fields ?? []).map((f) => f.value)].join(' ') })),
    ...content.reports.map((r) => ({ owner: r.id, text: reportTexts(r).join(' ') })),
    ...content.worldObjects.map((o) => ({ owner: o.id, text: [o.label, ...o.examine, o.hiddenText ?? ''].join(' ') })),
    ...content.npcs.map((n) => ({ owner: n.id, text: n.label })),
  ];
  for (const { owner, text } of beforeSolve) if (hasYear(text)) err(owner, 'year_leak', `해결 전 화면에 4자리 연도: ${text.slice(0, 60)}`);
  const answers = opts.answerWords ?? [];
  const noAnswer: { owner: Id; text: string }[] = [
    ...content.messages.filter((m) => m.hint).map((m) => ({ owner: m.id, text: m.text })),
    ...content.reports.map((r) => ({ owner: r.id, text: reportTexts(r).join(' ') })),
    ...content.assignments.flatMap((a) => a.checklist.map((i) => ({ owner: i.id, text: [i.prompt, i.notReadyText, i.wrongText ?? ''].join(' ') }))),
  ];
  for (const { owner, text } of noAnswer)
    for (const w of answers) if (text.includes(w)) err(owner, 'answer_leak', `정답 낱말 '${w}' 이(가) 힌트·피드백에 있습니다.`);
  const modern: { owner: Id; text: string }[] = [
    ...content.records.map((r) => ({ owner: r.id, text: [r.title, ...r.fields.map((f) => `${f.label} ${f.value}`), r.note ?? ''].join(' ') })),
    ...content.shifts.flatMap((sh) => sh.recordRewrites.map((w) => ({ owner: sh.id, text: (w.fields ?? []).map((f) => `${f.label} ${f.value}`).join(' ') }))),
    ...content.messages.filter((m) => m.provenance !== 'verified').map((m) => ({ owner: m.id, text: m.text })),
    ...content.shifts.flatMap((sh) => sh.messageRewrites.map((w) => ({ owner: sh.id, text: w.newText }))),
    ...content.closedReports.map((c) => ({ owner: c.id, text: c.note })),
    ...content.clues.map((c) => ({ owner: c.id, text: `${c.label} ${c.text}` })),
    ...beforeSolve,
  ];
  for (const { owner, text } of modern) if (ARCHAIC_DEATH_RE.test(text)) err(owner, 'archaic_term', `현대 문장에 '졸' — '사망'을 쓴다: ${text.slice(0, 40)}`);

  const errors = issues.filter((i) => i.severity === 'error');
  return { ok: errors.length === 0, errors, warnings: issues.filter((i) => i.severity === 'warning') };
}

const KIND_KEY: Record<string, ContentKey> = {
  person: 'persons',
  artifact: 'artifacts',
  source: 'sources',
  event: 'events',
  place: 'places',
  record: 'records',
};

function reportTexts(r: ContentBundle['reports'][number]): string[] {
  const fb = (b: { label: string; prompt: string; emptyText: string; missingText: string[]; wrong?: { message: string }[]; near?: { message: string }[]; tips?: { message: string }[] }) => [
    b.label,
    b.prompt,
    b.emptyText,
    ...b.missingText,
    ...(b.wrong ?? []).map((x) => x.message),
    ...(b.near ?? []).map((x) => x.message),
    ...(b.tips ?? []).map((x) => x.message),
  ];
  return [
    r.when.label,
    r.when.prompt,
    r.when.emptyText,
    r.when.noYearText,
    ...Object.values(r.when.messages),
    ...(r.when.tips ?? []).map((t) => t.message),
    r.who.label,
    r.who.prompt,
    r.who.noPersonText,
    r.who.twoPersonsText,
    ...(r.who.tips ?? []).map((t) => t.message),
    ...fb(r.what),
    ...fb(r.result),
  ].filter((x): x is string => typeof x === 'string');
}

/**
 * 프레임 조건을 만족하는 이상적인 스냅숏(검증·테스트용). 대사 구간과 minute 구간이 모두 겹치는 첫 분을 고른다. 없으면 null.
 * 보이는 핫스팟 = visible + visibleAny 첫째 + 들리는 대사의 화자 핫스팟.
 */
export function idealSnapshot(m: NonNullable<ContentBundle['clues'][number]['frame']>, c: Pick<ContentBundle, 'npcs' | 'timelines'>): ViewerSnapshot | null {
  const heard = [...(m.heard ?? []), ...(m.heardAny?.length ? [m.heardAny[0]!] : [])];
  const windows: TimeWindow[][] = heard.map((id) => findLine(c.npcs, id)?.line.at ?? [{ from: 0, to: 1440 }]);
  if (m.minute) windows.push([m.minute]);
  const tl = c.timelines[0];
  const start = tl?.start ?? 0;
  const end = tl?.end ?? 1440;
  for (let minute = start; minute <= end; minute++) {
    if (!windows.every((ws) => inWindow(minute, ws))) continue;
    const speakers = heard.map((id) => `hs_${findLine(c.npcs, id)?.npc.id}`);
    return {
      minute,
      centerTile: { x: 0, y: 0 },
      zoom: 2,
      visibleHotspotIds: [...new Set([...(m.visible ?? []), ...(m.visibleAny?.length ? [m.visibleAny[0]!] : []), ...speakers])],
      heardLineIds: heard,
    };
  }
  return null;
}

/**
 * 보고서 풀이 가능성(브루트포스): 모든 프레임 단서의 이상적 프레임 + 모든 DB 기록을 재료로,
 * 각 칸을 첨부 1~2개로 확인할 수 있는지 본다(다른 칸에는 재료 전부를 붙여 '보고서 어딘가' 조건을 채운다).
 * candidateConfirms: 누구 칸을 확인시키는 후보(정답 하나여야 한다).
 */
export function solveReport(reportId: Id, c: ContentBundle): { solved: Record<BlankKey, boolean>; candidateConfirms: Id[]; example: Partial<Record<BlankKey, string[]>> } {
  const spec = c.reports.find((r) => r.id === reportId)!;
  const frames: Frame[] = [];
  for (const cl of c.clues) {
    if (!cl.frame) continue;
    const snap = idealSnapshot(cl.frame, c);
    if (snap) frames.push({ ...snap, id: `ideal_${cl.id}`, seq: frames.length + 1, clueIds: frameClues(snap, c.clues) });
  }
  const persons = Object.fromEntries(c.persons.map((p) => [p.id, p]));
  const records = Object.fromEntries(c.records.map((r) => [r.id, r]));
  const w = { clues: c.clues, frames, records, persons };
  const pool = [...frames.map((f) => ({ kind: 'frame' as const, id: f.id })), ...c.records.map((r) => ({ kind: 'record' as const, id: r.id }))];
  const pairs: (typeof pool)[] = [];
  for (let i = 0; i < pool.length; i++) {
    pairs.push([pool[i]!]);
    for (let j = i + 1; j < pool.length; j++) pairs.push([pool[i]!, pool[j]!]);
  }
  const solved = { when: false, who: false, what: false, result: false } as Record<BlankKey, boolean>;
  const example: Partial<Record<BlankKey, string[]>> = {};
  const candidateConfirms = new Set<Id>();
  for (const k of BLANK_KEYS)
    for (const p of pairs) {
      const draft: ReportDraft = emptyDraft();
      for (const o of BLANK_KEYS) if (o !== k && o !== 'who') draft[o].attachments = pool.filter((x) => x.kind === 'frame');
      draft[k].attachments = p;
      draft.when.from = spec.when.target.from;
      draft.when.to = spec.when.target.to;
      const res = judgeReport(spec, draft, w).blanks[k];
      if (res.verdict === 'confirmed') {
        solved[k] = true;
        example[k] ??= p.map((x) => x.id);
        if (k === 'who') for (const x of p) if (x.kind === 'record' && records[x.id]?.personId) candidateConfirms.add(records[x.id]!.personId!);
      }
    }
  return { solved, candidateConfirms: [...candidateConfirms], example };
}
