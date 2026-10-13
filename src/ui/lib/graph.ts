import { stageOf } from '@/core/collection';
import { entryView } from '@/core/collection';
import { evidenceView } from '@/core/content';
import type { CollectionStage, ContentBundle, Id, PlayerNotebook, Reward, Year } from '@/core/types';
import { hasFact } from '@/core/content';
import { DB_NOTE_PREFIX, SOLVED_NOTE_PREFIX, VERDICT_LABEL, parseYearNote, yearResults } from './format';

export type GraphKind = 'evidence' | 'entry' | 'deduction';
export interface GNode {
  id: string;
  kind: GraphKind;
  label: string;
  sub?: string;
  /** 원본 id(증거/도감/추리) */
  ref: Id;
}
export interface GEdge {
  a: string;
  b: string;
}
export interface GraphState {
  evidence: Record<Id, number>;
  collection: Record<Id, CollectionStage>;
  solved: Record<Id, { best: 'partial' | 'confirmed' }>;
  notebook: PlayerNotebook;
}

const nid = (kind: GraphKind, id: Id) => `${kind}:${id}`;

/** 플레이어가 이미 알아낸 연결만 그래프에 넣는다(정답 데이터를 미리 노출하지 않는다). */
export function buildGraph(c: ContentBundle, s: GraphState): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  const have = new Set<string>();
  const edge = (a: string, b: string) => {
    if (!have.has(a) || !have.has(b)) return;
    if (!edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) edges.push({ a, b });
  };
  const add = (n: GNode) => {
    nodes.push(n);
    have.add(n.id);
  };

  const evById = Object.fromEntries(c.evidence.map((e) => [e.id, e]));
  for (const [id, level] of Object.entries(s.evidence)) {
    const ev = evById[id];
    if (ev) add({ id: nid('evidence', id), kind: 'evidence', label: evidenceView(ev, level).label, ref: id });
  }
  const dbSeen = new Set(s.notebook.verified.filter((n) => n.id.startsWith(DB_NOTE_PREFIX)).map((n) => n.id.slice(DB_NOTE_PREFIX.length)));
  for (const e of c.collection) {
    const st = stageOf(s.collection, e.id);
    if (st >= 1 || (e.category === 'person' && dbSeen.has(e.id))) add({ id: nid('entry', e.id), kind: 'entry', label: entryView(e, st).title, sub: e.category, ref: e.id });
  }
  const dedById = Object.fromEntries(c.deductions.map((d) => [d.id, d]));
  for (const [id, rec] of Object.entries(s.solved)) {
    const d = dedById[id];
    if (d) add({ id: nid('deduction', id), kind: 'deduction', label: d.title, sub: VERDICT_LABEL[rec.best], ref: id });
  }

  // 증거 ↔ 도감: 증거의 관련 id, 또는 증거가 입증한 사실이 식별된 인물의 사실과 일치
  const personById = Object.fromEntries(c.persons.map((p) => [p.id, p]));
  for (const [id, level] of Object.entries(s.evidence)) {
    const ev = evById[id];
    if (!ev) continue;
    const view = evidenceView(ev, level);
    for (const e of c.collection) {
      const linked = ev.relatedIds?.includes(e.refId) || ev.relatedIds?.includes(e.id);
      let proves = false;
      if (e.category === 'person' && stageOf(s.collection, e.id) >= 2) {
        const p = personById[e.refId];
        proves = !!p && view.facts.some((f) => hasFact(p.facts, f));
      }
      if (linked || proves) edge(nid('evidence', id), nid('entry', e.id));
    }
  }
  // 도감 ↔ 도감
  for (const e of c.collection) for (const l of e.links ?? []) edge(nid('entry', e.id), nid('entry', l));

  // 증거 ↔ 추리: 해결 기록 노트가 인용한 증거
  for (const n of s.notebook.verified) {
    let dedId: string | null = null;
    const y = parseYearNote(n.id);
    if (y) dedId = y.deductionId;
    else if (n.id.startsWith(SOLVED_NOTE_PREFIX)) dedId = n.id.slice(SOLVED_NOTE_PREFIX.length);
    if (!dedId) continue;
    for (const r of n.refIds ?? []) edge(nid('evidence', r), nid('deduction', dedId));
  }
  // 추리 ↔ 도감: 해결로 올라간 항목
  for (const [id, rec] of Object.entries(s.solved)) {
    const d = dedById[id];
    if (!d) continue;
    const rewards: Reward[] = [...(d.rewards.partial ?? []), ...(rec.best === 'confirmed' ? d.rewards.confirmed : [])];
    for (const r of rewards) if (r.type === 'collection') edge(nid('deduction', id), nid('entry', r.entryId));
  }
  return { nodes, edges };
}

// ── 연대표 ─────────────────────────────────────────────────────
export interface TLItem {
  id: string;
  label: string;
  from: Year;
  to: Year;
  kind: 'person' | 'event' | 'artifact' | 'source' | 'observation';
  verdict?: 'partial' | 'confirmed';
}

export function buildTimelineItems(c: ContentBundle, collection: Record<Id, CollectionStage>, notebook: PlayerNotebook): TLItem[] {
  const out: TLItem[] = [];
  const persons = Object.fromEntries(c.persons.map((x) => [x.id, x]));
  const events = Object.fromEntries(c.events.map((x) => [x.id, x]));
  const artifacts = Object.fromEntries(c.artifacts.map((x) => [x.id, x]));
  const sources = Object.fromEntries(c.sources.map((x) => [x.id, x]));
  for (const e of c.collection) {
    const st = stageOf(collection, e.id);
    if (st < 3) continue;
    const title = entryView(e, st).title;
    if (e.category === 'person') {
      const p = persons[e.refId];
      if (p && (p.born !== undefined || p.died !== undefined)) out.push({ id: e.id, label: title, from: p.born ?? p.died!, to: p.died ?? p.born!, kind: 'person' });
    } else if (e.category === 'event') {
      const ev = events[e.refId];
      if (ev?.year !== undefined) out.push({ id: e.id, label: title, from: ev.year, to: ev.year, kind: 'event' });
    } else if (e.category === 'artifact') {
      const a = artifacts[e.refId];
      if (a?.made && (a.made.from !== undefined || a.made.to !== undefined) && !a.made.estimated)
        out.push({ id: e.id, label: title, from: a.made.from ?? a.made.to!, to: a.made.to ?? a.made.from!, kind: 'artifact' });
    } else if (e.category === 'source') {
      const s = sources[e.refId];
      if (s?.compiled !== undefined) out.push({ id: e.id, label: title, from: s.compiled, to: s.compiled, kind: 'source' });
    }
  }
  for (const r of yearResults(notebook)) {
    const d = c.deductions.find((x) => x.id === r.deductionId);
    out.push({ id: `obs:${r.deductionId}`, label: `관측 — ${d?.title ?? '연대 추리'}`, from: r.from, to: r.to, kind: 'observation', verdict: r.verdict });
  }
  return out;
}
