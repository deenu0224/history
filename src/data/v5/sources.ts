/**
 * v5 에피소드 1 출처. 모두 docs/HISTORICAL_SOURCES.md(§1, §10, §11)에서 실제로 열어 확인한 URL 이다.
 * 새 출처는 그 문서에 먼저 적은 뒤 여기에 더한다.
 */
import type { SourceRef } from '@/core/types';

const sillok = (id: string, title: string): SourceRef => ({ id, title, url: `https://sillok.history.go.kr/id/${id}` });
const ency = (id: string, title: string, path = 'Article'): SourceRef => ({
  id,
  title: `한국민족문화대백과사전 「${title}」`,
  url: `https://encykorea.aks.ac.kr/${path}/${id}`,
});

export const SRC = {
  // 그날의 기사(사화의 달) — 복원 전에는 화면에 출처로 보이지 않는다
  order0711: sillok('kja_10407011_001', '『연산군일기』 30권, 연산 4년 7월 11일'),
  verdict0726: sillok('kja_10407026_004', '『연산군일기』 연산 4년 7월 26일'),
  proclaim0727: sillok('kja_10407027_001', '『연산군일기』 연산 4년 7월 27일'),
  burn0728: sillok('kja_10407028_003', '『연산군일기』 연산 4년 7월 28일'),
  cheongdo0712: sillok('kja_10407012_002', '『연산군일기』 연산 4년 7월 12일'),
  claim0712: sillok('kja_10407012_004', '『연산군일기』 연산 4년 7월 12일'),
  yunTestimony0712: sillok('kja_10407012_008', '『연산군일기』 연산 4년 7월 12일'),
  barred0701: sillok('kja_10407001_002', '『연산군일기』 연산 4년 7월 1일'),
  hongGongjo0702: sillok('kja_10407002_001', '『연산군일기』 연산 4년 7월 2일'),
  // 방의 기록·카드 사실
  r01: sillok('kia_12512023_004', '『성종실록』 성종 25년 12월 23일'),
  ijo0225: sillok('kja_10102025_002', '『연산군일기』 연산 1년 2월 25일'),
  r02: sillok('kja_10012025_008', '『연산군일기』 연산 즉위년 12월 25일'),
  r04: sillok('kja_10012026_007', '『연산군일기』 연산 즉위년 12월 26일'),
  myoho: sillok('kja_10101014_001', '『연산군일기』 연산 1년 1월 14일'),
  compileOrder: sillok('kja_10104019_002', '『연산군일기』 연산 1년 4월 19일'),
  r17: sillok('kja_10308001_003', '『연산군일기』 연산 3년 8월 1일'),
  r18: sillok('kja_10312021_001', '『연산군일기』 연산 3년 12월 21일'),
  sejoList: sillok('kga_300', '『세조실록』 부록 찬수관 명단'),
  yejongList: sillok('kha_200', '『예종실록』 부록 찬수관 명단'),
  r14: sillok('kja_10105028_005', '『연산군일기』 연산 1년 5월 28일'),
  r15: sillok('kja_10110009_002', '『연산군일기』 연산 1년 10월 9일'),
  // 백과사전
  seongjongSillok: ency('E0029555', '성종실록'),
  kimIlson: ency('E0010281', '김일손'),
  kimJongjik: ency('E0010507', '김종직'),
  yiGeukdon: ency('E0043804', '이극돈', 'Contents/Item'),
  jouijemun: ency('E0052503', '조의제문'),
  muoSahwa: ency('E0019174', '무오사화'),
  daegam: ency('E0013991', '대감'),
} as const satisfies Record<string, SourceRef>;
