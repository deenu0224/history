/**
 * 인물 카드(DESIGN_V5 §4.1 표 「인물 카드 풀」, §13). 모두 verified 사실만, 출처마다 기사 id.
 * 카드는 그 사람에 대해 확인된 사실을 판정에 불리하더라도 빼지 않는다(검증기: 카드 키 ⊇ 원장의 판정 관련 키).
 * 소실 세계의 줄(altered)은 fictional 이며 복원 때 실록 문장으로 다시 쓰인다.
 *
 * 사실 키
 *  - 판정에 쓰는 키: ijo_panseo_1494 · surname_* · sillokcheong_staff · opposed_historian_attend_1497 ·
 *    state_funeral_commissioner_1494 (+ 미끼를 가르는 chief_compiler_1497 · supported_historian_attend_1497 · royal_tomb_commissioner_1494)
 *  - 읽을거리 키: sejo_sillok_{dongji,pyeonsu,gisa} → compiled_sejo_sillok 함의(근거로 쓰면 넷을 가리켜 not_unique)
 */
import type { FactKey, LedgerEntry, PersonCard, SourceRef } from '@/core/types';
import { SRC } from './sources';

const V = 'verified' as const;

/** 1498년 처분 문장(kja_10407027_001 국역 그대로) */
export const PROCLAIM_0727 =
  '수사관(修史官) 등이 사초를 보고도 즉시 아뢰지 않았으므로 어세겸(魚世謙)·이극돈(李克墩)·유순(柳洵)·윤효손(尹孝孫) 등은 파직하고, 홍귀달(洪貴達)·조익정(趙益貞)·허침(許琛)·안침(安琛) 등은 좌천(左遷)시켰다.';
/** 김일손 처분(kja_10407026_004 국역 그대로) */
export const VERDICT_0726 = '김일손(金馹孫)·권오복(權五福)·권경유(權景𥙿)는 대역(大逆)의 죄에 해당하니 능지 처사(凌遲處死)하고';
/** 사초 소각 명령(kja_10407028_003 국역 그대로). 집행 여부는 미확인 — '명을 내렸다'까지만 */
export const BURN_0728 = '실록청(實錄廳)에 전교하기를, "김종직·권오복·김일손·권경유 등의 사초(史草)는 다 곧 불살라 버려라." 하였다.';
/** 김일손의 거처(kja_10407012_002 국역 일부 그대로) */
export const CHEONGDO_0712 = '이때에 일손이 호조 정랑(戶曹正郞)으로 모친상을 당했는데, 복(服)을 벗자 풍병이 생겨 청도군(淸道郡)에서 살고 있었으며';

const dismissed = (id: string, label = '파직') => ({
  id,
  label,
  display: `${label} 1498년 · 사유: 기록 없음`,
  provenance: 'fictional' as const,
  restoredText: PROCLAIM_0727,
  restoredSource: SRC.proclaim0727,
});

export const FACT_KEY_IMPLIES: Record<FactKey, FactKey[]> = {
  sejo_sillok_dongji: ['compiled_sejo_sillok'],
  sejo_sillok_pyeonsu: ['compiled_sejo_sillok'],
  sejo_sillok_gisa: ['compiled_sejo_sillok'],
  /** 실록청 총재관이면 실록청에서 일한 사람이다(R-18) */
  chief_compiler_1497: ['sillokcheong_staff'],
};

/** 성씨 → 사실 키(이름에서 계산한다. 카드·원장 모두) */
export const SURNAME_KEYS: Record<string, FactKey> = {
  윤: 'surname_yun',
  이: 'surname_yi',
  어: 'surname_eo',
  홍: 'surname_hong',
  유: 'surname_yu',
  안: 'surname_an',
  신: 'surname_sin',
  한: 'surname_han',
  김: 'surname_kim',
  정: 'surname_jeong',
};

