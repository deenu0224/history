// 결록 단말(터미널) 콘텐츠: 앱, 검색 색인, DB 레코드, 사료 구절, 관측 타임라인, 메시지, 기록관, 보정(말소), 메모, 튜토리얼,
// 현실 이동(복원)·기록하기·카드 겹치기.
import type { ContentModule } from '@/core/types';
import { apps } from './apps';
import { corrections, exhibits, memos } from './archive';
import { messages } from './messages';
import { phrases } from './phrases';
import { acts, links, shifts } from './reality';
import { records } from './records';
import { searchEntries } from './search';
import { timelines } from './timeline';
import { help, tutorial } from './tutorial';

export const terminal: ContentModule = {
  apps,
  searchEntries,
  records,
  phrases,
  timelines,
  messages,
  exhibits,
  corrections,
  memos,
  tutorial,
  help,
  shifts,
  links,
  acts,
};

export { FEEDBACK, type FeedbackSpec } from './feedback';
