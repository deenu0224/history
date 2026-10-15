/**
 * 현실 층(순수): 소실 세계 ↔ 복원 뒤 세계. DESIGN_V5 §4.9.
 * 소실 세계의 줄(fictional 변조)은 복원 때 검증 문장으로 다시 쓰인다. 단말에는 표식이 없다 — 다시 쓰인 것을 아는 것은 나뿐.
 */
import { idx } from './ep';
import type { AlteredField, Episode, Fact, HomeCard, Id, PersonCard, RestoredPart, SourceRef } from './types';

export interface WorldFlags {
  restored: boolean;
  /** 06:00 재계산에서 지워진 변조 줄(사건 id) */
  closures: readonly Id[];
}

export type AlteredState = 'altered' | 'erased' | 'restored';

export interface AlteredView {
  id: Id;
  label: string;
  state: AlteredState;
  text: string;
  provenance: 'fictional' | 'verified';
  source?: SourceRef;
}

export function alteredView(a: AlteredField, w: WorldFlags): AlteredView {
  if (w.restored) return { id: a.id, label: a.label, state: 'restored', text: a.restoredText, provenance: 'verified', source: a.restoredSource };
  if (a.erasedByClosure && w.closures.includes(a.erasedByClosure)) return { id: a.id, label: a.label, state: 'erased', text: '', provenance: 'fictional' };
  return { id: a.id, label: a.label, state: 'altered', text: a.display, provenance: 'fictional' };
}

export const visibleFacts = (card: PersonCard, w: WorldFlags): Fact[] => card.facts.filter((f) => w.restored || !f.afterRestore);

export function homeView(home: HomeCard, w: WorldFlags) {
  return {
    code: home.code,
    date: w.restored ? home.date.after : home.date.before,
    place: w.restored ? home.place.after : home.place.before,
    placeSource: w.restored ? home.place.source : undefined,
    placeNote: w.restored ? home.place.note : undefined,
    task: home.task,
    detection: home.detection,
    status: w.restored ? home.status.after : home.status.before,
    record: home.record
      ? {
          title: home.record.title,
          lines: home.record.lines.map((l) => ({
            ...(l.minor ? { minor: true as const } : {}),
            ...(l.note ? { note: l.note } : {}),
            /** 출처는 복원 뒤에만(그 전엔 연도·왕대가 드러난다) */
            source: w.restored ? l.source : undefined,
            parts: l.parts.map((p) => ('gap' in p ? { text: w.restored ? p.gap : holeOf(p), gap: true } : { text: p.text, gap: false })),
          })),
        }
      : undefined,
  };
}

/** 홈 카드 단락의 구멍: 「누가」 칸은 [ ? ], 나머지는 지워진 길이에 비례한 [ ── ] */
export const HOME_GAP = '[ ? ]';
export const holeOf = (p: { gap: string; who?: true }) => (p.who ? HOME_GAP : `[ ${'─'.repeat(Math.min(8, Math.max(2, Math.round(p.gap.length / 14))))} ]`);
/** 홈 카드 문장 한 줄의 복원 뒤 글(검증기용) */
export const homeRecordText = (l: { parts: ({ text: string } | { gap: string })[] }) => l.parts.map((p) => ('gap' in p ? p.gap : p.text)).join('');

/** 「?」 figure 의 표시: 복원 뒤 짝 이름 */
export function figureRestoredLabel(ep: Episode, figureId: Id, w: WorldFlags): string | undefined {
  const f = idx(ep).figure.get(figureId);
  return w.restored && f?.revealOnRestore ? f.revealOnRestore.pairLabel : undefined;
}

export interface ArticlePartView extends RestoredPart {
  /** 내가 써서 돌아온 줄 / 실록이 채운 줄(옅은 먹) */
  by: 'me' | 'sillok';
  /** 오역 줄은 「……」로 접혀 보인다 */
  display: string;
}

/** 복원 전문: 내가 쓴 줄과 실록이 채운 줄 */
export function articleView(ep: Episode, writtenSentenceIds: readonly Id[]): ArticlePartView[] {
  return ep.article.parts.map((p) => ({
    ...p,
    by: p.sentenceId && writtenSentenceIds.includes(p.sentenceId) && !p.folded && !p.header ? 'me' : 'sillok',
    display: p.folded ? '……' : p.text,
  }));
}
