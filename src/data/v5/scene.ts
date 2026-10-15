/**
 * 에피소드 1 그날: 사람(figure)·화자 단위·들은 말·본 것·컷 20장·눈·닫히는 눈(DESIGN_V5 §4.1~§4.4, §4.7, §13).
 *
 * 표기(§4.4): ◆ verified 대사(국역 그대로) · ◇ reconstructed 대사 · ▢ 본 것.
 *  - 시각·자리·말한 방식(낭독·대면 간언)은 모두 재구성이다. 기사(kja_10407011_001)에는 장소·시각·전달 방식이 없다.
 *  - 귓속말·소문은 모두 가상의 서리(fig_clerk) 입으로만(실존 인물의 입에 뒷말을 넣지 않는다).
 *  - 검증 대사의 화자는 실록이 적은 단위(SpeakerGroup)로만. 홍귀달·어세겸은 아뢰는 포즈로 그리지 않는다.
 *  - 국역 「일손의 사초가 과연 … 들어 아는 바이므로」(오역)는 어디에도 verified 로 쓰지 않는다.
 * 그림(렌더 명세)은 src/data/cuts/** 가 같은 컷 id 로 정의한다(src/data/v5/ids.ts CUT_IDS).
 */
import type { CutRef, Detail, Eye, EyeClosure, Figure, Line, SpeakerGroup } from '@/core/types';
import { SRC } from './sources';

const R = 'reconstructed' as const;
const V = 'verified' as const;

export const FIGURES: Figure[] = [
  { id: 'fig_yun', truePersonId: 'yun_hyoson', provenance: V, label: '초록 관복', visibleTraits: ['초록 관복'] },
  { id: 'fig_yi', truePersonId: 'yi_geukdon', provenance: V, label: '붉은 관복', visibleTraits: ['붉은 관복'] },
  { id: 'fig_eo', truePersonId: 'eo_segyeom', provenance: R, label: '윗자리 관원', visibleTraits: ['붉은 관복(진한 톤)', '병풍 앞'] },
  { id: 'fig_hong', truePersonId: 'hong_gwidal', provenance: R, label: '남색 관복', visibleTraits: ['남색 관복'] },
  {
    id: 'fig_u',
    provenance: V,
    label: '?',
    visibleTraits: ['푸른 관복'],
    revealOnRestore: { personIds: ['yu_sun', 'an_chim'], pairLabel: '유순·안침', source: SRC.order0711 },
  },
  {
    id: 'fig_a',
    provenance: V,
    label: '?',
    visibleTraits: ['푸른 관복'],
    revealOnRestore: { personIds: ['yu_sun', 'an_chim'], pairLabel: '유순·안침', source: SRC.order0711 },
  },
  { id: 'fig_msg', anonymous: true, provenance: R, label: '전교를 가져온 사람', visibleTraits: ['접은 종이'] },
  { id: 'fig_clerk', anonymous: true, provenance: 'fictional', label: '서리', visibleTraits: ['서리 차림'] },
];

/** 실록이 적은 화자 단위(kja_10407011_001 원문 「實錄廳堂上李克墩、柳洵、尹孝孫、安琛啓」 / 「克墩等更啓」) */
export const GROUPS: SpeakerGroup[] = [
  {
    id: 'g_dangsang',
    label: '당상(이극돈 등)',
    restoredLabel: '실록청 당상(이극돈 등)',
    members: ['yi_geukdon', 'yu_sun', 'yun_hyoson', 'an_chim'],
    source: SRC.order0711,
  },
  {
    id: 'g_geukdon_etc',
    label: '극돈 등',
    restoredLabel: '극돈 등',
    members: ['yi_geukdon', 'yu_sun', 'yun_hyoson', 'an_chim'],
    source: SRC.order0711,
  },
];

const G = {
  sacho: { term: '사초', gloss: '사관이 적은 기록 초고' },
  daenae: { term: '대내', gloss: '궁궐 안' },
  jikpil: { term: '직필', gloss: '있는 그대로 곧게 씀' },
  dangsang: { term: '당상', gloss: '높은 관리' },
  sanggo: { term: '상고', gloss: '살펴 따짐' },
  jeolchwi: { term: '절취', gloss: '잘라 냄' },
};

