// 사료(실록 기사·문헌). excerpt 는 국사편찬위원회 국역 페이지에 표시된 문장 그대로(…은 생략).
import type { HistoricalSource } from '@/core/types';
import { REF } from './refs';
import { GLOSS } from '@/data/glossary';

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
    excerpt:
      '정부·육조·홍문관·예문관·춘추관 5품 이상이 빈청(賓廳)에 모여서 대행왕의 시호 및 묘호(廟號)·능호(陵號)·전호(殿號)를 의논하였다. … ' +
      '묘호는 성(成)이라 하고, 능호는 선(宣)이라 하고, 전호는 영사(永思)라 하였는데',
    sources: [REF.sillokMyoho, REF.myoho],
    relatedIds: ['src_seongjong_death'],
  },
  {
    id: 'src_daehaengwang',
    provenance: V,
    title: '『연산군일기』 연산 즉위년 12월 29일 기사',
    summary:
      '승정원이 세조·예종·대행왕의 즉위 때 사령을 반포한 전례를 아뢴 기사. 묘호를 정하기 전에는 세상을 떠난 왕을 ' +
      '‘대행왕’이라 불렀음을 보여 주는 예.',
    excerpt: '승정원이 세조(世祖)·예종(睿宗)·대행왕의 즉위 때 사령(赦令)을 반포한 전례를 써서 아뢰니,',
    sources: [REF.sillokDaehaengwang],
    relatedIds: ['src_myoho', 'src_seongjong_death'],
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
    glossary: [GLOSS.jeongyo, GLOSS.sacho, GLOSS.daenae, GLOSS.jikpil],
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
    excerpt:
      '김일손(金馹孫)·권오복(權五福)·권경유(權景𥙿)는 대역(大逆)의 죄에 해당하니 능지 처사(凌遲處死)하고 … ' +
      '일손 등을 벨 적에는 백관(百官)으로 하여금 가 보게 하라.',
    sources: [REF.sillokVerdict],
    glossary: [GLOSS.daeyeok, GLOSS.neungji],
    relatedIds: ['per_kim_ilson', 'evt_muo_sahwa', 'src_proclaim'],
  },
  {
    id: 'src_proclaim',
    provenance: V,
    title: '『연산군일기』 연산 4년 7월 27일 기사',
    summary: '김일손 등을 벤 것을 종묘 사직에 고하고 중외에 사령을 반포한 기사. 이미 세상을 떠난 김종직은 대역으로 논단되어 부관참시되었다.',
    excerpt: '김일손 등을 벤 것을 종묘 사직에 고유하고, … 대역(大逆)으로써 논단하여 부관 참시(剖棺斬屍)를 하였고',
    sources: [REF.sillokProclaim, REF.kimJongjik],
    glossary: [GLOSS.daeyeok, GLOSS.bugwan],
    relatedIds: ['per_kim_ilson', 'per_kim_jongjik', 'evt_muo_sahwa', 'src_verdict'],
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
    // 두 현실 모두에서 참인 서술만(사초 수록·사화의 발단은 복원 뒤 도감 필드로)
    summary: '김종직이 1457년에 지은 글. 꿈에 초나라 의제를 만난 일을 적었다. 의제를 죽인 항우에 세조를 빗댄 글로 해석된다.',
    sources: [REF.jouijemun],
    relatedIds: ['per_kim_jongjik', 'per_kim_ilson', 'evt_muo_sahwa'],
  },
];
