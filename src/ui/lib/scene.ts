import { CONTENT } from './content';

const PAST = new Set(CONTENT.observations.map((o) => o.sceneId));
const MODERN_RE = /(lab|archive|modern|present|연구|기록관)/i;

/** 관측(과거) 씬인가. 관측 데이터가 걸린 씬이면 과거, 이름이 연구실/기록관류면 현대. */
export function isPastScene(sceneId: string | null | undefined): boolean {
  if (!sceneId) return false;
  if (MODERN_RE.test(sceneId)) return false;
  if (PAST.has(sceneId)) return true;
  return /(past|joseon|chosun|gwan|office|yard|palace|sagwan|과거)/i.test(sceneId);
}

/** 현재 씬의 관측 번호(1부터). 관측 데이터 순서를 따른다. */
export function observationIndex(sceneId: string | null | undefined): number {
  const i = CONTENT.observations.findIndex((o) => o.sceneId === sceneId);
  return i >= 0 ? i + 1 : 1;
}
