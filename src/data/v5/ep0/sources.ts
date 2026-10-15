/** Ep0 출처 — docs/HISTORICAL_SOURCES.md §13(§13.7 은 2026-10-15 다시 확인)에서 실제로 연 URL 만. */
import type { SourceRef } from '@/core/types';

const sillok = (id: string, title: string): SourceRef => ({ id, title, url: `https://sillok.history.go.kr/id/${id}` });
const ency = (id: string, title: string): SourceRef => ({ id, title: `한국민족문화대백과사전 「${title}」`, url: `https://encykorea.aks.ac.kr/Article/${id}` });

export const SRC0 = {
  art0220: sillok('kda_12602020_001', '『세종실록』 103권, 세종 26년 2월 20일'),
  eonmun28: sillok('kda_12512030_002', '『세종실록』 102권, 세종 25년 12월 30일'),
  sejong: ency('E0029857', '세종'),
  choi: ency('E0057279', '최만리'),
  jeong: ency('E0050985', '정창손'),
  ha: ency('E0060670', '하위지'),
  kimMun: ency('E0009136', '김문'),
} as const satisfies Record<string, SourceRef>;
