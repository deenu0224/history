/**
 * 에피소드 1 퍼즐 데이터: 이름 붙이기 규칙 T1~T4 · 주장(칸 값)·모순 X1/X2 · 기록 다시 쓰기 문장 L1~L4(+S1~S3)·조각 ·
 * 복원 전문(DESIGN_V5 §4.5~§4.9, §13).
 * 판정은 코어가 사실 키·방 기하로 계산한다. 여기의 acceptedEvidence 는 검증기가 다시 계산해 맞는지 확인한다.
 */
import type { Claim, Contradiction, RecordPiece, RecordSentence, RestoredArticle, TagRule } from '@/core/types';
import { SRC } from './sources';

export const TAGS: TagRule[] = [
  {
    id: 'T1',
    figureId: 'fig_yi',
    personId: 'yi_geukdon',
    acceptedEvidence: ['l_e1_2a'],
    uniquenessNote: '선왕 승하 무렵(성종 25년 12월) 이조 판서는 한 자리 — R-01 kia_12512023_004, kja_10102025_002. 원장에서 이 키를 가진 사람은 이극돈 하나.',
    decoys: [],
  },
  {
    id: 'T2',
    figureId: 'fig_yun',
    personId: 'yun_hyoson',
    acceptedEvidence: ['l_e2_1'],
    uniquenessNote: '방 안의 윤씨는 윤효손 하나(윤필상은 이 방의 카드가 아니다). sillokcheong_staff — R-18 kja_10312021_001.',
    decoys: [{ personId: 'yun_pilsang', event: 'ev.decoy.T2' }],
  },
  {
    id: 'T3',
    figureId: 'fig_eo',
    personId: 'eo_segyeom',
    acceptedEvidence: ['l_e1_3'],
    uniquenessNote: 'R-17 kja_10308001_003 반대 의논자 어세겸·정문형·한치형 중 이 방에 있는 사람은 어세겸 하나. 신승선은 같은 의논에서 찬성.',
    decoys: [{ personId: 'sin_seungseon', event: 'ev.decoy.T3' }],
  },
  {
    id: 'T4',
    figureId: 'fig_hong',
    personId: 'hong_gwidal',
    acceptedEvidence: ['l_e3_1'],
    uniquenessNote: 'R-02 kja_10012025_008 국장 도감 제조 이극균·한치형·홍귀달 중 이 방에 있는 사람은 홍귀달 하나(유순은 산릉 도감).',
    decoys: [
      { personId: 'yi_geukgyun', event: 'ev.decoy.T4' },
      { personId: 'han_chihyeong', event: 'ev.decoy.T4' },
    ],
  },
];

/** 다시 쓰기 칸에 넣을 수 있는 값 — 근거가 로그에 있어야 '확인한 값'이 된다. 'who' 칸은 이름 붙인 사람에서 온다. */
export const CLAIMS: Claim[] = [
  { id: 'c_whose_kim', slot: 'whose', value: '김일손', label: '김일손', from: ['l_order1', 'd_nametag'] },
  { id: 'c_whose_jeompil', slot: 'whose', value: '점필재', label: '점필재', from: ['l_e3_5'] },
  { id: 'c_scope_all', slot: 'scope', value: '모두', label: '모두', from: ['l_order1'] },
  { id: 'c_scope_six', slot: 'scope', value: '여섯 조목만', label: '여섯 조목만', from: ['l_e4_5a'], hearsay: true },
  { id: 'c_count_6', slot: 'count', value: '6', label: '여섯', from: ['d_slips_six'] },
  { id: 'c_count_5', slot: 'count', value: '5', label: '다섯', from: ['d_slips_five'] },
  { id: 'c_speaker_dangsang', slot: 'speaker', value: '당상(이극돈 등)', label: '당상(이극돈 등)', from: ['l_remon1', 'l_remon2'] },
  { id: 'c_speaker_upper', slot: 'speaker', value: '윗자리 대감', label: '윗자리 대감', from: ['l_e1_3'] },
  { id: 'c_speaker_msg', slot: 'speaker', value: '명령을 전하러 온 사람', label: '명령을 전하러 온 사람', from: ['l_order1', 'l_order2', 'l_order3'] },
];

