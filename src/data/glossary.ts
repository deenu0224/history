/**
 * 낯선 실록 용어의 한 줄 풀이(탭하면 보임). 실록 인용(verified) 안의 말만 풀이한다. 사실만, 짧게.
 * 현대 문장(DB·메시지·체크리스트·힌트)에서는 이 말들 대신 현대어를 쓴다('졸' 대신 '사망' 등).
 */
import type { Gloss } from '@/core/types';

export const GLOSS = {
  jeongyo: { term: '전교', gloss: '임금이 내린 명령.' },
  daenae: { term: '대내', gloss: '임금이 거처하는 궁궐 안.' },
  sacho: { term: '사초', gloss: '사관이 적어 둔 기록. 실록을 엮는 바탕이 된다.' },
  jikpil: { term: '직필', gloss: '사실을 숨기거나 꾸미지 않고 그대로 적음.' },
  dangsang: { term: '당상', gloss: '높은 품계의 관원. 관청의 일을 이끄는 자리.' },
  sillokcheong: { term: '실록청', gloss: '왕이 세상을 떠난 뒤 그 왕의 실록을 엮으려고 세우던 임시 관청.' },
  daeyeok: { term: '대역', gloss: '나라와 임금에 대한 가장 무거운 반역의 죄.' },
  neungji: { term: '능지 처사', gloss: '대역 죄인에게 내리던 가장 무거운 사형.' },
  bugwan: { term: '부관 참시', gloss: '이미 죽은 사람의 관을 꺼내 시신에 형벌을 가하던 일.' },
  pyeonsu: { term: '편수', gloss: '책을 엮어 펴내는 일. 실록 편찬을 맡은 관원을 편수관이라 했다.' },
} as const satisfies Record<string, Gloss>;

export const GLOSSARY: Gloss[] = Object.values(GLOSS);
