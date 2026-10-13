/**
 * 에피소드 1 증거 카드.
 *  - levels[0] 은 관측 중 처음 얻는 카드: 연도·왕대·인물 이름을 밝히지 않는다(과거 장면 UI 규칙).
 *  - levels[1+] 은 단말에서 검색·사료 구절로 맞춰 본 뒤 열린다(연대 제약은 여기서 공개).
 *  - 말소된 세계: 무오사화의 실록 기사는 DB 에 없다. 그래서 카드 문구는 '두 현실 모두에서 참'인 사실만 쓰거나,
 *    변조된 DB 상태를 그대로 옮긴 카드(ev_db_deaths, fictional)로 둔다.
 *  - time.feedback: 카드마다 고유한 판정 한 줄(정답·4자리 연도 금지 — 테스트).
 *  - 연대 제약은 docs/HISTORICAL_SOURCES.md 7.1 을 따르되, 말소 전제에 맞춰 다시 짰다(TERMINAL_DESIGN §연도 단서표).
 */
import type { Evidence } from '@/core/types';
import { FACT } from '@/data/historical/facts';
import { REF } from '@/data/historical/refs';

const R = 'reconstructed' as const;
const V = 'verified' as const;
const F = 'fictional' as const;

export const evidence: Evidence[] = [
  // ── 연도 추리 ────────────────────────────────────────────────
  {
    // C1: 묘호 '성종' → 성종 사후(1495년 음력 1월 14일 묘호 결정) 이후. 함정(轉): 성종 재위기로 답하면 모순.
    id: 'ev_myoho',
    provenance: R,
    category: 'testimony',
    levels: [
      {
        label: '선왕의 칭호',
        text: "서리가 엮고 있는 실록을 '성종대왕 실록'이라 부른다. 지금 왕이 아니라 앞선 왕을 가리키는 말투다.",
      },
      {
        label: "묘호 '성종'",
        text:
          "‘성(成)’은 왕이 죽은 뒤 신하들이 의논해 정하는 묘호다. 실록에 따르면 묘호 ‘성’은 성종이 세상을 떠난 뒤 " +
          '1495년(음력 1월 14일)에 정해졌다. 이 칭호를 쓰는 장면은 그 이후다.',
        time: {
          notBefore: 1495,
          strength: 'decisive',
          feedback: '묘호는 왕이 세상을 떠난 뒤에 붙는다. 이 칭호가 들린 날은 그 왕의 치세 안일 수 없다.',
        },
      },
    ],
    sources: [REF.sillokMyoho, REF.myoho, REF.sillokSeongjongDeath],
    relatedIds: ['src_myoho'],
  },
  {
    // C2: 『성종실록』 실록청 1495.4 설치 ~ 1499.3 인쇄 완료
    id: 'ev_sillokcheong',
    provenance: R,
    category: 'observation',
    levels: [
      {
        label: '선왕의 기록을 엮는 곳',
        text: '거둬 온 사초를 날짜 순으로 옮겨 적고 있다. 한 임금의 치세를 하루하루 엮는 일이다.',
      },
      {
        label: '실록청',
        text:
          '왕이 죽은 뒤 실록을 엮으려고 세우는 임시 관청. 앞선 왕이 성종이라면, 『성종실록』 실록청은 1495년 4월 ' +
          '춘추관 안에 설치되어 1499년 3월 인쇄를 마쳤다.',
        time: {
          notBefore: 1495,
          notAfter: 1499,
          strength: 'decisive',
          feedback: '임시 관청은 문을 연 날과 닫은 날이 있다. 이 카드는 앞뒤를 함께 막지만, 그 사이가 몇 해나 된다.',
        },
      },
    ],
    sources: [REF.seongjongSillok, REF.sillokCompileOrder],
    relatedIds: ['evt_seongjong_sillok', 'plc_chunchugwan'],
  },
  {
    // C3: 이극돈이 실록청 당상(1495 지관사 ~ 1498 파면). 인물 추리 정답 보상으로 단계 1 공개.
    // 말소된 세계에서도 '1498년 파직'은 남아 있다(사유만 없다) — 카드는 사유를 쓰지 않는다.
    id: 'ev_unknown_official',
    provenance: R,
    category: 'person',
    levels: [
      {
        label: '미확인 관료',
        text: "붉은 관복의 노관. 서리들은 그를 '당상'이라 부르고, 실록을 엮는 일이 그의 손을 거친다.",
        proves: [FACT.officeSillokDangsang],
      },
      {
        label: '이극돈(李克墩)',
        text:
          '1435~1503. 『세조실록』 편수관을 지냈고, 1495년 지관사로서 『성종실록』 편찬을 맡아 실록청 당상으로 사초를 정리했다. ' +
          '1498년 파직되었다. 그가 당상으로 있는 장면은 1495~1498년 사이다.',
        proves: [FACT.nameYiGeukdon],
        time: {
          notBefore: 1495,
          notAfter: 1498,
          strength: 'decisive',
          feedback: '한 사람이 한 자리에 머문 기간은 짧다. 당상이 그 자리를 떠나기 전의 일이다.',
        },
      },
    ],
    sources: [REF.yiGeukdon, REF.muoSahwa, REF.sillokCompileOrder],
    relatedIds: ['per_yi_geukdon'],
  },
  {
    // C4: 사초를 쓴 김일손이 아직 살아 있다 → 1498(졸년) 이전. 검증: 관측(전교로 이름) + DB 졸년(검색 '김일손').
    id: 'ev_author_alive',
    provenance: R,
    category: 'testimony',
    levels: [
      {
        label: '사초를 쓴 사관',
        text: '문제의 사초를 쓴 사관은 아직 살아 있다. 관원들은 그가 곧 불려 올 것이라 수군댄다.',
      },
      {
        label: '김일손(金馹孫)',
        text:
          '전교에 이름이 나온 사초의 주인. 통합 DB: 1464~1498. 기록상 1498년에 세상을 떠났다. ' +
          '그가 살아 있는 장면은 그해를 넘지 않는다.',
        proves: [FACT.nameKimIlson],
        time: {
          notAfter: 1498,
          strength: 'decisive',
          feedback: '산 사람이 나오는 장면은 그 사람이 죽은 해를 넘을 수 없다. 끝을 막는 카드다.',
        },
      },
    ],
    sources: [REF.kimIlson],
    relatedIds: ['per_kim_ilson'],
  },
  {
    // C5: 김종직이 이미 세상을 떠났다 → 1492 이후(보조)
    id: 'ev_jongjik_dead',
    provenance: R,
    category: 'testimony',
    levels: [
      {
        label: '돌아가신 스승',
        text: "젊은 관원은 그 글을 지은 이를 '돌아가신 점필재 선생'이라 부른다.",
      },
      {
        label: '김종직(점필재)',
        text: '1431~1492. 호 점필재. 그를 고인으로 부르는 장면은 1492년 이후다. 다만 범위를 크게 좁히지는 못한다.',
        time: {
          notBefore: 1492,
          strength: 'supporting',
          feedback: '고인이 된 뒤라는 것은 맞다. 하지만 다른 카드들이 이미 더 늦은 시작을 말하고 있을지 모른다.',
        },
      },
    ],
    sources: [REF.kimJongjik],
    relatedIds: ['per_kim_jongjik'],
  },
  {
    // 「조의제문」: 말소된 세계에서는 '1457년에 지어진 글'까지만 확인된다(사초 문제는 복원 뒤). 연대로는 느슨한 보조.
    id: 'ev_jouijemun',
    provenance: R,
    category: 'testimony',
    levels: [
      {
        label: '문제가 된 글',
        text: '당상이 어느 사초에 실린 글 한 편을 문제 삼았다. 젊은 관원은 그것이 「조의제문」이라고 한다.',
        proves: [FACT.claimJouijemunInSacho],
      },
      {
        label: '「조의제문」',
        text:
          '김종직이 1457년에 지은 글. 꿈에 초나라 의제를 만난 일을 적었고, 의제를 죽인 항우에 세조를 빗댄 글로 해석된다. ' +
          '수십 년 묵은 글이 왜 지금 문제가 되었는지는 DB 에 없다.',
        time: {
          notBefore: 1457,
          strength: 'supporting',
          feedback: '글이 지어지기 전일 수는 없다. 그러나 오래 읽힌 글이라, 이 카드 혼자서는 거의 아무것도 좁히지 못한다.',
        },
      },
    ],
    sources: [REF.jouijemun, REF.kimJongjik],
    relatedIds: ['src_jouijemun'],
  },
  {
    // R1 레드 헤링: 법전은 오래 쓰인다
    id: 'ev_lawbook',
    provenance: R,
    category: 'object',
    levels: [
      {
        label: '오래된 서책',
        text: "젊은 관원의 서안 위. 표지에 '經國大典' 네 글자. 손때가 많이 묻었다.",
      },
      {
        label: '『경국대전』',
        text:
          '조선의 기본 법전. 1471년 처음 시행되었고 1485년부터 최종본 『을사대전』이 시행되었다. ' +
          '반포된 뒤 오래도록 쓰였으므로, 책상 위에 있다는 사실만으로는 시점을 좁힐 수 없다.',
        time: {
          notBefore: 1471,
          strength: 'weak',
          weakReason: '반포 뒤 오래도록 쓰인 법전',
          feedback: '손때 묻은 법전은 몇십 년이고 책상 위에 있다. 이 책으로는 해를 정하지 않는다.',
        },
      },
    ],
    sources: [REF.gyeongguk],
    relatedIds: ['src_gyeongguk'],
  },
  {
    // R2 레드 헤링(단말): 탁영금 제작 시기는 추정이고 악기는 오래 쓰인다. 과거 장면에는 두지 않는다.
    id: 'ev_takyeong_record',
    provenance: V,
    category: 'object',
    levels: [
      {
        label: '탁영금 기록',
        text:
          '보물 「김일손 거문고」. 흔히 탁영금이라 부른다. 제작 시기는 1490년경으로 추정되며, ' +
          '근거가 된 명문은 알려져 있지 않다. 지금도 남아 있는 악기다.',
        proves: [FACT.possessionTakyeong],
        time: {
          notBefore: 1490,
          strength: 'weak',
          weakReason: '제작 연대가 추정이고, 악기는 오래도록 쓰임',
          feedback: '거문고는 주인보다 오래 산다. 지금도 박물관에 있다. 이 카드는 관측의 해를 말해 주지 않는다.',
        },
      },
    ],
    sources: [REF.takyeongKhs, REF.takyeongEncy],
    relatedIds: ['art_takyeong'],
  },
  {
    // 변조된 DB 상태(가상): 원인 없는 결과. 검색 '권오복'·'권경유'(김일손 검색 결과의 칩)로 얻는다.
    id: 'ev_db_deaths',
    provenance: F,
    category: 'document',
    levels: [
      {
        label: '같은 달의 졸년',
        text: '통합 DB: 김일손 · 권오복 · 권경유. 세 사람 모두 같은 해 같은 달에 졸. 사인 기록은 셋 다 없다. 오류 0건.',
        proves: [FACT.claimSameMonthDeaths],
      },
    ],
    authorNote: '말소된 세계의 DB 상태를 옮긴 카드. 실제 역사로 표시하지 않는다(복원 뒤에는 사인이 있다).',
    relatedIds: ['per_kim_ilson'],
  },
  {
    // 결정적 연결(보드의 카드 겹치기: 전교 + 같은 달의 졸년, 사관의 생존 확인 필요). 연도(轉→結)와 인과(봉우리)에 쓰인다.
    id: 'ev_same_month',
    provenance: R,
    category: 'observation',
    levels: [
      {
        label: '사초와 세 죽음',
        text:
          '관측한 날, 왕은 김일손의 사초를 모두 대내로 들이라 했다. 그는 그날 살아 있었다. DB 에는 그가 죽은 해와 달이 있고, ' +
          '같은 달 두 사람이 더 죽었다 — 사인 없이. 사초를 거둔 날과 세 죽음은 떨어져 있지 않다. 같은 해의 일이다.',
        proves: [FACT.claimOrderThenDeaths],
        time: {
          notBefore: 1498,
          strength: 'decisive',
          feedback: '사초를 거둔 날은 세 죽음과 같은 해에 묶였다. 이제 시작이 끝까지 밀려 올라간다.',
        },
      },
    ],
    sources: [REF.sillokSachoOrder, REF.sillokVerdict, REF.kimIlson],
    authorNote: '추론 카드. 근거가 된 실제 기사(7/11, 7/26)는 복원 뒤에야 DB 에 보인다.',
    relatedIds: ['per_kim_ilson'],
  },

  // ── 인물 추리 ────────────────────────────────────────────────
  {
    id: 'ev_veteran',
    provenance: R,
    category: 'testimony',
    levels: [
      {
        label: '서리의 귀엣말',
        text: '“저 영감은 세조대왕 실록 때도 편수를 맡으셨다지.” 붉은 관복의 당상을 두고 한 말이다.',
        proves: [FACT.eventSejoSillok],
      },
    ],
    sources: [REF.yiGeukdon],
    relatedIds: ['per_yi_geukdon'],
  },

  // ── 인과 추리의 마디·오답 ────────────────────────────────────
  {
    id: 'ev_gajang',
    provenance: R,
    category: 'object',
    levels: [
      {
        label: '사초 꾸러미',
        text: '끈으로 묶은 종이 꾸러미가 수십 묶음. 꼬리표마다 다른 사람의 이름이 적혀 있다.',
      },
      {
        label: '가장사초',
        text:
          '사관은 사초를 두 벌 써서 한 벌은 춘추관에 내고 한 벌은 집에 두었다(가장사초). ' +
          '실록청이 서면 이것을 거두어 편찬에 썼다. 평소의 편찬 절차이므로 이것만으로 별다른 사건이 있었다고 할 수 없다.',
        proves: [FACT.claimGajangCollected],
      },
    ],
    sources: [REF.geomyeol, REF.sagwan],
    relatedIds: ['evt_seongjong_sillok'],
  },
  {
    id: 'ev_royal_order',
    provenance: V,
    category: 'document',
    levels: [
      {
        label: '전교',
        text: '“김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라.” 왕의 명이 관청에 닿았다.',
        proves: [FACT.claimOrderAllSacho],
      },
      {
        label: '전교 — 실록과 대조',
        text:
          '『연산군일기』 7월 11일 기사의 전교와 글자 그대로 일치한다. ' +
          '같은 기사에 당상들의 반대, 그리고 사초에서 6조목을 뽑아 올린 일이 이어진다.',
      },
    ],
    sources: [REF.sillokSachoOrder],
    relatedIds: ['src_sacho_order'],
  },
  {
    id: 'ev_objection',
    provenance: V,
    category: 'testimony',
    levels: [
      {
        label: '당상들의 간언',
        text:
          '“예로부터 사초(史草)는 임금이 스스로 보지 않습니다.” ' +
          '“임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다.”',
        proves: [FACT.claimSachoCustom],
      },
    ],
    sources: [REF.sillokSachoOrder],
    relatedIds: ['src_sacho_order'],
  },
  {
    id: 'ev_six_articles',
    provenance: R,
    category: 'observation',
    levels: [
      {
        label: '봉해진 여섯 조목',
        text: '당상들이 사초에서 여섯 조목을 가려 뽑아 봉한다. 붉은 관복의 당상도 그 자리에 있다. 나머지는 다시 묶인다.',
        proves: [FACT.claimSixArticles],
      },
      {
        label: '6조목 절취',
        text: '실록: "… 등이 일손의 사초에서 6조목을 절취하여 봉해 올리니". 사초는 일부나마 왕에게 들어갔다.',
      },
    ],
    sources: [REF.sillokSachoOrder],
    relatedIds: ['src_sacho_order', 'per_yi_geukdon'],
  },
  {
    id: 'ev_sillok_done',
    provenance: V,
    category: 'document',
    levels: [
      {
        label: '『성종실록』 완성 기록',
        text: '편찬은 큰 지장 없이 이어져 1499년 3월 인쇄를 마치고 네 곳의 사고에 봉안되었다. 297권 47책.',
        proves: [FACT.claimSillokCompleted],
      },
    ],
    sources: [REF.seongjongSillok],
    relatedIds: ['evt_seongjong_sillok'],
  },
];
