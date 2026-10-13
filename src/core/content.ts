import type {
  ContentBundle,
  ContentKey,
  ContentModule,
  Evidence,
  EvidenceView,
  Fact,
  FactKind,
  Feedback,
  Id,
  JudgeContext,
  TimeConstraint,
} from './types';

export const CONTENT_KEYS: readonly ContentKey[] = [
  'persons',
  'artifacts',
  'sources',
  'events',
  'places',
  'evidence',
  'deductions',
  'observations',
  'worldObjects',
  'npcs',
  'collection',
];

export function emptyBundle(): ContentBundle {
  return {
    persons: [],
    artifacts: [],
    sources: [],
    events: [],
    places: [],
    evidence: [],
    deductions: [],
    observations: [],
    worldObjects: [],
    npcs: [],
    collection: [],
  };
}

export function mergeModules(...modules: ContentModule[]): ContentBundle {
  const out = emptyBundle();
  for (const m of modules) {
    for (const key of CONTENT_KEYS) {
      const items = m[key];
      if (items) (out[key] as unknown[]).push(...items);
    }
  }
  return out;
}

type ById<T> = Readonly<Record<Id, T>>;
export type ContentIndex = { [K in ContentKey]: ById<ContentBundle[K][number]> };

export function indexContent(c: ContentBundle): ContentIndex {
  const idx = {} as Record<ContentKey, Record<Id, unknown>>;
  for (const key of CONTENT_KEYS) {
    idx[key] = Object.fromEntries(c[key].map((item) => [item.id, item]));
  }
  return idx as ContentIndex;
}

export const FACT_LABELS: Record<FactKind, string> = {
  name: '이름',
  courtesyName: '자(字)',
  penName: '호(號)',
  office: '관직',
  clan: '본관',
  origin: '출신',
  relation: '관계',
  possession: '소유물',
  handwriting: '필적',
  event: '관련 사건',
  claim: '기록 내용',
  trait: '특징',
};

export const sameFact = (a: Fact, b: Fact) => a.kind === b.kind && a.value === b.value;
export const hasFact = (list: readonly Fact[], f: Fact) => list.some((x) => sameFact(x, f));
export const factText = (f: Fact) => `${FACT_LABELS[f.kind]}: ${f.value}`;

export function maxLevel(ev: Evidence): number {
  return ev.levels.length - 1;
}

/** level 단계까지의 증거 정보. 사실은 누적, 연대 제약은 가장 늦은 단계 것이 유효. */
export function evidenceView(ev: Evidence, level: number): EvidenceView {
  const lv = Math.max(0, Math.min(Math.floor(level), maxLevel(ev)));
  const facts: Fact[] = [];
  let time: TimeConstraint | undefined;
  for (let i = 0; i <= lv; i++) {
    const step = ev.levels[i]!;
    for (const f of step.proves ?? []) if (!hasFact(facts, f)) facts.push(f);
    if (step.time) time = step.time;
  }
  const top = ev.levels[lv]!;
  return { id: ev.id, level: lv, label: top.label, text: top.text, facts, time };
}

/** 인용 증거를 보유 단계 기준으로 펼친다. 중복 제거, 미보유/미존재는 피드백으로 돌려준다. */
export function citeEvidence(ids: readonly Id[], ctx: JudgeContext): { views: EvidenceView[]; feedback: Feedback[] } {
  const views: EvidenceView[] = [];
  const feedback: Feedback[] = [];
  for (const id of new Set(ids)) {
    const ev = ctx.evidence[id];
    const level = ctx.owned[id];
    if (!ev) feedback.push({ code: 'unknown_evidence', evidenceId: id, message: '알 수 없는 증거입니다.' });
    else if (level === undefined)
      feedback.push({ code: 'not_owned', evidenceId: id, message: '아직 확보하지 않은 증거는 인용할 수 없습니다.' });
    else views.push(evidenceView(ev, level));
  }
  return { views, feedback };
}
