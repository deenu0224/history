// 사료(실록 기사·문헌). excerpt 는 국사편찬위원회 국역 페이지에 표시된 문장 그대로(…은 생략).
import type { HistoricalSource } from '@/core/types';
import { REF } from './refs';

const V = 'verified' as const;

export const sources: HistoricalSource[] = [
  {
    id: 'src_seongjong_death',
    provenance: V,
    title: '『성종실록』 성종 25년 12월 24일 기사',
    summary: '성종이 대조전에서 세상을 떠났다는 기사.',
    excerpt: '오시(午時)에 임금이 대조전(大造殿)에서 훙(薨)하였는데, 춘추(春秋)는 38세이다.',
    sources: [REF.sillokSeongjongDeath],
    relatedIds: ['src_myoho'],
  },
  {
    id: 'src_myoho',
    provenance: V,
    title: '『연산군일기』 연산 1년 1월 14일 기사',
    summary: '대행왕(세상을 떠난 왕)의 시호·묘호·능호·전호를 의논해 묘호를 ‘성(成)’으로 정한 기사.',
    excerpt: '묘호는 성(成)이라 하고, 능호는 선(宣)이라 하고, 전호는 영사(永思)라 하였는데',
    sources: [REF.sillokMyoho, REF.myoho],
    relatedIds: ['src_seongjong_death'],
  },
  {
    id: 'src_compile_order',
    provenance: V,
    title: '『연산군일기』 연산 1년 4월 19일 기사',
    summary: '왕이 어세겸·이극돈 등에게 『성종실록』 편찬을 명한 기사.',
    excerpt:
      '왕이 어세겸(魚世謙)·이극돈(李克墩)·유순(柳洵)·성현(成俔)·권건(權健)·신종호(申從濩)·조위(曺偉)에게 명하여 편찬하게 하였다.',
    sources: [REF.sillokCompileOrder, REF.seongjongSillok],
    relatedIds: ['per_eo_segyeom', 'per_yi_geukdon', 'evt_seongjong_sillok'],
  },
  {
    id: 'src_sacho_order',
    provenance: V,
    title: '『연산군일기』 연산 4년 7월 11일 기사',
    summary:
      '왕이 김일손의 사초를 모두 대내로 들이라 명하자, 당상들이 사초는 임금이 보지 않는 것이라며 반대하고, ' +
      '이극돈 등이 사초에서 6조목을 뽑아 봉해 올린 기사.',
    excerpt:
      '“김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라.” … ' +
      '“예로부터 사초(史草)는 임금이 스스로 보지 않습니다.” … ' +
      '“임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다.” … ' +
      '극돈 등이 일손의 사초에서 6조목을 절취하여 봉해 올리니,',
    sources: [REF.sillokSachoOrder],
    relatedIds: ['per_kim_ilson', 'per_yi_geukdon', 'evt_muo_sahwa'],
  },
  {
    id: 'src_house_search',
    provenance: V,
    title: '『연산군일기』 연산 4년 7월 12일 기사',
    summary: '김일손의 집에서 수색해 낸 잡문서 가운데 이목·권오복이 보낸 편지가 발견된 기사.',
    excerpt:
      '홍사호(洪士灝) 등이 김일손(金馹孫)의 집에서 수색해 낸 잡문서를 올리므로 왕은 추관(推官)에게 명하여 피열(被閱)하게 했는데, ' +
      '이목(李穆)과 권오복(權五福)이 일손에게 준 편지를 발견했다.',
    sources: [REF.sillokHouseSearch],
    relatedIds: ['per_kim_ilson', 'evt_muo_sahwa'],
  },
  {
    id: 'src_verdict',
    provenance: V,
    title: '『연산군일기』 연산 4년 7월 26일 기사',
    summary: '사초 사건 관련자들의 죄목을 논해 김일손·권오복·권경유를 능지처사하기로 한 기사.',
    excerpt: '김일손(金馹孫)·권오복(權五福)·권경유(權景𥙿)는 대역(大逆)의 죄에 해당하니 능지 처사(凌遲處死)하고',
    sources: [REF.sillokVerdict, REF.sillokProclaim],
    relatedIds: ['per_kim_ilson', 'evt_muo_sahwa'],
  },
  {
    id: 'src_gyeongguk',
    provenance: V,
    title: '『경국대전』',
    hanja: '經國大典',
    compiled: 1485,
    summary:
      '조선의 기본 법전. 1471년 『신묘대전』, 1474년 『갑오대전』을 거쳐 1485년 1월 1일부터 『을사대전』이 시행되었고, ' +
      '오늘날 온전히 전하는 것은 『을사대전』이다.',
    sources: [REF.gyeongguk],
  },
  {
    id: 'src_jouijemun',
    provenance: V,
    title: '「조의제문」',
    hanja: '弔義帝文',
    compiled: 1457,
    author: '김종직',
    summary:
      '김종직이 1457년에 지은 글. 꿈에 초나라 의제를 만난 일을 적으며, 의제를 죽인 항우에 세조를 빗댄 것으로 읽혔다. ' +
      '제자 김일손이 사관으로 있을 때 사초에 실었고, 『성종실록』 편찬 중 문제가 되어 무오사화의 발단이 되었다.',
    sources: [REF.jouijemun, REF.muoSahwa],
    relatedIds: ['per_kim_jongjik', 'per_kim_ilson', 'evt_muo_sahwa'],
  },
];
