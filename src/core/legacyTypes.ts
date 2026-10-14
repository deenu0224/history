/**
 * v3 시절의 역사 라이브러리·디오라마 데이터 타입. v5 엔진은 쓰지 않는다.
 * 남겨 둔 이유: `src/data/historical/*`(검증된 인물·사료·유물 라이브러리)와
 * `src/data/world/{maps,worldObjects}.ts`(컷 렌더러가 디오라마 조각으로 재사용)가 이 모양을 쓴다.
 */
import type { Gloss, Id, Provenance, SourceRef } from './types';

/** 서기 연도(정수). */
export type Year = number;

export interface ContentBase {
  id: Id;
  provenance: Provenance;
  sources?: SourceRef[];
  authorNote?: string;
}

export type HistoricalFactKind =
  | 'name'
  | 'courtesyName'
  | 'penName'
  | 'office'
  | 'clan'
  | 'origin'
  | 'relation'
  | 'possession'
  | 'event'
  | 'claim'
  | 'trait';

export interface HistoricalFact {
  kind: HistoricalFactKind;
  value: string;
}

export interface HistoricalPerson extends ContentBase {
  name: string;
  hanja?: string;
  born?: Year;
  died?: Year;
  summary: string;
  facts: HistoricalFact[];
  relatedIds?: Id[];
}

export interface HistoricalArtifact extends ContentBase {
  name: string;
  hanja?: string;
  made?: { from?: Year; to?: Year; estimated: boolean };
  material?: string;
  holder?: string;
  summary: string;
  relatedIds?: Id[];
}

export interface HistoricalSource extends ContentBase {
  title: string;
  hanja?: string;
  compiled?: Year;
  author?: string;
  summary: string;
  excerpt?: string;
  glossary?: Gloss[];
  relatedIds?: Id[];
}

export interface HistoricalEvent extends ContentBase {
  name: string;
  hanja?: string;
  year?: Year;
  personIds?: Id[];
  placeId?: Id;
  sourceIds?: Id[];
  summary: string;
}

export interface Place extends ContentBase {
  name: string;
  hanja?: string;
  region?: string;
  summary: string;
}

/** 디오라마 사물(컷 렌더러가 배치에 쓴다) */
export interface TimeWindow {
  from: number;
  to: number;
}
export interface Grants {
  flags?: string[];
  terms?: string[];
}
export type InteractableKind = 'object' | 'npc' | 'door' | 'observe';
export interface Interactable extends ContentBase {
  sceneId: Id;
  x: number;
  y: number;
  spriteKey: string;
  kind: InteractableKind;
  label: string;
  examine: string[];
  grants?: Grants;
  requires?: string;
  targetSceneId?: Id;
  windows?: TimeWindow[];
  hiddenText?: string;
}
