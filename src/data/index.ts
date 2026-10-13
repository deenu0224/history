/**
 * 콘텐츠 레지스트리. 모듈별 규칙:
 *  - historical/ : verified·reconstructed 만(출처 필수). fictional 금지 — validateContent 가 검사.
 *  - fictional/  : SF 설정(연구소, 관측, 말소) 관련 인물·장소·사건.
 *  - deduction/  : 증거, 추리 문제(정답 범위·필수 사실), 관측, 도감 항목.
 *  - world/      : 관측 #001 디오라마의 사물·NPC 동선·대사(관측 뷰어 핫스팟).
 *  - terminal/   : 결록 단말 — 앱, 검색 색인, 레코드, 사료 구절, 타임라인, 메시지, 기록관, 보정, 튜토리얼.
 *  - sample/     : PLACEHOLDER. 실제 콘텐츠가 들어오면 INCLUDE_SAMPLE = false.
 */
import { mergeModules } from '@/core/content';
import type { ContentModule } from '@/core/types';
import { deduction } from './deduction';
import { fictional } from './fictional';
import { historical } from './historical';
import { sample } from './sample';
import { terminal } from './terminal';
import { world } from './world';

export const INCLUDE_SAMPLE = false;

export const modules: Record<string, ContentModule> & { historical: ContentModule } = {
  historical,
  fictional,
  deduction,
  world,
  terminal,
  ...(INCLUDE_SAMPLE ? { sample } : {}),
};

export const content = mergeModules(...Object.values(modules));
