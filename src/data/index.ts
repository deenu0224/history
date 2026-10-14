/**
 * 콘텐츠 레지스트리(v5 「눈을 빌려 다시 쓰기」).
 *  - v5/        : 에피소드 1 번들(EP1) — 사람·컷 판정 데이터·눈·태그·모순·다시 쓰기·찾기·메신저·힌트·복원
 *  - historical/: 검증된 역사 라이브러리(v3 에서 옮겨 둔 것, verified·reconstructed 만)
 *  - world/     : 디오라마 맵·사물(컷 렌더러가 재사용)
 *  - cuts/      : 컷 렌더 명세(다른 모듈 소유 — 컷 id 로만 맞물린다, v5/ids.ts CUT_IDS)
 */
export { EP1, CUT_IDS, CUT_TIMES, EYE_IDS, FIGURE_IDS } from './v5';
export { FEEDBACK, MUSIC, type FeedbackSpec } from './feedback';
export { GLOSSARY, GLOSS } from './glossary';
export { EPISODE_1 } from './script';