export const LINES: Line[] = [
  // ── E1 ──
  {
    id: 'l_e1_1',
    text: '오늘 들어온 꾸러미입니다.',
    provenance: R,
    speaker: { figureId: 'fig_clerk' },
    origin: ['CLK_0910'],
    volume: 'talk',
  },
  {
    id: 'l_e1_2a',
    text: '저 대감께선 선왕 승하하실 무렵 이조 판서셨지요.',
    provenance: R,
    speaker: { figureId: 'fig_clerk' },
    origin: ['CLK_1140'],
    volume: 'whisper',
    refers: { figureId: 'fig_yi' },
    keys: ['ijo_panseo_1494'],
    terms: ['이조 판서'],
  },
  {
    id: 'l_e1_2b',
    text: '한 장을 참 오래도 보십니다.',
    provenance: R,
    speaker: { figureId: 'fig_clerk' },
    origin: ['CLK_1140'],
    volume: 'whisper',
    refers: { figureId: 'fig_yi' },
  },
  {
    id: 'l_e1_3',
    text: '윗자리 대감께서도 지난해, 벼슬 정하는 자리에 사관이 꼭 끼어야 하느냐 하셨다지요.',
    provenance: R,
    speaker: { figureId: 'fig_clerk' },
    origin: ['CLK_1320'],
    volume: 'whisper',
    refers: { posId: 'O', time: '13:20' },
    keys: ['opposed_historian_attend_1497'],
    terms: ['사관'],
  },
  {
    id: 'l_order1',
    text: '김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라.',
    provenance: V,
    sources: [SRC.order0711],
    speaker: { figureId: 'fig_msg' },
    origin: ['B'],
    volume: 'read',
    terms: ['김일손', '사초', '대내'],
    glosses: [G.sacho, G.daenae],
  },
  // ── E2 ──
  {
    id: 'l_e2_1',
    text: '윤 대감, 교정 끝난 권은 이쪽에 두리까?',
    provenance: R,
    speaker: { figureId: 'fig_clerk' },
    origin: ['CLK_1145'],
    volume: 'talk',
    refers: { figureId: 'fig_yun' },
    keys: ['surname_yun', 'sillokcheong_staff'],
    terms: ['윤'],
  },
  {
    id: 'l_remon1',
    text: '예로부터 사초(史草)는 임금이 스스로 보지 않습니다.',
    provenance: V,
    sources: [SRC.order0711],
    speaker: { groupId: 'g_dangsang', figureIds: ['fig_yi', 'fig_yun', 'fig_u', 'fig_a'] },
    origin: ['Y', 'W', 'U', 'A'],
    volume: 'talk',
    terms: ['사초', '당상'],
    glosses: [G.dangsang],
  },
  {
    id: 'l_remon2',
    text: '임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다.',
    provenance: V,
    sources: [SRC.order0711],
    speaker: { groupId: 'g_dangsang', figureIds: ['fig_yi', 'fig_yun', 'fig_u', 'fig_a'] },
    origin: ['Y', 'W', 'U', 'A'],
    volume: 'talk',
    terms: ['직필'],
    glosses: [G.jikpil],
  },
  {
    id: 'l_propose',
    text: '…일이 만일 종묘 사직에 관계가 있으면 상고하지 않을 수 없사오니, 신 등이 그 상고할 만한 곳을 절취하여 올리겠습니다.',
    provenance: V,
    sources: [SRC.order0711],
    speaker: { groupId: 'g_geukdon_etc', figureIds: ['fig_yi'] },
    origin: ['Y'],
    volume: 'talk',
    terms: ['상고', '절취'],
    glosses: [G.sanggo, G.jeolchwi],
  },
  // ── E3 ──
  {
    id: 'l_e3_1',
    text: '선왕 국장 도감 일을 볼 때보다, 이 실록 일이 더 길구려.',
    provenance: R,
    speaker: { figureId: 'fig_hong' },
    origin: ['HONG_EDGE'],
    volume: 'talk',
    refers: { figureId: 'fig_hong' },
    keys: ['state_funeral_commissioner_1494', 'sillokcheong_staff'],
    terms: ['국장 도감'],
  },
  {
    id: 'l_order2',
    text: '즉시 빠짐 없이 대내로 들이라.',
    provenance: V,
    sources: [SRC.order0711],
    speaker: { figureId: 'fig_msg' },
    origin: ['B'],
    volume: 'read',
    terms: ['대내'],
  },
  {
    id: 'l_e3_5',
    text: '대감, 문제가 된 글이… 돌아가신 점필재 선생의 「조의제문」이라 합니다.',
    provenance: R,
    speaker: { figureId: 'fig_clerk' },
    origin: ['CLK_1540'],
    volume: 'talk',
    terms: ['점필재', '조의제문'],
  },
  // ── E4 ──
  {
    id: 'l_order3',
    text: '가하다.',
    provenance: V,
    sources: [SRC.order0711],
    speaker: { figureId: 'fig_msg' },
    origin: ['M2'],
    volume: 'read',
  },
  {
    id: 'l_e4_5a',
    text: '여섯 조목만 올리라 하셨답디다.',
    provenance: R,
    speaker: { figureId: 'fig_clerk' },
    origin: ['CLK_1610'],
    volume: 'whisper',
    hearsay: true,
  },
  {
    id: 'l_e4_5b',
    text: '사초를 쓴 사관은 아직 살아 있답니다. 곧 불려 가겠지요.',
    provenance: R,
    speaker: { figureId: 'fig_clerk' },
    origin: ['CLK_1610'],
    volume: 'whisper',
  },
];