export const CONTRADICTIONS: Contradiction[] = [
  {
    id: 'X1',
    slot: 'scope',
    claims: ['c_scope_all', 'c_scope_six'],
    resolvedBy: { kind: 'hearing', lineId: 'l_order1', time: '14:00', sourcePosId: 'B' },
    revealWhen: 'claims',
    loserLabel: '뒤섞인 전해 들은 말',
    loserNote: '순서와 말한 사람이 섞였다',
    retryText: '그 자리에서 그 말이 닿았는지 보자',
    buttons: ['「모두」를 남긴다', '「여섯 조목만」을 남긴다'],
  },
  {
    id: 'X2',
    slot: 'count',
    claims: ['c_count_6', 'c_count_5'],
    resolvedBy: { kind: 'sight', targetPosId: 'SP', time: '15:00', occluderId: 'stack' },
    revealWhen: 'slot_open',
    loserLabel: '가려서 덜 보인 것',
    retryText: '그 자리에서 그것이 보였는지 보자',
    buttons: ['「여섯 장」을 남긴다', '「다섯 장」을 남긴다'],
  },
];

const ed = (text: string) => ({ text, editorial: true as const });
const SPEAKER = { kind: 'speaker' as const, accepts: '당상(이극돈 등)', display: '실록청 당상(이극돈 등)' };

/** 출처: kja_10407011_001 국역(HISTORICAL_SOURCES §11.1). editorial 조각은 실록 문장이 아니다(「( )」). */
export const SENTENCES: RecordSentence[] = [
  {
    id: 'L1',
    label: 'L1',
    source: SRC.order0711,
    provenance: 'verified',
    order: 1,
    time: '14:00',
    segments: [
      { text: '전교하기를, "' },
      { text: '', slot: { kind: 'whose', accepts: '김일손', display: '김일손(金馹孫)' } },
      { text: '의 사초(史草)를 ' },
      { text: '', slot: { kind: 'scope', accepts: '모두', display: '모두' } },
      { text: ' 대내(大內)로 들여오라."' },
    ],
  },
  {
    id: 'L2',
    label: 'L2',
    source: SRC.order0711,
    provenance: 'verified',
    order: 2,
    time: '14:05',
    segments: [ed('('), { text: '', editorial: true, slot: SPEAKER }, ed('이 아뢰기를) '), { text: '"예로부터 사초(史草)는 임금이 스스로 보지 않습니다.' }],
  },
  {
    id: 'L3',
    label: 'L3',
    source: SRC.order0711,
    provenance: 'verified',
    order: 3,
    time: '14:05',
    segments: [ed('('), { text: '', editorial: true, slot: SPEAKER }, ed(') '), { text: '임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다."' }],
  },
  {
    id: 'S1',
    label: 'S1',
    source: SRC.order0711,
    provenance: 'verified',
    optional: true,
    order: 4,
    time: '14:20',
    segments: [{ text: '전교하기를, "즉시 빠짐 없이 대내로 들이라." 하였다.' }],
  },
  {
    id: 'S2',
    label: 'S2',
    source: SRC.order0711,
    provenance: 'verified',
    optional: true,
    order: 5,
    time: '14:40',
    segments: [{ text: '극돈 등이 다시 아뢰기를, "…일이 만일 종묘 사직에 관계가 있으면 상고하지 않을 수 없사오니, 신 등이 그 상고할 만한 곳을 절취하여 올리겠습니다…"' }],
  },
  {
    id: 'S3',
    label: 'S3',
    source: SRC.order0711,
    provenance: 'verified',
    optional: true,
    order: 6,
    time: '14:50',
    segments: [{ text: "'가하다.'고 전교를 내렸다." }],
  },
  {
    id: 'L4',
    label: 'L4',
    source: SRC.order0711,
    provenance: 'verified',
    order: 7,
    time: '15:00',
    segments: [
      { text: '', slot: { kind: 'who', accepts: '이극돈', display: '극돈' } },
      { text: ' 등이 ' },
      { text: '', slot: { kind: 'whose', accepts: '김일손', display: '일손' } },
      { text: '의 사초에서 ' },
      { text: '', slot: { kind: 'count', accepts: '6', display: '6' } },
      { text: '조목을 절취하여 봉해 올리니,' },
    ],
  },
];

