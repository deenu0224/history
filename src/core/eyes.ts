/**
 * 눈의 생애(순수). DESIGN_V5 §2.6, §4.7.
 *  - 상태: never(열릴 기록이 없음) · unopened(아직 이름 모름) · open · closed(소실로 닫힘)
 *  - 열림: given(주어짐, 주인 이름 숨김) 또는 그 figure 에 맞는 이름을 붙였을 때
 *  - 닫힘: 06:00 재계산(EyeClosure). 본 컷은 관측 로그에 남아 다시 볼 수 있고, 안 본 컷은 영영 볼 수 없다.
 */
import { idx, type Knowledge } from './ep';
import type { Episode, Eye, EyeClosure, Id } from './types';

export type EyeState = 'open' | 'unopened' | 'closed' | 'never';

export function eyeState(_ep: Episode, k: Knowledge, eye: Eye): EyeState {
  if (eye.openWhen.kind === 'never') return 'never';
  if (k.closedEyes.includes(eye.id)) return 'closed';
  if (k.openedEyes.includes(eye.id)) return 'open';
  return 'unopened';
}

/** 눈의 주인 이름이 알려졌는가 */
export function ownerKnown(_ep: Episode, k: Knowledge, eye: Eye): boolean {
  if (eye.openWhen.kind === 'tag') return k.openedEyes.includes(eye.id) || k.closedEyes.includes(eye.id);
  if (eye.openWhen.kind === 'given') return !eye.openWhen.ownerHidden || (!!eye.figureId && k.named[eye.figureId] === eye.personId);
  return true;
}

const ORDINAL = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째'];

/** 화면 이름: 「첫 번째 기억」(이름 칸 손상) → 「윤효손의 기억」 */
export function eyeLabel(ep: Episode, k: Knowledge, eye: Eye): string {
  if (ownerKnown(ep, k, eye)) return `${idx(ep).card.get(eye.personId)?.name ?? '?'}의 기억`;
  return `${ORDINAL[eye.order - 1] ?? ''} 기억`;
}

/** 이 figure 에 이름을 붙이면 열리는 눈 */
export function eyesOpenedByTag(ep: Episode, figureId: Id): Eye[] {
  return ep.eyes.filter((e) => e.openWhen.kind === 'tag' && e.openWhen.figureId === figureId);
}

export const givenEyes = (ep: Episode) => ep.eyes.filter((e) => e.openWhen.kind === 'given');

export type CutAvailability = 'viewable' | 'viewed_closed' | 'lost' | 'locked';

export function cutAvailability(ep: Episode, k: Knowledge, cutId: Id): CutAvailability {
  const cut = idx(ep).cut.get(cutId);
  if (!cut) return 'locked';
  const eye = idx(ep).eye.get(cut.eyeId)!;
  const st = eyeState(ep, k, eye);
  if (st === 'open') return 'viewable';
  if (st === 'closed') return k.viewedCuts.includes(cutId) ? 'viewed_closed' : 'lost';
  return 'locked';
}

export interface ClosureClock {
  /** 눈 id → 열린 시각(ms) */
  eyeOpenedAt: Readonly<Record<Id, number>>;
  now: number;
  done: readonly Id[];
}

/** 닫힘 조건이 찼는가(컷 뷰어 안이면 스토어가 '컷을 떠나는 순간'까지 미룬다) */
export function closureDue(_ep: Episode, k: Knowledge, c: EyeClosure, clock: ClosureClock): boolean {
  if (clock.done.includes(c.id)) return false;
  if (!k.openedEyes.includes(c.trigger.eyeOpen) || !k.openedEyes.includes(c.eyeId)) return false;
  const openedAt = clock.eyeOpenedAt[c.trigger.eyeOpen];
  return c.trigger.anyOf.some((t) =>
    'cutViewed' in t ? k.viewedCuts.includes(t.cutViewed) : openedAt !== undefined && clock.now - openedAt >= t.secondsAfterEyeOpen * 1000,
  );
}