export const DETAILS: Detail[] = [
  { id: 'd_bundles', label: '꾸러미마다 이름표가 붙어 있다. 멀어서 읽히지 않는다.', provenance: R, targetPosId: 'SP', size: 'action' },
  { id: 'd_long_page', label: '붉은 관복이 한 장을 오래 들고 있다.', provenance: R, targetPosId: 'Y', size: 'action' },
  { id: 'd_slips_five', label: '사초 더미 너머, 종이 조각 다섯 장.', provenance: R, targetPosId: 'SP', size: 'small', occludedView: true },
  { id: 'd_slips_six', label: '손 앞에 종이 조각 여섯 장.', provenance: R, targetPosId: 'SP', size: 'small' },
  { id: 'd_nametag', label: '꾸러미 이름표: 김일손(金馹孫).', provenance: R, targetPosId: 'SP', size: 'small', terms: ['김일손', '金馹孫'] },
  { id: 'd_sealed', label: '접어 봉한 꾸러미.', provenance: R, targetPosId: 'SP', size: 'small' },
  { id: 'd_upper_silent', label: '윗자리에서는 아무 말도 나오지 않는다.', provenance: R, targetPosId: 'O', size: 'action' },
  { id: 'd_corner_book', label: '교정 중인 책. 창빛.', provenance: R, targetPosId: 'H', size: 'action' },
  { id: 'd_far_reading', label: '멀리 문 앞에서 무언가를 읽는다. 또렷이 들리지 않는다.', provenance: R, targetPosId: 'B', size: 'action' },
  { id: 'd_desk_far', label: '서안 위의 손과 종이. 멀어서 셀 수 없다.', provenance: R, targetPosId: 'SP', size: 'action' },
  { id: 'd_bundle_leaves', label: '봉한 꾸러미가 문을 나간다.', provenance: R, targetPosId: 'DOOR', size: 'action' },
];

const fig = (figureId: string, seatId: string, pose: CutRef['figures'][number]['pose'], traits: string[]) => ({
  figureId,
  seatId,
  pose,
  visibleTraits: traits,
});
const RED = ['붉은 관복'];
const GREEN = ['초록 관복'];
const NAVY = ['남색 관복'];
const BLUE = ['푸른 관복'];
const CLERK = ['서리 차림'];
const MSG = ['접은 종이'];
const UPPER = ['붉은 관복(진한 톤)', '병풍 앞'];