export const REQUIRED_SENTENCES = ['L1', 'L2', 'L3', 'L4'];

export const PIECES: RecordPiece[] = [
  { id: 'pc_L1', label: '문 앞에서 읽은 임금의 첫 명령', from: ['l_order1'], sentenceId: 'L1', provenance: 'verified', time: '14:00' },
  { id: 'pc_L2', label: '「예로부터 사초는 임금이 스스로 보지 않습니다」', from: ['l_remon1'], sentenceId: 'L2', provenance: 'verified', time: '14:05' },
  { id: 'pc_L3', label: '「임금이 만약 사초를 보면 … 직필이 없기 때문입니다」', from: ['l_remon2'], sentenceId: 'L3', provenance: 'verified', time: '14:05' },
  { id: 'pc_S1', label: '문 앞에서 다시 읽은 임금의 명령', from: ['l_order2'], sentenceId: 'S1', provenance: 'verified', time: '14:20' },
  { id: 'pc_S2', label: '살펴볼 곳만 잘라 올리겠다는 청', from: ['l_propose'], sentenceId: 'S2', provenance: 'verified', time: '14:40' },
  { id: 'pc_S3', label: '책상 앞에서 읽은 「가하다」(그리하라)', from: ['l_order3'], sentenceId: 'S3', provenance: 'verified', time: '14:50' },
  {
    id: 'pc_L4',
    label: '종이 조각을 잘라 봉해 올림',
    from: ['d_slips_six', 'd_sealed', 'd_bundle_leaves', 'd_slips_five'],
    sentenceId: 'L4',
    provenance: 'verified',
    time: '15:00',
  },
  // 증인만 본 것(재구성) — 써도 기록이 되지 않는다(회색 잉크)
  { id: 'w_long_page', label: '붉은 관복이 한 장을 오래 들고 있었다', from: ['d_long_page', 'l_e1_2b'], witnessOnly: true, provenance: 'reconstructed', time: '11:40' },
  { id: 'w_upper', label: '윗자리 대감도 지난해 벼슬 정하는 자리에 사관이 꼭 끼어야 하느냐 했다더라', from: ['l_e1_3'], witnessOnly: true, provenance: 'reconstructed', time: '13:20' },
  { id: 'w_funeral', label: '국장 도감 일보다 길다', from: ['l_e3_1'], witnessOnly: true, provenance: 'reconstructed', time: '13:40' },
  { id: 'w_corner', label: '구석의 대감은 임금의 첫 명령을 또렷이 듣지 못했다', from: ['d_far_reading'], witnessOnly: true, provenance: 'reconstructed', time: '14:00' },
  { id: 'w_jouije', label: '조의제문이라 했다', from: ['l_e3_5'], witnessOnly: true, provenance: 'reconstructed', time: '15:40' },
  { id: 'w_six_only', label: '여섯 조목만 올리라 했다더라', from: ['l_e4_5a'], witnessOnly: true, provenance: 'reconstructed', time: '16:10', contestedBy: 'X1' },
  { id: 'w_alive', label: '사초를 쓴 사관은 아직 살아 있었다', from: ['l_e4_5b'], witnessOnly: true, provenance: 'reconstructed', time: '16:10' },
];