export const CARDS: PersonCard[] = [
  {
    id: 'yi_geukdon',
    name: '이극돈',
    hanja: '李克墩',
    lifespan: '1435 ~ 1503',
    provenance: V,
    roomAnchored: true,
    starter: true,
    searchTerms: ['이극돈', '李克墩', '극돈'],
    eye: { eyeId: 'E2' },
    facts: [
      {
        id: 'f_yi_ijo', plain: '이조 판서로서 임금 대신 제사를 지내러 갔다',
        text: '성종 25년(1494) 12월 23일, 「이조 판서(吏曹判書) 이극돈(李克墩)을 사직 기도 행향사(社稷祈禱行香使)로 … 삼았다.」',
        keys: ['ijo_panseo_1494'],
        provenance: V,
        source: SRC.r01,
      },
      {
        id: 'f_yi_ijo2', plain: '이조 판서로서 임금께 보고를 올렸다',
        text: '연산 1년(1495) 2월 25일, 「이조 판서(吏曹判書) 이극돈(李克墩)이 서계하기를」',
        keys: ['ijo_panseo_1494'],
        provenance: V,
        source: SRC.ijo0225,
      },
      {
        id: 'f_yi_staff', plain: '실록청 높은 관원들이 상으로 말과 옷감을 받았다',
        text: '실록청 당상 — 연산 3년(1497) 12월, 「당상(堂上) 이극돈(李克墩)·유순(柳洵)·홍귀달(洪貴達)·윤효손(尹孝孫)·안침(安琛) … 에게는 안장 갖춘 말 한 필과 표리 한 벌을 하사하고」',
        keys: ['sillokcheong_staff'],
        provenance: V,
        source: SRC.r18,
      },
      {
        id: 'f_yi_order', plain: '임금이 이 사람들에게 책을 엮으라 명했다',
        text: '연산 1년(1495) 4월, 「왕이 어세겸(魚世謙)·이극돈(李克墩)·유순(柳洵)·성현(成俔)·권건(權健)·신종호(申從濩)·조위(曺偉)에게 명하여 편찬하게 하였다.」',
        keys: ['compile_order_1495'],
        provenance: V,
        source: SRC.compileOrder,
      },
      {
        id: 'f_yi_sejo', plain: '『세조실록』을 엮는 일에 참여했다',
        text: '『세조실록』 찬수에 동지관사(同知館事)로 참여',
        keys: ['sejo_sillok_dongji'],
        provenance: V,
        source: SRC.sejoList,
      },
      {
        id: 'f_yi_r04', plain: '임금 무덤 자리를 살피는 일을 맡았다',
        text: '연산 즉위년(1494) 12월, 「윤필상(尹弼商)·노사신(盧思愼)·신승선(愼承善)·이극돈(李克墩)·김응기(金應箕)를 산릉 간심사로 삼았다.」',
        keys: ['royal_tomb_inspector_1494'],
        provenance: V,
        source: SRC.r04,
      },
      {
        id: 'f_yi_clan',
        text: '본관 광주(廣州). 1457년 친시 문과 급제.',
        keys: ['clan_gwangju', 'passed_exam_1457'],
        provenance: V,
        source: SRC.yiGeukdon,
      },
    ],
    altered: [dismissed('alt_yi')],
  },
  {
    id: 'eo_segyeom',
    name: '어세겸',
    hanja: '魚世謙',
    provenance: V,
    roomAnchored: true,
    starter: true,
    searchTerms: ['어세겸', '魚世謙', '세겸'],
    eye: { eyeId: 'E3' },
    facts: [
      {
        id: 'f_eo_r17', plain: '사관이 벼슬 정하는 자리에 꼭 있어야 하냐고 했다',
        text: '연산 3년(1497) 8월, 당직 사관을 정청(政廳)에 참예시키는 일을 의논할 때 어세겸 등이 「어찌 사관이 꼭 참예를 해야만 됩니까?」라고 의논하였다.',
        keys: ['opposed_historian_attend_1497'],
        provenance: V,
        source: SRC.r17,
      },
      {
        id: 'f_eo_r18', plain: '실록청 으뜸 관원으로 상을 받았다',
        text: '연산 3년(1497) 12월, 「실록청(實錄廳) 총재관(摠裁官) 신승선(愼承善)·어세겸(魚世謙)」에게 말과 표리를 하사하였다.',
        keys: ['chief_compiler_1497'],
        provenance: V,
        source: SRC.r18,
      },
      {
        id: 'f_eo_order', plain: '임금이 이 사람들에게 책을 엮으라 명했다',
        text: '연산 1년(1495) 4월, 「왕이 어세겸(魚世謙)·이극돈(李克墩)·유순(柳洵)·성현(成俔)·권건(權健)·신종호(申從濩)·조위(曺偉)에게 명하여 편찬하게 하였다.」',
        keys: ['compile_order_1495'],
        provenance: V,
        source: SRC.compileOrder,
      },
    ],
    altered: [{ ...dismissed('alt_eo'), erasedByClosure: 'clo_c2217_dawn' }],
  },
  {
    id: 'sin_seungseon',
    name: '신승선',
    hanja: '愼承善',
    provenance: V,
    roomAnchored: true,
    starter: true,
    searchTerms: ['신승선', '愼承善'],
    eye: {},
    facts: [
      {
        id: 'f_sin_r17', plain: '사관이 그 자리에 함께해도 괜찮다고 했다',
        text: '연산 3년(1497) 8월, 당직 사관의 정청 참청을 두고 「이제부터 시행하는 것도 역시 무방하다고 생각됩니다.」라고 의논하였다.',
        keys: ['supported_historian_attend_1497'],
        provenance: V,
        source: SRC.r17,
      },
      {
        id: 'f_sin_r18', plain: '실록청 으뜸 관원으로 상을 받았다',
        text: '연산 3년(1497) 12월, 「실록청(實錄廳) 총재관(摠裁官) 신승선(愼承善)·어세겸(魚世謙)」에게 말과 표리를 하사하였다.',
        keys: ['chief_compiler_1497'],
        provenance: V,
        source: SRC.r18,
      },
      {
        id: 'f_sin_r04', plain: '임금 무덤 자리를 살피는 일을 맡았다',
        text: '연산 즉위년(1494) 12월, 산릉 간심사로 삼았다(윤필상·노사신·신승선·이극돈·김응기).',
        keys: ['royal_tomb_inspector_1494'],
        provenance: V,
        source: SRC.r04,
      },
    ],
    authorNote: '1498년 처분 명단(kja_10407026_004, kja_10407027_001)에 없다 → 변조 줄 없음.',
  },
  {
    id: 'yun_hyoson',
    name: '윤효손',
    hanja: '尹孝孫',
    provenance: V,
    roomAnchored: true,
    searchTerms: ['윤효손', '尹孝孫', '효손', '윤', '윤 대감'],
    eye: { eyeId: 'E1' },
    facts: [
      {
        id: 'f_yun_r01', plain: '임금 대신 제사를 지내러 갔다',
        text: '성종 25년(1494) 12월 23일, 「우참찬(右參贊) 윤효손(尹孝孫)을 소격서 행향사(昭格署行香使)로 … 삼았다.」',
        keys: ['ucham_chan_1494'],
        provenance: V,
        source: SRC.r01,
      },
      {
        id: 'f_yun_staff', plain: '실록청 높은 관원들이 상으로 말과 옷감을 받았다',
        text: '실록청 당상 — 연산 3년(1497) 12월, 「당상(堂上) 이극돈(李克墩)·유순(柳洵)·홍귀달(洪貴達)·윤효손(尹孝孫)·안침(安琛) … 에게는 안장 갖춘 말 한 필과 표리 한 벌을 하사하고」',
        keys: ['sillokcheong_staff'],
        provenance: V,
        source: SRC.r18,
      },
      {
        id: 'f_yun_sejo', plain: '『세조실록』을 엮는 일에 참여했다',
        text: '『세조실록』 찬수에 편수관(編修官)으로 참여',
        keys: ['sejo_sillok_pyeonsu'],
        provenance: V,
        source: SRC.sejoList,
      },
      {
        id: 'f_yun_testimony', plain: '심문에서, 일손의 일을 함께 말한 적 없다고 했다',
        text: '공초에서 「신이 사국(史局)에 있을 적에도 일찍이 이목과 더불어 일손의 일을 이야기한 적이 없습니다.」',
        keys: ['sillokcheong_staff'],
        provenance: V,
        source: SRC.yunTestimony0712,
        afterRestore: true,
      },
    ],
    altered: [dismissed('alt_yun')],
  },
  {
    id: 'hong_gwidal',
    name: '홍귀달',
    hanja: '洪貴達',
    provenance: V,
    roomAnchored: true,
    searchTerms: ['홍귀달', '洪貴達', '귀달'],
    eye: { eyeId: 'E4' },
    facts: [
      {
        id: 'f_hong_r02', plain: '임금 장례를 맡은 관청의 책임자가 됐다',
        text: '연산 즉위년(1494) 12월 25일, 「… 호조 판서(戶曹判書) 홍귀달(洪貴達)을 국장 도감 제조(國葬都監提調)로 삼고」',
        keys: ['state_funeral_commissioner_1494'],
        provenance: V,
        source: SRC.r02,
      },
      {
        id: 'f_hong_staff', plain: '실록청 높은 관원들이 상으로 말과 옷감을 받았다',
        text: '실록청 당상 — 연산 3년(1497) 12월, 「당상(堂上) 이극돈(李克墩)·유순(柳洵)·홍귀달(洪貴達)·윤효손(尹孝孫)·안침(安琛) … 에게는 안장 갖춘 말 한 필과 표리 한 벌을 하사하고」',
        keys: ['sillokcheong_staff'],
        provenance: V,
        source: SRC.r18,
      },
      {
        id: 'f_hong_sejo', plain: '『세조실록』을 엮는 일에 참여했다',
        text: '『세조실록』 찬수에 편수관(編修官)으로 참여',
        keys: ['sejo_sillok_pyeonsu'],
        provenance: V,
        source: SRC.sejoList,
      },
      {
        id: 'f_hong_myoho', plain: '앞선 임금의 이름을 정할 때 「인」 자를 밀었다',
        text: '연산 1년(1495) 1월, 선왕의 묘호를 의논할 때 성준·홍귀달·유순·성현 등은 「인(仁)」을 주장했다.',
        keys: ['myoho_in_1495'],
        provenance: V,
        source: SRC.myoho,
      },
      {
        id: 'f_hong_gongjo',
        text: '연산 4년(1498) 7월 2일, 「홍귀달(洪貴達)을 공조 판서(工曹判書)로」',
        keys: ['gongjo_panseo_1498'],
        provenance: V,
        source: SRC.hongGongjo0702,
        afterRestore: true,
      },
    ],
    altered: [dismissed('alt_hong', '좌천')],
  },
  {
    id: 'yu_sun',
    name: '유순',
    hanja: '柳洵',
    provenance: V,
    roomAnchored: true,
    searchTerms: ['유순', '柳洵'],
    eye: {},
    facts: [
      {
        id: 'f_yu_staff', plain: '실록청 높은 관원들이 상으로 말과 옷감을 받았다',
        text: '실록청 당상 — 연산 3년(1497) 12월, 「당상(堂上) 이극돈(李克墩)·유순(柳洵)·홍귀달(洪貴達)·윤효손(尹孝孫)·안침(安琛) … 에게는 안장 갖춘 말 한 필과 표리 한 벌을 하사하고」',
        keys: ['sillokcheong_staff'],
        provenance: V,
        source: SRC.r18,
      },
      {
        id: 'f_yu_order', plain: '임금이 이 사람들에게 책을 엮으라 명했다',
        text: '연산 1년(1495) 4월, 「왕이 어세겸(魚世謙)·이극돈(李克墩)·유순(柳洵)·성현(成俔)·권건(權健)·신종호(申從濩)·조위(曺偉)에게 명하여 편찬하게 하였다.」',
        keys: ['compile_order_1495'],
        provenance: V,
        source: SRC.compileOrder,
      },
      {
        id: 'f_yu_r02', plain: '임금 무덤 만드는 관청의 책임자가 됐다',
        text: '연산 즉위년(1494) 12월 25일, 「좌참찬(左參贊) 정문형(鄭文炯)·공조 판서(工曹判書) 유순(柳洵) … 를 산릉 도감 제조(山陵都監提調)로 삼았다.」',
        keys: ['royal_tomb_commissioner_1494'],
        provenance: V,
        source: SRC.r02,
      },
      {
        id: 'f_yu_myoho', plain: '앞선 임금의 이름을 정할 때 「인」 자를 밀었다',
        text: '연산 1년(1495) 1월, 선왕의 묘호를 의논할 때 성준·홍귀달·유순·성현 등은 「인(仁)」을 주장했다.',
        keys: ['myoho_in_1495'],
        provenance: V,
        source: SRC.myoho,
      },
    ],
    altered: [dismissed('alt_yu')],
  },
  {
    id: 'an_chim',
    name: '안침',
    hanja: '安琛',
    provenance: V,
    roomAnchored: true,
    searchTerms: ['안침', '安琛'],
    eye: {},
    facts: [
      {
        id: 'f_an_staff', plain: '실록청 높은 관원들이 상으로 말과 옷감을 받았다',
        text: '실록청 당상 — 연산 3년(1497) 12월, 「당상(堂上) 이극돈(李克墩)·유순(柳洵)·홍귀달(洪貴達)·윤효손(尹孝孫)·안침(安琛) … 에게는 안장 갖춘 말 한 필과 표리 한 벌을 하사하고」',
        keys: ['sillokcheong_staff'],
        provenance: V,
        source: SRC.r18,
      },
      { id: 'f_an_sejo', text: '『세조실록』 찬수에 기사관(記事官)으로 참여', keys: ['sejo_sillok_gisa'], provenance: V, source: SRC.sejoList },
      { id: 'f_an_yejong', text: '『예종실록』 찬수에 기사관(記事官)으로 참여', keys: ['yejong_sillok_gisa'], provenance: V, source: SRC.yejongList },
    ],
    altered: [dismissed('alt_an', '좌천')],
  },
  {
    id: 'yun_pilsang',
    name: '윤필상',
    hanja: '尹弼商',
    provenance: V,
    roomAnchored: false,
    searchTerms: ['윤필상', '尹弼商', '필상', '윤', '윤 대감'],
    eye: {},
    facts: [
      {
        id: 'f_pil_r04', plain: '임금 무덤 자리를 살피는 일을 맡았다',
        text: '연산 즉위년(1494) 12월, 「윤필상(尹弼商)·노사신(盧思愼)·신승선(愼承善)·이극돈(李克墩)·김응기(金應箕)를 산릉 간심사로 삼았다.」',
        keys: ['royal_tomb_inspector_1494'],
        provenance: V,
        source: SRC.r04,
      },
      {
        id: 'f_pil_myoho', plain: '중국에 같은 이름의 황제가 있다며 「인」 자에 반대했다',
        text: '연산 1년(1495) 1월, 선왕의 묘호를 의논할 때 윤필상 등이 「중조에 인종 황제가 있다」며 「인(仁)」에 반대했다.',
        keys: ['myoho_debate_1495'],
        provenance: V,
        source: SRC.myoho,
      },
    ],
  },
  {
    id: 'yi_geukgyun',
    name: '이극균',
    hanja: '李克均',
    provenance: V,
    roomAnchored: false,
    searchTerms: ['이극균', '李克均'],
    eye: {},
    facts: [
      {
        id: 'f_gg_r02', plain: '임금 장례를 맡은 관청의 책임자가 됐다',
        text: '연산 즉위년(1494) 12월 25일, 「지중추부사(知中樞府事) 이극균(李克均) … 을 국장 도감 제조(國葬都監提調)로 삼고」',
        keys: ['state_funeral_commissioner_1494'],
        provenance: V,
        source: SRC.r02,
      },
    ],
  },
  {
    id: 'han_chihyeong',
    name: '한치형',
    hanja: '韓致亨',
    provenance: V,
    roomAnchored: false,
    searchTerms: ['한치형', '韓致亨'],
    eye: {},
    facts: [
      {
        id: 'f_han_r02', plain: '임금 장례를 맡은 관청의 책임자가 됐다',
        text: '연산 즉위년(1494) 12월 25일, 「… 좌찬성(左贊成) 한치형(韓致亨) … 을 국장 도감 제조(國葬都監提調)로 삼고」',
        keys: ['state_funeral_commissioner_1494'],
        provenance: V,
        source: SRC.r02,
      },
      {
        id: 'f_han_r17', plain: '사관이 벼슬 정하는 자리에 꼭 있어야 하냐고 했다',
        text: '연산 3년(1497) 8월, 「어세겸(魚世謙)·정문형(鄭文炯)·한치형(韓致亨)은 의논드리기를」 「어찌 사관이 꼭 참예를 해야만 됩니까?」',
        keys: ['opposed_historian_attend_1497'],
        provenance: V,
        source: SRC.r17,
      },
      {
        id: 'f_han_r01', plain: '임금 대신 제사를 지내러 갔다',
        text: '성종 25년(1494) 12월 23일, 「좌찬성(左贊成) 한치형(韓致亨)을 종묘 행향사(宗廟行香使)로」 삼았다.',
        keys: ['jwachanseong_1494'],
        provenance: V,
        source: SRC.r01,
      },
    ],
  },
  {
    id: 'kim_ilson',
    name: '김일손',
    hanja: '金馹孫',
    lifespan: '1464 ~ 1498',
    provenance: V,
    roomAnchored: false,
    searchTerms: ['김일손', '金馹孫', '일손', '탁영'],
    eye: {
      eyeId: 'E5',
      never: {
        reason: '그날을 가리키는 그의 기록이 남아 있지 않다',
        restoredLines: [
          { text: BURN_0728, source: SRC.burn0728 },
          { text: `「${CHEONGDO_0712}」`, source: SRC.cheongdo0712 },
        ],
      },
    },
    facts: [
      { id: 'f_kim_clan', text: '본관 김해(金海). 호 탁영(濯纓).', keys: ['clan_gimhae'], provenance: V, source: SRC.kimIlson },
      {
        id: 'f_kim_r14', plain: '지방 관원으로 임금께 글을 올렸다',
        text: '연산 1년(1495) 5월, 「충청도 도사(忠淸道都事) 김일손(金馹孫)이 상소하기를」',
        keys: ['office_chungcheong_dosa_1495'],
        provenance: V,
        source: SRC.r14,
      },
      {
        id: 'f_kim_r15', plain: '바른말 하는 관원으로 임금께 말씀을 올렸다',
        text: '연산 1년(1495) 10월, 「헌납(獻納) 김일손(金馹孫)이 아뢰기를」',
        keys: ['office_heonnap_1495'],
        provenance: V,
        source: SRC.r15,
      },
      {
        id: 'f_kim_cheongdo', plain: '어머니 장례 뒤 병이 나 청도에서 살고 있었다',
        text: `「${CHEONGDO_0712}」`,
        keys: ['cheongdo_1498'],
        provenance: V,
        source: SRC.cheongdo0712,
        afterRestore: true,
      },
    ],
    altered: [
      {
        id: 'alt_kim',
        label: '사망',
        display: '사망 1498년 7월 · 사인: 기록 없음',
        provenance: 'fictional',
        restoredText: VERDICT_0726,
        restoredSource: SRC.verdict0726,
      },
    ],
  },
  {
    id: 'kim_jongjik',
    name: '김종직',
    hanja: '金宗直',
    lifespan: '1431 ~ 1492',
    provenance: V,
    roomAnchored: false,
    searchTerms: ['김종직', '金宗直', '점필재', '종직'],
    eye: {},
    facts: [
      { id: 'f_jj_pen', text: '본관 선산(善山). 호 점필재(佔畢齋).', keys: ['pen_name_jeompiljae'], provenance: V, source: SRC.kimJongjik },
      { id: 'f_jj_jouije', text: '「조의제문(弔義帝文)」을 지었다.', keys: ['wrote_jouijemun'], provenance: V, source: SRC.jouijemun },
      { id: 'f_jj_sejo', plain: '『세조실록』을 엮는 일에 참여했다', text: '『세조실록』 찬수에 기사관(記事官)으로 참여', keys: ['sejo_sillok_gisa'], provenance: V, source: SRC.sejoList },
    ],
  },
];