export const CUTS: CutRef[] = [
  // ── E1 첫 번째 기억(윤효손, 주어짐) — 앞쪽 덮개: 초록 소매. 주인의 이름·성을 부르는 말이 없다(검증기 ⑨)
  {
    id: 'e1-1', eyeId: 'E1', n: 1, time: '09:10', viewpoint: { dirDeg: 180 }, provenance: R,
    figures: [fig('fig_yi', 'Y', 'read_paper', RED), fig('fig_clerk', 'CLK_0910', 'stand', CLERK)],
    heard: [{ lineId: 'l_e1_1', clarity: 'clear' }],
    details: ['d_bundles'],
    alt: '서안 너머 붉은 관복의 관원이 종이를 읽는다. 곁에서 서리가 꾸러미를 내려놓는다.',
  },
  {
    id: 'e1-2', eyeId: 'E1', n: 2, time: '11:40', viewpoint: { dirDeg: 180 }, provenance: R,
    figures: [fig('fig_yi', 'Y', 'hold_page', RED)],
    heard: [{ lineId: 'l_e1_2a', clarity: 'clear' }, { lineId: 'l_e1_2b', clarity: 'clear' }],
    details: ['d_long_page'],
    alt: '서안 너머 붉은 관복의 관원이 종이 한 장을 들고 있다. 뒤에서 귓속말이 들린다.',
  },
  {
    id: 'e1-3', eyeId: 'E1', n: 3, time: '13:20', viewpoint: { dirDeg: 180 }, provenance: R,
    figures: [],
    heard: [{ lineId: 'l_e1_3', clarity: 'clear' }],
    details: [],
    alt: '자기 손과 교정 중인 종이만 보인다. 어깨 뒤에서 귓속말이 들린다.',
  },
  {
    id: 'e1-4', eyeId: 'E1', n: 4, time: '14:00', viewpoint: { dirDeg: 122 }, provenance: R,
    figures: [fig('fig_msg', 'B', 'stand_read', MSG)],
    heard: [{ lineId: 'l_order1', clarity: 'clear' }],
    details: [],
    alt: '문 앞에 선 사람이 접은 종이를 펴 소리 내어 읽는다.',
  },
  {
    id: 'e1-5', eyeId: 'E1', n: 5, time: '15:00', viewpoint: { dirDeg: 180 }, provenance: R,
    figures: [fig('fig_yi', 'Y', 'cut_slips', RED)],
    heard: [],
    details: ['d_slips_five'],
    alt: '붉은 관복의 손이 종이 조각을 가려 접는다. 사초 더미가 앞을 가린다.',
  },
  // ── E2 (이극돈) — 앞쪽 덮개: 붉은 소매
  {
    id: 'e2-1', eyeId: 'E2', n: 1, time: '11:45', viewpoint: { dirDeg: 0 }, provenance: R,
    figures: [fig('fig_yun', 'W', 'sit', GREEN), fig('fig_clerk', 'CLK_1145', 'stand', CLERK)],
    heard: [{ lineId: 'l_e2_1', clarity: 'clear' }],
    details: [],
    alt: '서안 너머 초록 관복의 관원. 서리가 그에게 말을 건다.',
  },
  {
    id: 'e2-2', eyeId: 'E2', n: 2, time: '13:20', viewpoint: { dirDeg: 330 }, provenance: R,
    figures: [fig('fig_eo', 'O', 'sit', UPPER), fig('fig_clerk', 'CLK_1320', 'whisper', CLERK), fig('fig_yun', 'W', 'sit', GREEN)],
    heard: [],
    details: [],
    alt: '병풍 앞 윗자리에 늙은 관원이 앉아 있다. 서리가 초록 관복 쪽으로 몸을 숙인다.',
  },
  {
    id: 'e2-3', eyeId: 'E2', n: 3, time: '14:05', viewpoint: { dirDeg: 0 }, provenance: R,
    figures: [fig('fig_yun', 'W', 'remonstrate', GREEN), fig('fig_a', 'A', 'remonstrate', BLUE), fig('fig_eo', 'O', 'sit_silent', UPPER)],
    heard: [{ lineId: 'l_remon1', clarity: 'clear' }, { lineId: 'l_remon2', clarity: 'clear' }],
    details: [],
    alt: '맞은편 초록 관복과 그 옆 관원이 문 쪽을 향해 아뢴다. 윗자리 관원은 말이 없다.',
  },
  {
    id: 'e2-4', eyeId: 'E2', n: 4, time: '14:40', viewpoint: { dirDeg: 63 }, provenance: R,
    figures: [fig('fig_msg', 'B', 'stand', MSG)],
    heard: [{ lineId: 'l_propose', clarity: 'clear' }],
    details: [],
    alt: '문 앞의 사람이 듣고 서 있다. 내 목소리가 청한다.',
  },
  {
    id: 'e2-5', eyeId: 'E2', n: 5, time: '15:00', viewpoint: { dirDeg: 0 }, provenance: R,
    figures: [fig('fig_msg', 'M2', 'reach', MSG)],
    heard: [],
    details: ['d_slips_six', 'd_nametag', 'd_sealed'],
    alt: '손 앞에 종이 조각과 이름표 붙은 꾸러미. 위쪽에서 받으려는 손.',
  },
  // ── E3 (어세겸) — 앞쪽 덮개: 붉은 소매(진한 톤). 06:00 에 닫힌다. 아뢰는 모습 없음
  {
    id: 'e3-1', eyeId: 'E3', n: 1, time: '13:40', viewpoint: { dirDeg: 55 }, provenance: R,
    figures: [fig('fig_hong', 'HONG_EDGE', 'carry_books', NAVY)],
    heard: [{ lineId: 'l_e3_1', clarity: 'clear' }],
    details: [],
    alt: '서안 모서리에 책을 내려놓는 남색 관복의 관원.',
  },
  {
    id: 'e3-2', eyeId: 'E3', n: 2, time: '14:00', viewpoint: { dirDeg: 90 }, provenance: R,
    figures: [fig('fig_msg', 'B', 'stand_read', MSG)],
    heard: [{ lineId: 'l_order1', clarity: 'clear' }],
    details: [],
    alt: '멀리 문 앞에 선 사람이 종이를 소리 내어 읽는다.',
  },
  {
    id: 'e3-3', eyeId: 'E3', n: 3, time: '14:05', viewpoint: { dirDeg: 90 }, provenance: R,
    figures: [fig('fig_u', 'U', 'remonstrate', BLUE), fig('fig_a', 'A', 'remonstrate', BLUE)],
    heard: [{ lineId: 'l_remon1', clarity: 'clear' }, { lineId: 'l_remon2', clarity: 'clear' }],
    details: ['d_upper_silent'],
    alt: '서안 너머 아래 양옆의 두 관원이 문 쪽으로 아뢴다. 말소리는 서안 양 끝에서도 난다.',
  },
  {
    id: 'e3-4', eyeId: 'E3', n: 4, time: '14:20', viewpoint: { dirDeg: 90 }, provenance: R,
    figures: [fig('fig_msg', 'B', 'stand_read', MSG)],
    heard: [{ lineId: 'l_order2', clarity: 'clear' }],
    details: [],
    alt: '문 앞의 사람이 다시 읽는다. 그리고 긴 침묵.',
  },
  {
    id: 'e3-5', eyeId: 'E3', n: 5, time: '15:40', viewpoint: { dirDeg: 0 }, provenance: R,
    figures: [fig('fig_clerk', 'CLK_1540', 'stand', CLERK), fig('fig_hong', 'H', 'sit', NAVY)],
    heard: [{ lineId: 'l_e3_5', clarity: 'clear' }],
    details: [],
    alt: '구석 책상 옆에서 서리가 남색 관복의 관원에게 말한다.',
  },
  // ── E4 (홍귀달) — 앞쪽 덮개: 남색 소매. 구석 책상 — 첫 전교를 또렷이 못 들은 증인(X1). 아뢰는 모습 없음
  {
    id: 'e4-1', eyeId: 'E4', n: 1, time: '13:50', viewpoint: { dirDeg: 135 }, provenance: R,
    figures: [],
    heard: [],
    details: ['d_corner_book'],
    alt: '구석 책상 위에 교정 중인 책. 창으로 빛이 든다.',
  },
  {
    id: 'e4-2', eyeId: 'E4', n: 2, time: '14:00', viewpoint: { dirDeg: 124 }, provenance: R,
    figures: [fig('fig_msg', 'B', 'stand_read', MSG)],
    heard: [{ lineId: 'l_order1', clarity: 'garbled', garbledText: '…사초를 …… 들여……' }],
    details: ['d_far_reading'],
    alt: '멀리 문 앞에 작게 보이는 사람이 무언가를 읽는다. 말이 또렷하지 않다.',
  },
  {
    id: 'e4-3', eyeId: 'E4', n: 3, time: '14:50', viewpoint: { dirDeg: 141 }, provenance: R,
    figures: [fig('fig_msg', 'M2', 'stand_read', MSG), fig('fig_yi', 'Y', 'sit', RED)],
    heard: [{ lineId: 'l_order3', clarity: 'clear' }],
    details: ['d_desk_far'],
    alt: '문 앞의 사람이 서안 앞까지 들어와 짧게 읽는다. 서안 위의 손과 종이는 멀다.',
  },
  {
    id: 'e4-4', eyeId: 'E4', n: 4, time: '15:20', viewpoint: { dirDeg: 124 }, provenance: R,
    figures: [fig('fig_msg', 'DOOR', 'leave_bundle', MSG)],
    heard: [],
    details: ['d_bundle_leaves'],
    alt: '봉한 꾸러미를 든 사람이 문을 나간다.',
  },
  {
    id: 'e4-5', eyeId: 'E4', n: 5, time: '16:10', viewpoint: { dirDeg: 135 }, provenance: R,
    figures: [fig('fig_clerk', 'CLK_1610', 'whisper', CLERK)],
    heard: [{ lineId: 'l_e4_5a', clarity: 'clear' }, { lineId: 'l_e4_5b', clarity: 'clear' }],
    details: [],
    alt: '가까이 다가온 서리가 귓속말을 한다.',
  },
];