/** kja_10407011_001 국역 전문(HISTORICAL_SOURCES §11.1 그대로). */
export const ARTICLE_0711_KO =
  '전교하기를, "김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라." 하매, 실록청 당상(實錄廳堂上) 이극돈(李克墩)·유순(柳洵)·윤효손(尹孝孫)·안침(安琛)이 아뢰기를, "예로부터 사초(史草)는 임금이 스스로 보지 않습니다. 임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다." 하니, 전교하기를, "즉시 빠짐 없이 대내로 들이라." 하였다. 극돈 등이 다시 아뢰기를, "여러 사관(史官)들이 드린 사초를 신 등이 보지 않는 것이 없고, 일손(馹孫)의 초한 것 역시 모두 알고 있사옵니다. 신 등이 나이가 이미 늙었으므로 벼슬한 이후의 조종조(祖宗朝) 일은 알지 못하는 것이 없습니다. 일손의 사초가 과연 조종조의 일에 범하여 그른 점이 있다는 것은 신들도 들어 아는 바이므로, 신들이 망령되게 여겨 감히 《실록》에 싣지 않았는데, 지금 들이라고 명령하시니 신 등은 무슨 일을 상고하려는 것인지 알지 못하겠습니다. 그러나 옛부터 임금은 스스로 사초를 보지 못하지만, 일이 만일 종묘 사직에 관계가 있으면 상고하지 않을 수 없사오니, 신 등이 그 상고할 만한 곳을 절취하여 올리겠습니다. 그러면 일을 고열(考閱)할 수 있고 또한 임금은 사초를 보지 않는다는 의(義)에도 합당합니다." 하니, \'가하다.\'고 전교를 내렸다. 극돈 등이 일손의 사초에서 6조목을 절취하여 봉해 올리니, 전교하기를, "그 종실(宗室) 등에 관해서 쓴 것도 또한 들이라." 하였다.';

/** 국역과 원문이 어긋나는 문장(§11.1) — verified 대사·복원 줄에 쓰지 않는다. 복원 전문에서는 접는다. */
export const MISTRANSLATED_0711 = '일손의 사초가 과연 조종조의 일에 범하여 그른 점이 있다는 것은 신들도 들어 아는 바이므로,';

export const ARTICLE: RestoredArticle = {
  id: 'art_0711',
  source: SRC.order0711,
  citation: '『연산군일기』 30권, 연산 4년 7월 11일',
  fullText: ARTICLE_0711_KO,
  parts: [
    { sentenceId: 'L1', text: '전교하기를, "김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라." 하매,' },
    { header: true, text: '실록청 당상(實錄廳堂上) 이극돈(李克墩)·유순(柳洵)·윤효손(尹孝孫)·안침(安琛)이 아뢰기를,' },
    { sentenceId: 'L2', text: '"예로부터 사초(史草)는 임금이 스스로 보지 않습니다.' },
    { sentenceId: 'L3', text: '임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다." 하니,' },
    { sentenceId: 'S1', text: '전교하기를, "즉시 빠짐 없이 대내로 들이라." 하였다.' },
    {
      sentenceId: 'S2',
      text: '극돈 등이 다시 아뢰기를, "여러 사관(史官)들이 드린 사초를 신 등이 보지 않는 것이 없고, 일손(馹孫)의 초한 것 역시 모두 알고 있사옵니다. 신 등이 나이가 이미 늙었으므로 벼슬한 이후의 조종조(祖宗朝) 일은 알지 못하는 것이 없습니다.',
    },
    {
      sentenceId: 'S2',
      text: MISTRANSLATED_0711,
      folded: {
        reason: 'mistranslation',
        original: '馹孫史草, 果有犯於祖宗朝事, 而有非臣等所聞者也',
        note: "국역과 원문이 어긋나는 곳 — '신 등이 듣지 못한 것도 있다'에 가깝다",
      },
    },
    {
      sentenceId: 'S2',
      text: '신들이 망령되게 여겨 감히 《실록》에 싣지 않았는데, 지금 들이라고 명령하시니 신 등은 무슨 일을 상고하려는 것인지 알지 못하겠습니다. 그러나 옛부터 임금은 스스로 사초를 보지 못하지만, 일이 만일 종묘 사직에 관계가 있으면 상고하지 않을 수 없사오니, 신 등이 그 상고할 만한 곳을 절취하여 올리겠습니다. 그러면 일을 고열(考閱)할 수 있고 또한 임금은 사초를 보지 않는다는 의(義)에도 합당합니다." 하니,',
    },
    { sentenceId: 'S3', text: "'가하다.'고 전교를 내렸다." },
    { sentenceId: 'L4', text: '극돈 등이 일손의 사초에서 6조목을 절취하여 봉해 올리니,' },
    { text: '전교하기를, "그 종실(宗室) 등에 관해서 쓴 것도 또한 들이라." 하였다.' },
  ],
};
