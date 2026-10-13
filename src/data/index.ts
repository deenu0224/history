/**
 * 콘텐츠 레지스트리(v3 「대조」). 모듈별 규칙:
 *  - historical/ : verified·reconstructed 만(출처 필수). fictional 금지 — validateContent 가 검사.
 *  - fictional/  : SF 설정(연구소) 장소.
 *  - world/      : 관측 디오라마의 사물·NPC 동선·대사.
 *  - observation/: 관측 타임라인.
 *  - report/     : 단서(프레임·기록에서 계산), 보고서 4칸 규칙.
 *  - work/       : 배정·체크리스트·종결된 보고서.
 *  - db/         : 통합 DB 색인·레코드.
 *  - messages/   : 메신저 메시지·힌트 사다리.
 *  - reality/    : 좌표 재계산(소실 진행)·현실 이동(복원).
 *  - duty/       : v4 근무(밤)·건·규정·면담과 건의 관측 장면(디오라마 타임라인·말하는 인물).
 */
import { mergeModules } from '@/core/content';
import type { ContentModule } from '@/core/types';
import { apps } from './apps';
import { records } from './db/records';
import { searchEntries } from './db/search';
import { fictional } from './fictional';
import { historical } from './historical';
import { hintMessages, hints } from './messages/hints';
import { messages } from './messages/messages';
import { timelines } from './observation/timeline';
import { corrections } from './reality/correction';
import { shifts } from './reality/shift';
import { clues } from './report/clues';
import { reports } from './report/report';
import { assignments } from './work/assignments';
import { closedReports } from './work/closed';
import { world } from './world';
import { cases, caseNpcs, caseTimelines } from './duty/cases';
import { interviews } from './duty/interview';
import { rules } from './duty/rules';
import { workShifts } from './duty/shifts';

export const modules: Record<string, ContentModule> & { historical: ContentModule } = {
  historical,
  fictional,
  world,
  observation: { timelines },
  report: { clues, reports },
  work: { apps, assignments, closedReports },
  db: { searchEntries, records },
  messages: { messages: [...messages, ...hintMessages], hints },
  reality: { corrections, shifts },
  duty: { workShifts, cases, rules, interviews, timelines: caseTimelines, npcs: caseNpcs },
};

export const content = mergeModules(...Object.values(modules));

export { FEEDBACK, type FeedbackSpec } from './feedback';
export { GLOSSARY, GLOSS } from './glossary';