const DAY = { source: SRC.proclaim0727 };

export const EYES: Eye[] = [
  {
    id: 'E1',
    personId: 'yun_hyoson',
    figureId: 'fig_yun',
    seatId: 'W',
    foreground: 'sleeve_green',
    anchor: { room: [SRC.r18, SRC.yunTestimony0712], day: { ...DAY, inWorld: '파직 1498년 · 사유: 기록 없음' } },
    cuts: ['e1-1', 'e1-2', 'e1-3', 'e1-4', 'e1-5'],
    openWhen: { kind: 'given', ownerHidden: true },
    order: 1,
  },
  {
    id: 'E2',
    personId: 'yi_geukdon',
    figureId: 'fig_yi',
    seatId: 'Y',
    foreground: 'sleeve_red',
    anchor: { room: [SRC.compileOrder, SRC.r18], day: { ...DAY, inWorld: '파직 1498년 · 사유: 기록 없음' } },
    cuts: ['e2-1', 'e2-2', 'e2-3', 'e2-4', 'e2-5'],
    openWhen: { kind: 'tag', figureId: 'fig_yi' },
    order: 2,
  },
  {
    id: 'E3',
    personId: 'eo_segyeom',
    figureId: 'fig_eo',
    seatId: 'O',
    foreground: 'sleeve_red_dark',
    anchor: { room: [SRC.compileOrder, SRC.r18], day: { ...DAY, inWorld: '파직 1498년 · 사유: 기록 없음' } },
    cuts: ['e3-1', 'e3-2', 'e3-3', 'e3-4', 'e3-5'],
    openWhen: { kind: 'tag', figureId: 'fig_eo' },
    closeAt: 'clo_c2217_dawn',
    order: 3,
  },
  {
    id: 'E4',
    personId: 'hong_gwidal',
    figureId: 'fig_hong',
    seatId: 'H',
    foreground: 'sleeve_navy',
    anchor: { room: [SRC.r18], day: { ...DAY, inWorld: '좌천 1498년 · 사유: 기록 없음' } },
    cuts: ['e4-1', 'e4-2', 'e4-3', 'e4-4', 'e4-5'],
    openWhen: { kind: 'tag', figureId: 'fig_hong' },
    order: 4,
  },
  {
    id: 'E5',
    personId: 'kim_ilson',
    anchor: null,
    cuts: [],
    openWhen: { kind: 'never', reason: '그날을 가리키는 그의 기록이 남아 있지 않다' },
    order: 5,
  },
];

export const CLOSURES: EyeClosure[] = [
  {
    id: 'clo_c2217_dawn',
    eyeId: 'E3',
    trigger: { eyeOpen: 'E4', anyOf: [{ cutViewed: 'e4-5' }, { secondsAfterEyeOpen: 120 }] },
    effect: { erase: { cardId: 'eo_segyeom', alteredId: 'alt_eo' }, clock: '06:00' },
    systemLine: '관측기 06:00 · 이 지점을 가리키는 기록 1건 사라짐 · 관측 1개 끊김',
  },
];
