// 실존 인물. 사실(facts)은 docs/HISTORICAL_SOURCES.md 1장에서 '확정'인 것만.
import type { HistoricalPerson } from '@/core/types';
import { FACT } from './facts';
import { REF } from './refs';

const V = 'verified' as const;

export const persons: HistoricalPerson[] = [
  {
    id: 'per_kim_ilson',
    provenance: V,
    name: '김일손',
    hanja: '金馹孫',
    born: 1464,
    died: 1498,
    summary:
      '조선 전기의 문신·사관. 본관 김해, 자 계운, 호 탁영. 1486년 문과에 급제해 승문원 정자로 춘추관 기사관을 겸했다. ' +
      '김종직의 문하에서 배웠고, 스승의 「조의제문」을 사초에 실은 일로 1498년 무오사화 때 처형되었다. 중종반정 뒤 복관되었다.',
    facts: [
      FACT.nameKimIlson,
      { kind: 'courtesyName', value: '계운' },
      { kind: 'penName', value: '탁영' },
      { kind: 'penName', value: '소미산인' },
      { kind: 'clan', value: '김해' },
      { kind: 'origin', value: '청도' },
      { kind: 'office', value: '승문원 정자' },
      { kind: 'office', value: '춘추관 기사관' },
      { kind: 'office', value: '이조정랑' },
      { kind: 'relation', value: '김종직의 문인' },
      FACT.possessionTakyeong,
      { kind: 'event', value: '무오사화' },
      { kind: 'trait', value: '스승의 「조의제문」을 사초에 실음' },
    ],
    sources: [REF.kimIlson, REF.muoSahwa, REF.jouijemun, REF.takyeongKhs, REF.sillokVerdict],
    relatedIds: ['per_kim_jongjik', 'per_yi_geukdon', 'art_takyeong', 'evt_muo_sahwa'],
    authorNote:
      "인물의 행적은 kind 'trait' 로 둔다(사건 추리용 'claim' 과 섞이면 엉뚱한 모순 판정이 난다). " +
      '사관 재직 정확 연도, 각 관직 임명 연도, 1498년의 소재, 실록청 참여 여부는 미확인 → 넣지 않음. ' +
      "event 는 '무오사화'만 둔다. '『세조실록』 편찬 참여'는 1486년 이전 관직이 없으므로 모순 판정이 타당.",
  },
  {
    id: 'per_yi_geukdon',
    provenance: V,
    name: '이극돈',
    hanja: '李克墩',
    born: 1435,
    died: 1503,
    summary:
      '조선 전기의 문신. 본관 광주(廣州), 자 사고. 1457년 문과 급제. 『세조실록』 편찬에 편수관으로 참여했고, ' +
      '1495년 지관사로서 『성종실록』 편찬을 맡았다. 실록청 당상으로 사초를 정리하다 김일손의 사초에서 「조의제문」을 문제 삼았으며, ' +
      '사화 뒤에는 문제의 사초를 보고도 고하지 않은 죄로 파면되었다.',
    facts: [
      FACT.nameYiGeukdon,
      { kind: 'courtesyName', value: '사고' },
      { kind: 'clan', value: '광주(廣州)' },
      FACT.officeSillokDangsang,
      { kind: 'office', value: '지관사' },
      FACT.eventSejoSillok,
      { kind: 'event', value: '『성종실록』 편찬' },
      { kind: 'event', value: '무오사화' },
    ],
    sources: [REF.yiGeukdon, REF.muoSahwa, REF.sillokCompileOrder, REF.sillokSachoOrder],
    relatedIds: ['per_kim_ilson', 'evt_muo_sahwa', 'evt_seongjong_sillok'],
  },
  {
    id: 'per_kim_jongjik',
    provenance: V,
    name: '김종직',
    hanja: '金宗直',
    born: 1431,
    died: 1492,
    summary:
      '조선 전기의 문신·학자. 본관 선산, 호 점필재. 1459년 문과 급제. 1457년에 「조의제문」을 지었다. ' +
      '김일손의 스승이며, 세상을 떠난 뒤 무오사화 때 「조의제문」과 관련되어 부관참시를 당했다.',
    facts: [
      { kind: 'name', value: '김종직' },
      { kind: 'penName', value: '점필재' },
      { kind: 'clan', value: '선산' },
      { kind: 'trait', value: '「조의제문」을 지음' },
    ],
    sources: [REF.kimJongjik, REF.jouijemun, REF.sillokProclaim],
    relatedIds: ['per_kim_ilson', 'src_jouijemun'],
  },
  {
    id: 'per_yu_jagwang',
    provenance: V,
    name: '유자광',
    hanja: '柳子光',
    born: 1439,
    died: 1512,
    summary:
      '조선 전기의 무신·문신. 본관 영광, 서얼 출신. 1467년 이시애의 난에 종군했고 1468년 남이 옥사로 익대공신이 되었다. ' +
      '김종직에게 원한을 품었으며, 「조의제문」에 주석을 달아 연산군에게 고해 무오사화를 일으켰다.',
    facts: [
      { kind: 'name', value: '유자광' },
      { kind: 'clan', value: '영광' },
      { kind: 'origin', value: '서얼' },
      { kind: 'trait', value: '「조의제문」에 주석을 달아 왕에게 고함' },
    ],
    sources: [REF.yuJagwang, REF.muoSahwa],
    relatedIds: ['per_kim_jongjik', 'evt_muo_sahwa'],
    authorNote: "office/event 사실은 일부러 비워 둠: '실록청 당상'·'『세조실록』 편찬 참여'를 모순이 아니라 '확인 불가'로 판정하게 하려는 것.",
  },
  {
    id: 'per_eo_segyeom',
    provenance: V,
    name: '어세겸',
    hanja: '魚世謙',
    summary:
      '조선 전기의 문신. 1495년 이극돈 등과 함께 『성종실록』 편찬의 명을 받았다. ' +
      '무오사화 뒤 수사관으로서 문제의 사초를 보고도 고하지 않은 죄로 파면되었다.',
    facts: [
      { kind: 'name', value: '어세겸' },
      { kind: 'trait', value: '『성종실록』 편찬의 명을 받음' },
      { kind: 'trait', value: '사화 뒤 수사관으로서 파면됨' },
    ],
    sources: [REF.sillokCompileOrder, REF.muoSahwa],
    relatedIds: ['evt_seongjong_sillok', 'evt_muo_sahwa'],
    authorNote:
      '생몰년 미검증 → 비움. 총재관이었는지는 이견(HISTORICAL_SOURCES 6장 이견 2)이므로 office 사실을 넣지 않는다.',
  },
];
