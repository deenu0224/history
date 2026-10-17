/**
 * 「같은 사람 잇기」(순수) — 그날의 방에서 플레이어가 한 관측의 표시 A 와 다른 관측의 표시 B 를 차례로 탭해 잇는다.
 * 판정은 지금 데이터(본 컷의 등장: 시각·자리)로만 한다. 정답을 알려 주지 않고, 틀린 이유는 보이는 것(시각·자리)만 말한다.
 *
 *   judgeLink(A, B):
 *    0. 본 컷의 등장이 아님                      → invalid
 *    1. 이미 같은 사람으로 묶여 있다               → already
 *    2. 같은 관측(눈) 안의 둘                      → same_eye  (한 기억 안의 두 사람은 다른 사람이다)
 *    3. 시각이 ±5분 밖                            → not_same_time
 *    4. 자리가 다르다                              → not_same_pos
 *    5. 그 밖                                     → ok  (keys = 정렬된 [A, B] — 저장되는 겹침)
 * 묶음은 union-find(core/ep personGroups)라 A–B, B–C 를 이으면 A–C 도 같은 사람이 된다.
 * 시범 겹침(Episode.autoMergeAt)은 엔진이 저절로 만든다 — 같은 mergesAt 데이터에서 나온다.
 */
import { appearances, personGroups, type Knowledge } from './ep';
import { sameMoment } from './room';
import type { Episode } from './types';

export type LinkVerdict = 'ok' | 'already' | 'same_eye' | 'not_same_time' | 'not_same_pos' | 'invalid';

export const LINK_FEEDBACK: Record<Exclude<LinkVerdict, 'ok' | 'invalid'>, string> = {
  already: '이미 같은 사람으로 이어져 있다',
  same_eye: '한 관측 안의 두 사람이다',
  not_same_time: '같은 시각이 아니다',
  not_same_pos: '같은 자리가 아니다',
};

export interface LinkJudgement {
  verdict: LinkVerdict;
  feedback?: string;
  /** ok: 저장할 겹침(정렬된 등장 키 둘) */
  keys?: string[];
  posId?: string;
}

export function judgeLink(ep: Episode, k: Knowledge, keyA: string, keyB: string): LinkJudgement {
  if (keyA === keyB) return { verdict: 'invalid' };
  const apps = appearances(ep, k.viewedCuts);
  const a = apps.find((x) => x.key === keyA);
  const b = apps.find((x) => x.key === keyB);
  if (!a || !b) return { verdict: 'invalid' };
  const out = (verdict: Exclude<LinkVerdict, 'ok' | 'invalid'>): LinkJudgement => ({ verdict, feedback: LINK_FEEDBACK[verdict] });
  const groups = personGroups(ep, k);
  if (groups.get(a.key) === groups.get(b.key)) return out('already');
  if (a.eyeId === b.eyeId) return out('same_eye');
  if (!sameMoment(a.time, b.time)) return out('not_same_time');
  if (a.posId !== b.posId) return out('not_same_pos');
  return { verdict: 'ok', keys: [a.key, b.key].sort(), posId: a.posId };
}
