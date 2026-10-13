/** 책상 UI 보조(순수 함수): 조각 id 규칙, 도장 자국 스프라이트 고르기, 시각 표기. */
import type { CaseStamp, Id } from '@/core/types';
import { DESK_KEYS } from '@/game/art';
import { fmtMinute } from './text';

/** 이음 조각(짚을 일 없는 글자): 데이터가 자동으로 붙이는 id `<건>_x<번호>`. 짚을 수 있는 낱말은 이 모양이 아니다. */
export const isGlue = (segId: Id) => /_x\d+$/.test(segId);

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 같은 건·도장이면 같은 변형(a/b/c)과 기울기. 도장마다 잉크가 조금씩 다르다. */
export function impressionLook(caseId: Id, stamp: CaseStamp, opts?: { faded?: boolean; system?: boolean; salt?: string }) {
  const h = hash(`${caseId}|${stamp}|${opts?.salt ?? ''}`);
  const v = h % 3;
  const keys = DESK_KEYS.impressions;
  const pick = (xs: readonly string[]) => xs[v]!;
  let sprite: string;
  if (opts?.faded) sprite = keys.mismatchAged;
  else if (opts?.system || stamp === 'auto_close') sprite = pick(keys.system);
  else if (stamp === 'confirm') sprite = pick(keys.ok);
  else if (stamp === 'correct') sprite = pick(keys.fix);
  else if (stamp === 'mismatch') sprite = pick(keys.mismatch);
  else sprite = pick(keys.system);
  const tilt = ((h >> 3) % 9) - 4 + (opts?.system ? 3 : 0); // -4..+4 (시스템 도장은 조금 더 기울게)
  const dx = ((h >> 7) % 13) - 6;
  const dy = ((h >> 11) % 9) - 4;
  return { sprite, tilt, dx, dy, variant: 'abc'[v]! };
}

export type StampTone = 'ok' | 'fix' | 'mismatch' | 'system';
export const toneOf = (stamp: CaseStamp, faded = false): StampTone =>
  stamp === 'confirm' ? 'ok' : stamp === 'correct' ? 'fix' : stamp === 'mismatch' || faded ? 'mismatch' : 'system';

/** 근무 시계 분 → '1시간 5분' 같은 짧은 표기 */
export function fmtSpan(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}시간 ${m % 60}분` : `${h}시간`;
}

export { fmtMinute };

/** 시간 막대 눈금 간격(분) */
export const stepFor = (span: number) => (span <= 60 ? 1 : 5);

/** 뷰어 핸들의 선택 기능(다른 에이전트가 넣는 중): 있으면 부른다. */
export function viewerCall(h: unknown, name: 'fitToScene' | 'focusSpeaker'): boolean {
  const fn = (h as Record<string, unknown> | null | undefined)?.[name];
  if (typeof fn === 'function') {
    (fn as () => void).call(h);
    return true;
  }
  return false;
}
