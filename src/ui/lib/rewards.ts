import { entryView } from '@/core/collection';
import { evidenceView } from '@/core/content';
import type { CollectionStage, Reward } from '@/core/types';
import { fx } from './fx';
import { IDX } from './content';

export interface RewardLine {
  key: string;
  icon: 'card' | 'stamp' | 'term' | 'book' | 'dex' | 'note';
  text: string;
}

/** 얻은 것을 한 줄씩. 정답은 말하지 않는다(카드 이름·검색어·도감 이름만). */
export function describeRewards(gained: readonly Reward[]): RewardLine[] {
  const out: RewardLine[] = [];
  for (const r of gained) {
    switch (r.type) {
      case 'evidence': {
        const ev = IDX.evidence[r.evidenceId];
        if (!ev) break;
        const lv = r.level ?? 0;
        const label = evidenceView(ev, lv).label;
        out.push({
          key: `ev:${r.evidenceId}:${lv}`,
          icon: lv > 0 ? 'stamp' : 'card',
          text: lv > 0 ? `카드 검증: ${label}` : `새 증거 카드: ${label}`,
        });
        break;
      }
      case 'term':
        out.push({ key: `term:${r.term}`, icon: 'term', text: `검색어 수첩에 추가: ${r.term}` });
        break;
      case 'source': {
        const s = IDX.sources[r.sourceId];
        if (s) out.push({ key: `src:${r.sourceId}`, icon: 'book', text: `사료 서재에 보관: ${s.title}` });
        break;
      }
      case 'collection': {
        const e = IDX.collection[r.entryId];
        if (e && r.stage >= 1) out.push({ key: `col:${r.entryId}:${r.stage}`, icon: 'dex', text: `도감: ${entryView(e, r.stage as CollectionStage).title}` });
        break;
      }
      default:
        break;
    }
  }
  // 도감은 많을 수 있어 최대 3줄만
  const dex = out.filter((l) => l.icon === 'dex');
  return dex.length > 3 ? [...out.filter((l) => l.icon !== 'dex'), ...dex.slice(0, 3), { key: 'dex+', icon: 'dex', text: `도감 외 ${dex.length - 3}건` }] : out;
}

/** 얻은 것에 맞는 촉감 피드백(카드가 처음 들어오면 도장+진동, 검증이면 도장). */
export function feedbackForRewards(gained: readonly Reward[]) {
  const ev = gained.filter((r) => r.type === 'evidence') as Extract<Reward, { type: 'evidence' }>[];
  if (ev.some((r) => (r.level ?? 0) === 0)) fx('evidence_new');
  else if (ev.length) fx('evidence_level');
}