const L = (key: FactKey, source: SourceRef): LedgerEntry => ({ key, source });

/**
 * 원장(검증기 전용): HISTORICAL_SOURCES 에서 확인된 verified 사실 키 전부. 성씨 키는 이름에서 더한다(core/tag.ts ledgerKeys).
 * 카드보다 넓다 — 카드에서 사실을 빼서 유일하게 만들면 검증기가 잡는다.
 */
export const PERSON_FACT_LEDGER: Record<string, LedgerEntry[]> = {
  yi_geukdon: [
    L('ijo_panseo_1494', SRC.r01),
    L('sillokcheong_staff', SRC.r18),
    L('compile_order_1495', SRC.compileOrder),
    L('sejo_sillok_dongji', SRC.sejoList),
    L('royal_tomb_inspector_1494', SRC.r04),
    L('clan_gwangju', SRC.yiGeukdon),
    L('passed_exam_1457', SRC.yiGeukdon),
  ],
  eo_segyeom: [
    L('opposed_historian_attend_1497', SRC.r17),
    L('chief_compiler_1497', SRC.r18),
    L('compile_order_1495', SRC.compileOrder),
  ],
  sin_seungseon: [
    L('supported_historian_attend_1497', SRC.r17),
    L('chief_compiler_1497', SRC.r18),
    L('royal_tomb_inspector_1494', SRC.r04),
  ],
  yun_hyoson: [
    L('ucham_chan_1494', SRC.r01),
    L('sillokcheong_staff', SRC.r18),
    L('sejo_sillok_pyeonsu', SRC.sejoList),
  ],
  hong_gwidal: [
    L('state_funeral_commissioner_1494', SRC.r02),
    L('sillokcheong_staff', SRC.r18),
    L('sejo_sillok_pyeonsu', SRC.sejoList),
    L('myoho_in_1495', SRC.myoho),
    L('gongjo_panseo_1498', SRC.hongGongjo0702),
  ],
  yu_sun: [
    L('sillokcheong_staff', SRC.r18),
    L('compile_order_1495', SRC.compileOrder),
    L('royal_tomb_commissioner_1494', SRC.r02),
    L('myoho_in_1495', SRC.myoho),
  ],
  an_chim: [
    L('sillokcheong_staff', SRC.r18),
    L('sejo_sillok_gisa', SRC.sejoList),
    L('yejong_sillok_gisa', SRC.yejongList),
  ],
  yun_pilsang: [L('royal_tomb_inspector_1494', SRC.r04), L('myoho_debate_1495', SRC.myoho)],
  yi_geukgyun: [L('state_funeral_commissioner_1494', SRC.r02)],
  han_chihyeong: [
    L('state_funeral_commissioner_1494', SRC.r02),
    L('opposed_historian_attend_1497', SRC.r17),
    L('jwachanseong_1494', SRC.r01),
  ],
  jeong_munhyeong: [L('opposed_historian_attend_1497', SRC.r17), L('royal_tomb_commissioner_1494', SRC.r02)],
  kim_ilson: [
    L('clan_gimhae', SRC.kimIlson),
    L('office_chungcheong_dosa_1495', SRC.r14),
    L('office_heonnap_1495', SRC.r15),
    L('cheongdo_1498', SRC.cheongdo0712),
  ],
  kim_jongjik: [L('pen_name_jeompiljae', SRC.kimJongjik), L('wrote_jouijemun', SRC.jouijemun), L('sejo_sillok_gisa', SRC.sejoList)],
};

/** 원장의 사람 이름(성씨 키 계산용) */
export const LEDGER_NAMES: Record<string, string> = {
  yi_geukdon: '이극돈',
  eo_segyeom: '어세겸',
  sin_seungseon: '신승선',
  yun_hyoson: '윤효손',
  hong_gwidal: '홍귀달',
  yu_sun: '유순',
  an_chim: '안침',
  yun_pilsang: '윤필상',
  yi_geukgyun: '이극균',
  han_chihyeong: '한치형',
  jeong_munhyeong: '정문형',
  kim_ilson: '김일손',
  kim_jongjik: '김종직',
};

/** 그날 그 방에 있던 실명 인물(유일성 대상, 「?」 포함) — §4.1 */
export const ROOM_PERSONS = ['yun_hyoson', 'yi_geukdon', 'eo_segyeom', 'hong_gwidal', 'yu_sun', 'an_chim'];
