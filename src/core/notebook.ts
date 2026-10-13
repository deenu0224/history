import type { Id, NotebookGrant, NotebookSection, PlayerNotebook } from './types';

export const NOTEBOOK_SECTIONS: readonly NotebookSection[] = ['observed', 'testimony', 'verified', 'hypothesis', 'question'];

export const SECTION_LABELS: Record<NotebookSection, string> = {
  observed: '관찰한 사실',
  testimony: '증언',
  verified: '검증된 사실',
  hypothesis: '가설',
  question: '미해결 의문',
};

export function emptyNotebook(): PlayerNotebook {
  return { observed: [], testimony: [], verified: [], hypothesis: [], question: [] };
}

export function noteSeq(nb: PlayerNotebook): number {
  return NOTEBOOK_SECTIONS.reduce((n, s) => n + nb[s].length, 0);
}

/** 같은 id 가 이미 있으면 그대로 둔다(중복 획득 방지). */
export function addNote(nb: PlayerNotebook, grant: NotebookGrant): PlayerNotebook {
  if (NOTEBOOK_SECTIONS.some((s) => nb[s].some((n) => n.id === grant.id))) return nb;
  return { ...nb, [grant.section]: [...nb[grant.section], { ...grant, seq: noteSeq(nb) }] };
}

export function resolveNote(nb: PlayerNotebook, id: Id): PlayerNotebook {
  const section = NOTEBOOK_SECTIONS.find((s) => nb[s].some((n) => n.id === id));
  if (!section) return nb;
  return { ...nb, [section]: nb[section].map((n) => (n.id === id ? { ...n, resolved: true } : n)) };
}

export function openQuestions(nb: PlayerNotebook) {
  return nb.question.filter((q) => !q.resolved);
}
