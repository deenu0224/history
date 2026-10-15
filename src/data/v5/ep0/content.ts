/**
 * 에피소드 0 「하룻밤」 콘텐츠(DESIGN_V5 §14, 추리 규칙 docs/DEDUCTION_RULES.md 기준 사례).
 *
 * 소실 전제(fictional): 「누가 훈민정음을 만들었는가」의 기록이 지워졌다. 두 기사에서 '누가' 칸이 깎였다 —
 *   kda_12512030_002 「이달에 임금이 친히 언문 28자를 지었는데」(是月 기사 — 하루를 가리키지 않아 관측기가 갈 수 없다)
 *   kda_12602020_001 「임금이 소(疏)를 보고, 만리 등에게 이르기를」(날짜가 있는 기사 — 관측기가 간다)
 * 세상(동료 포함)은 「한글을 누가 만들었는지는 기록이 없다」를 당연하게 여긴다(규칙 ④: 사람의 기억도 같이 지워진다).
 * 관측기(규칙 ①)는 문장의 '주어 칸 손상'을 잡아낸다 — 07 이 이상하다고 느끼는 것은 기억이 아니라 관측기의 탐지 때문이다.
 *
 * 추리 사슬(정답은 판정 데이터에만):
 *   T0a(쉬움) e0-1 두루마리 첫머리 「부제학 최만리(副提學 崔萬理)」(본 것) ↔ 최만리 카드 「부제학 최만리」 → 최만리.
 *        정창손(응교)·김문(직전)은 카드의 직위가 달라 틀린다.
 *   카드 얻기 최만리 카드 「1419년(세종 1) … 급제」의 「세종」 링크 → 세종 카드 +1(찾기가 아니다).
 *   T0b(한 단계 더) e0-1 상소 첫 줄 「언문을 제작하신 것이…」(들은 말, 최만리 등이 높은 자리의 사람에게) ↔ 세종 카드
 *        (파생 키: 최만리가 섬긴 임금 = 세종) → 높은 자리의 사람 = 세종.
 *   다시 쓰기 한 줄, 칸 하나: 「【임금】이 소(疏)를 보고, 만리(萬理) 등에게 이르기를, "…만일 내가 그 운서를…"」 → 세종.
 *
 * provenance: ◆ verified 대사는 국역 그대로(화자는 실록이 적은 단위: 「최만리 등」·「임금」). 상소를 소리 내어 읽은 일,
 * 두루마리 첫머리에 직함·이름이 보이는 것, 자리·시각·어두운 얼굴·높은 자리는 reconstructed. 일곱 사람의 출석도 재구성(§13.4-3).
 */
import type {
  Claim,
  CutRef,
  DerivedKey,
  Detail,
  Eye,
  Figure,
  HomeCard,
  HomeRecordPart,
  LedgerEntry,
  Line,
  PersonCard,
  RecordCard,
  RecordPiece,
  RecordSentence,
  RestoredArticle,
  SpeakerGroup,
  TagRule,
} from '@/core/types';
import { ARTICLE_0220_KO, ARTICLE_0220_PARTS } from './article';
import { SRC0 } from './sources';
import { holeOf } from '@/core/reality';

/**
 * 소실의 크기(DESIGN_V5 §14.8): 「누가 한글을 만들었나」라는 사실 하나가 지워지자 그 사실에 닿은 단락이 통째로 무너졌다.
 * 남은 조각은 국역 그대로(검증기 ⑦ 이 대조), 구멍은 복원 뒤 돌아올 국역 글을 품는다. 관측 중엔 하나도 채워지지 않는다.
 */
export const HOLED_0220: HomeRecordPart[] = [
  { gap: '임금이', who: true },
  { text: ' 소(疏)를 보고, ' },
  { gap: '만리(萬理) 등에게 이르기를, "너희들이 이르기를, ‘음(音)을 사용하고 글자를 합한 것이 모두 옛 글에 위반된다.’ 하였는데,' },
  { text: ' 설총(薛聰)의 ' },
  {
    gap: '이두(吏讀)도 역시 음이 다르지 않으냐. 또 이두를 제작한 본뜻이 백성을 편리하게 하려 함이 아니하겠느냐. 만일 그것이 백성을 편리하게 한 것이라면 이제의 언문은 백성을 편리하게 하려 한 것이다. 너희들이 설총은 옳다 하면서 군상(君上)의 하는 일은 그르다 하는 것은 무엇이냐. 또 네가',
  },
  { text: ' 운서(韻書)를 아느냐. ' },
  { gap: '사성 칠음(四聲七音)에 자모(字母)가 몇이나 있느냐. 만일 내가 그 운서를 바로잡지 아니하면' },
  { text: ' 누가 이를 바로잡을 것이냐. …' },
];
export const HOLED_EONMUN28: HomeRecordPart[] = [
  { text: '이달에 ' },
  { gap: '임금이', who: true },
  { text: ' 친히 ' },
  { gap: '언문(諺文) 28자(字)를 지었는데,' },
  { text: ' 그 글자가 ' },
  { gap: '옛 전자(篆字)를 모방하고, 초성(初聲)·중성(中聲)·종성(終聲)으로 나누어 합한 연후에야 글자를 이루었다. … 이것을 훈민정음(訓民正音)이라고 일렀다.' },
];
const holedText = (ps: HomeRecordPart[]) => ps.map((p) => ('gap' in p ? holeOf(p) : p.text)).join('');


const V = 'verified' as const;
const R = 'reconstructed' as const;

// ── 인물 카드(verified 사실만. 세종 카드에는 훈민정음·한글 창제가 없다 — 그것이 지워진 사실이다) ──
export const CARDS0: PersonCard[] = [
  {
    id: 'choi_manri',
    name: '최만리',
    hanja: '崔萬理',
    lifespan: '미상 ~ 1445',
    provenance: V,
    roomAnchored: true,
    starter: true,
    searchTerms: ['최만리', '崔萬理', '만리'],
    eye: {},
    facts: [
      { id: 'f_choi_list', text: '그날 실록의 명단: 「부제학(副提學) 최만리(崔萬理)」', keys: ['bujehak_0220'], provenance: V, source: SRC0.art0220 },
      {
        id: 'f_choi_exam',
        text: '「1419년(세종 1) 증광문과에 을과로 급제하여 그 이듬해 집현전박사로 임명되었다.」',
        keys: ['served_under_sejong'],
        provenance: V,
        source: SRC0.choi,
        links: [{ term: '세종', cardId: 'sejong' }],
      },
      { id: 'f_choi_office', text: '「1438년 부제학, 1439년 강원도관찰사, 1440년 집현전부제학으로 복귀하였다.」', keys: ['bujehak_1440'], provenance: V, source: SRC0.choi },
      { id: 'f_choi_clan', text: '「본관은 해주(海州). 자는 자명(子明), 호는 강호산인(江湖散人).」', keys: ['clan_haeju'], provenance: V, source: SRC0.choi },
    ],
  },
  {
    id: 'jeong_changson',
    name: '정창손',
    hanja: '鄭昌孫',
    lifespan: '1402 ~ 1487',
    provenance: V,
    roomAnchored: true,
    starter: true,
    searchTerms: ['정창손', '鄭昌孫', '창손'],
    eye: {},
    facts: [
      { id: 'f_jeong_list', text: '그날 실록의 명단: 「응교(應敎) 정창손(鄭昌孫)」', keys: ['eunggyo_0220'], provenance: V, source: SRC0.art0220 },
      { id: 'f_jeong_clan', text: '「본관은 동래(東萊). 자는 효중(孝仲).」', keys: ['clan_dongnae'], provenance: V, source: SRC0.jeong },
      {
        id: 'f_jeong_sillok',
        text: '「1449년 부제학으로 춘추관편수관과 수사관(修史官)을 겸직하면서」 『세종실록』 등의 편찬에 참여',
        keys: ['bujehak_1449', 'compiled_sejong_sillok'],
        provenance: V,
        source: SRC0.jeong,
      },
    ],
  },
  {
    id: 'kim_mun',
    name: '김문',
    hanja: '金汶',
    lifespan: '미상 ~ 1448',
    provenance: V,
    roomAnchored: true,
    starter: true,
    searchTerms: ['김문', '金汶'],
    eye: {},
    facts: [
      { id: 'f_kmun_list', text: '그날 실록의 명단: 「직전(直殿) 김문(金汶)」', keys: ['jikjeon_0220'], provenance: V, source: SRC0.art0220 },
      { id: 'f_kmun_exam', text: '「1420년(세종 2) 식년 문과에 병과로 급제」', keys: ['exam_1420'], provenance: V, source: SRC0.kimMun },
      { id: 'f_kmun_clan', text: '「본관은 언양(彦陽). 자는 윤보(潤甫), 호는 서헌(西軒).」', keys: ['clan_eonyang'], provenance: V, source: SRC0.kimMun },
    ],
  },
  {
    id: 'ha_wiji',
    name: '하위지',
    hanja: '河緯地',
    lifespan: '1412 ~ 1456',
    provenance: V,
    roomAnchored: true,
    searchTerms: ['하위지', '河緯地', '河緯之'],
    eye: { eyeId: 'E0' },
    facts: [
      {
        id: 'f_ha_list',
        text: '그날 실록의 명단: 「부교리(副校理) 하위지(河緯之)」 — 국역 표기 河緯之, 원문은 河緯地',
        keys: ['bugyori_0220'],
        provenance: V,
        source: SRC0.art0220,
      },
      { id: 'f_ha_1444', text: '「1444년 집현전부교리가 되어 『오례의주(五禮儀註)』의 상정(詳定)에 참여하였다.」', keys: ['bugyori_1444'], provenance: V, source: SRC0.ha },
    ],
  },
  {
    id: 'sejong',
    name: '세종',
    hanja: '世宗',
    lifespan: '1397 ~ 1450',
    provenance: V,
    roomAnchored: true,
    searchTerms: ['세종', '世宗', '이도'],
    eye: {},
    facts: [
      { id: 'f_sj_def', text: '「조선의 제4대(재위: 1418년~1450년) 왕.」', keys: ['king_1418_1450'], provenance: V, source: SRC0.sejong },
      { id: 'f_sj_name', text: '「본관은 전주(全州). 이름은 이도(李祹), 자는 원정(元正).」', keys: ['clan_jeonju'], provenance: V, source: SRC0.sejong },
      { id: 'f_sj_accede', text: '「1418년 6월 왕세자에 책봉되었다가 같은 해 8월에 태종의 양위를 받아 즉위하였다.」', keys: ['acceded_1418'], provenance: V, source: SRC0.sejong },
      // 지워졌던 사실 — 복원 뒤에만
      { id: 'f_sj_eonmun', text: '「이달에 임금이 친히 언문(諺文) 28자(字)를 지었는데」', keys: ['made_eonmun'], provenance: V, source: SRC0.eonmun28, afterRestore: true },
    ],
  },
];

/** 파생 키: 최만리 카드의 「1419년(세종 1) … 급제」 → 세종 카드가 「최만리가 섬긴 임금」을 가진다(최만리 카드를 가지고 있을 때) */
export const DERIVED0: DerivedKey[] = [{ key: 'king_served_by_choi', to: 'sejong', via: { cardId: 'choi_manri', factId: 'f_choi_exam' } }];

const L = (key: string, source: LedgerEntry['source']): LedgerEntry => ({ key, source });
/** 원장(검증기 전용) — 그날 명단의 일곱 + 임금 */
export const LEDGER0: Record<string, LedgerEntry[]> = {
  sejong: [L('king_1418_1450', SRC0.sejong), L('king_served_by_choi', SRC0.choi), L('clan_jeonju', SRC0.sejong), L('acceded_1418', SRC0.sejong), L('made_eonmun', SRC0.eonmun28)],
  choi_manri: [L('bujehak_0220', SRC0.art0220), L('served_under_sejong', SRC0.choi), L('bujehak_1440', SRC0.choi), L('clan_haeju', SRC0.choi)],
  jeong_changson: [L('eunggyo_0220', SRC0.art0220), L('clan_dongnae', SRC0.jeong), L('bujehak_1449', SRC0.jeong), L('compiled_sejong_sillok', SRC0.jeong)],
  kim_mun: [L('jikjeon_0220', SRC0.art0220), L('exam_1420', SRC0.kimMun), L('clan_eonyang', SRC0.kimMun)],
  ha_wiji: [L('bugyori_0220', SRC0.art0220), L('bugyori_1444', SRC0.ha)],
  sin_seokjo: [L('jikjehak_0220', SRC0.art0220)],
  song_cheogeom: [L('busuchan_0220', SRC0.art0220)],
  jo_geun: [L('jeojakrang_0220', SRC0.art0220)],
};
export const LEDGER_NAMES0: Record<string, string> = {
  sejong: '세종',
  choi_manri: '최만리',
  jeong_changson: '정창손',
  kim_mun: '김문',
  ha_wiji: '하위지',
  sin_seokjo: '신석조',
  song_cheogeom: '송처검',
  jo_geun: '조근',
};
/** 그날 그 자리의 실명 인물(유일성 대상): 임금 + 의금부 명단의 일곱(출석은 재구성 — §13.4-3) */
export const ROOM_PERSONS0 = ['sejong', 'choi_manri', 'sin_seokjo', 'kim_mun', 'jeong_changson', 'ha_wiji', 'song_cheogeom', 'jo_geun'];
export const SURNAME_KEYS0: Record<string, string> = { 최: 'surname_choi', 정: 'surname_jeong', 김: 'surname_kim', 하: 'surname_ha' };

// ── 사람 ─────────────────────────────────────────────────────────
export const FIGURES0: Figure[] = [
  { id: 'fig_king', truePersonId: 'sejong', provenance: V, label: '높은 자리의 사람', visibleTraits: ['높은 자리', '어두운 얼굴'] },
  { id: 'fig_choi', truePersonId: 'choi_manri', provenance: V, label: '두루마리를 든 관원', visibleTraits: ['줄 맨 앞', '두루마리'] },
  { id: 'fig_jeong', truePersonId: 'jeong_changson', provenance: R, label: '관원', visibleTraits: ['줄'], inert: true },
  { id: 'fig_kim', truePersonId: 'kim_mun', provenance: R, label: '관원', visibleTraits: ['줄'], inert: true },
  { id: 'fig_row', anonymous: true, provenance: R, label: '줄지어 앉은 관원들', visibleTraits: ['줄'], inert: true },
];

/** 실록이 적은 화자 단위: 상소는 「최만리 등」, 말은 「임금」(kda_12602020_001) */
export const GROUPS0: SpeakerGroup[] = [
  {
    id: 'g_choi_etc',
    label: '두루마리를 든 관원 등',
    restoredLabel: '최만리 등',
    members: ['choi_manri', 'sin_seokjo', 'kim_mun', 'jeong_changson', 'ha_wiji', 'song_cheogeom', 'jo_geun'],
    source: SRC0.art0220,
  },
  { id: 'g_king', label: '높은 자리의 사람', restoredLabel: '임금', members: ['sejong'], source: SRC0.art0220 },
];

const KING = { groupId: 'g_king', figureIds: ['fig_king'] };

export const LINES0: Line[] = [
  {
    id: 'l_e0_memorial',
    text: '신 등이 엎디어 보옵건대, 언문(諺文)을 제작하신 것이 지극히 신묘하와 만물을 창조하시고 지혜를 운전하심이 천고에 뛰어나시오나,',
    provenance: V,
    sources: [SRC0.art0220],
    speaker: { groupId: 'g_choi_etc', figureIds: ['fig_choi'] },
    origin: ['C'],
    volume: 'read',
    // 상소는 높은 자리의 사람에게 올린 글이다 — 「제작하신」의 주어(언문은 그 사람의 일). 판정 사실은 없다:
    // 「누가 언문을 만들었나」는 지워진 사실이라 어느 카드에도 아직 없다 — 이 줄은 다시 쓰기의 결론으로 간다
    refers: { figureId: 'fig_king' },
    terms: ['언문'],
    glosses: [
      { term: '언문', gloss: '그 무렵 새 글자를 부르던 말' },
      { term: '신', gloss: '신하가 임금 앞에서 자기를 이르는 말' },
    ],
  },
  {
    id: 'l_e0_seolchong',
    text: '너희들이 이르기를, ‘음(音)을 사용하고 글자를 합한 것이 모두 옛 글에 위반된다.’ 하였는데, 설총(薛聰)의 이두(吏讀)도 역시 음이 다르지 않으냐.',
    provenance: V,
    sources: [SRC0.art0220],
    speaker: KING,
    origin: ['K'],
    volume: 'talk',
    terms: ['설총', '이두'],
    glosses: [
      { term: '설총', gloss: '신라의 학자' },
      { term: '이두', gloss: '한자를 빌려 우리말을 적던 방법' },
    ],
  },
  {
    id: 'l_e0_gunsang',
    text: '너희들이 설총은 옳다 하면서 군상(君上)의 하는 일은 그르다 하는 것은 무엇이냐.',
    provenance: V,
    sources: [SRC0.art0220],
    speaker: KING,
    origin: ['K'],
    volume: 'talk',
    // 높은 자리의 사람이 자기를 「군상(임금)」이라 부르고, 상소한 「너희들」(최만리 등)을 꾸짖는다 →
    // 그는 임금이고, 최만리 등이 섬긴 임금이다(최만리 카드의 「세종」 줄과 맞물린다)
    refers: { figureId: 'fig_king' },
    keys: ['is_king', 'king_served_by_choi'],
    glosses: [{ term: '군상', gloss: '임금', inline: true }],
  },
  {
    id: 'l_e0_unseo',
    text: '만일 내가 그 운서를 바로잡지 아니하면 누가 이를 바로잡을 것이냐.',
    provenance: V,
    sources: [SRC0.art0220],
    speaker: KING,
    origin: ['K'],
    volume: 'talk',
    terms: ['운서'],
    glosses: [{ term: '운서', gloss: '한자의 소리를 모아 정리한 책' }],
  },
];

export const DETAILS0: Detail[] = [
  {
    // 글자는 원문 「副提學崔萬理」(kda_12602020_001 명단). 두루마리 첫머리에 직함·이름이 보이는 연출은 재구성.
    id: 'd_scroll_head',
    label: '두루마리 첫머리: 부제학 최만리(副提學 崔萬理)',
    provenance: R,
    sources: [SRC0.art0220],
    targetPosId: 'C',
    size: 'small',
    refers: { figureId: 'fig_choi' },
    keys: ['bujehak_0220'],
    terms: ['부제학', '최만리'],
  },
  { id: 'd_e0_dais', label: '높은 자리의 사람. 얼굴은 어둡다.', provenance: R, targetPosId: 'K', size: 'action' },
];

const f = (figureId: string, seatId: string, pose: CutRef['figures'][number]['pose'], visibleTraits: string[]) => ({ figureId, seatId, pose, visibleTraits });
const KING_T = ['높은 자리', '어두운 얼굴'];
const CHOI_T = ['줄 맨 앞', '두루마리'];
const ROW_T = ['줄'];

export const CUTS0: CutRef[] = [
  {
    id: 'e0-1', eyeId: 'E0', n: 1, time: '10:00', viewpoint: { dirDeg: 216 }, provenance: R,
    figures: [
      f('fig_king', 'K', 'sit', KING_T),
      f('fig_choi', 'C', 'hold_page', CHOI_T),
      f('fig_jeong', 'J', 'sit', ROW_T),
      f('fig_row', 'ROW', 'sit', ROW_T),
      f('fig_kim', 'M', 'sit', ROW_T),
    ],
    heard: [{ lineId: 'l_e0_memorial', clarity: 'clear' }],
    details: ['d_scroll_head', 'd_e0_dais'],
    alt: '줄 맨 앞의 관원이 높은 자리 쪽을 향해 두루마리를 펴 읽는다. 멀리 높은 자리에 앉은 사람은 얼굴이 어둡다.',
  },
  {
    id: 'e0-2', eyeId: 'E0', n: 2, time: '10:10', viewpoint: { dirDeg: 222 }, provenance: R,
    figures: [f('fig_king', 'K', 'sit', KING_T), f('fig_choi', 'C', 'sit_silent', CHOI_T), f('fig_row', 'ROW', 'sit', ROW_T)],
    heard: [
      { lineId: 'l_e0_seolchong', clarity: 'clear' },
      { lineId: 'l_e0_gunsang', clarity: 'clear' },
    ],
    details: [],
    alt: '높은 자리에서 목소리가 내려온다. 맨 앞의 관원이 고개를 숙인다.',
  },
  {
    id: 'e0-3', eyeId: 'E0', n: 3, time: '10:15', viewpoint: { dirDeg: 232 }, provenance: R,
    figures: [f('fig_king', 'K', 'sit', KING_T)],
    heard: [{ lineId: 'l_e0_unseo', clarity: 'clear' }],
    details: [],
    alt: '높은 자리의 사람이 몸을 앞으로 기울인다.',
  },
];

export const EYES0: Eye[] = [
  {
    id: 'E0',
    personId: 'ha_wiji',
    seatId: 'HA',
    foreground: 'sleeve_blue',
    anchor: { room: [SRC0.ha], day: { source: SRC0.art0220, inWorld: '그날 명단에 이름이 남았다 — 부교리 하위지' } },
    cuts: ['e0-1', 'e0-2', 'e0-3'],
    openWhen: { kind: 'given', ownerHidden: false },
    order: 1,
  },
];

// ── 이름 붙이기 ──────────────────────────────────────────────────
export const TAGS0: TagRule[] = [
  {
    id: 'T0a',
    figureId: 'fig_choi',
    personId: 'choi_manri',
    acceptedEvidence: ['d_scroll_head'],
    uniquenessNote: '그날 명단(kda_12602020_001)의 부제학은 최만리 하나 — 「부제학(副提學) 최만리(崔萬理)」. 정창손은 응교, 김문은 직전.',
    decoys: [
      { personId: 'jeong_changson', event: 'ev0.decoy.rank' },
      { personId: 'kim_mun', event: 'ev0.decoy.rank' },
    ],
    okEvent: 'ev0.choi_named',
  },
  {
    id: 'T0b',
    figureId: 'fig_king',
    personId: 'sejong',
    acceptedEvidence: ['l_e0_gunsang'],
    uniquenessNote:
      '높은 자리의 사람이 자기를 군상(君上, 임금)이라 하며 상소한 「너희들」(최만리 등)을 꾸짖는다(kda_12602020_001) → 임금(is_king ← 세종 카드 「조선의 제4대 … 왕」), 최만리 등의 임금. 최만리는 1419년(세종 1) 급제 ~ 1445년(세종 27) 사망 — 그가 섬긴 임금은 세종 하나(E0057279). 파생 키 king_served_by_choi.',
    decoys: [
      { personId: 'choi_manri', event: 'ev0.decoy.choi' },
      { personId: 'jeong_changson', event: 'ev0.decoy.king' },
      { personId: 'kim_mun', event: 'ev0.decoy.king' },
    ],
    okEvent: 'ev0.king_named',
  },
];

/** 'who' 칸의 다른 값(들은 말에서 확인한 무리) — 고르면 그 줄은 기록이 되지 않는다 */
export const CLAIMS0: Claim[] = [{ id: 'c0_who_memorial', slot: 'who', value: '상소를 올린 사람들', label: '상소를 올린 사람들', from: ['l_e0_memorial'] }];

// ── 기록 다시 쓰기: 한 줄, 칸 하나 ─────────────────────────────────
export const SENTENCES0: RecordSentence[] = [
  {
    id: 'R0',
    label: 'R0',
    source: SRC0.art0220,
    provenance: V,
    order: 1,
    time: '10:15',
    preplaced: true,
    segments: [
      { text: '', slot: { kind: 'who', accepts: '세종', display: '임금' } },
      { text: '이 소(疏)를 보고, 만리(萬理) 등에게 이르기를, "…너희들이 설총은 옳다 하면서 군상(君上)의 하는 일은 그르다 하는 것은 무엇이냐. … 만일 내가 그 운서를 바로잡지 아니하면 누가 이를 바로잡을 것이냐. …"' },
    ],
  },
];

export const PIECES0: RecordPiece[] = [
  { id: 'pc_R0', label: '「만일 내가 그 운서를 바로잡지 아니하면…」', from: ['l_e0_unseo'], sentenceId: 'R0', provenance: V, time: '10:15' },
];

export const ARTICLE0: RestoredArticle = {
  id: 'art_0220',
  source: SRC0.art0220,
  citation: '『세종실록』 103권, 세종 26년 2월 20일',
  fullText: ARTICLE_0220_KO,
  parts: ARTICLE_0220_PARTS.map((text, i) => ({ text, ...(i === 1 ? { sentenceId: 'R0' } : {}), ...(i === 0 ? { long: true as const } : {}) })),
};

// ── 기록 카드(찾기는 Ep0 에서 쓰지 않는다 — 복원 때 「이웃 기록」으로만) ──
export const RECORDS0: RecordCard[] = [
  {
    id: 'rec0_eonmun28',
    title: '언문 28자',
    provenance: V,
    aside: 'before',
    tag: '세종 카드에 이 줄이 돌아왔다 — 언문 28자를 지은 임금',
    inWorld: [`「${holedText(HOLED_EONMUN28)}」`],
    lines: [
      {
        text: '「이달에 임금이 친히 언문(諺文) 28자(字)를 지었는데, 그 글자가 옛 전자(篆字)를 모방하고, 초성(初聲)·중성(中聲)·종성(終聲)으로 나누어 합한 연후에야 글자를 이루었다. … 이것을 훈민정음(訓民正音)이라고 일렀다.」',
        source: SRC0.eonmun28,
      },
    ],
  },
  {
    id: 'rec0_0220',
    title: '그날 실록',
    provenance: V,
    inWorld: [`「… 하니, ${holedText(HOLED_0220)}」`],
    lines: [{ text: '「임금이 소(疏)를 보고, 만리(萬理) 등에게 이르기를,」', source: SRC0.art0220 }],
  },
];

export const HOME0: HomeCard = {
  code: '#C-2209',
  // 손상된 문장 그대로(국역, 빈 칸만 비움) — Ep0 엔 찾기가 없으니 기록을 홈에서 본다
  record: {
    title: '그날 실록',
    lines: [
      { parts: HOLED_0220, source: SRC0.art0220 },
      { minor: true, note: '똑같이 무너진 옆 기록', parts: HOLED_EONMUN28, source: SRC0.eonmun28 },
    ],
  },
  date: { before: '####', after: '세종 26년 2월 20일' },
  place: { before: '미확인', after: '기록 없음(그림 속 방은 재구성)', source: SRC0.art0220, note: '그날 실록에는 장소가 없다' },
  task: '이 날의 기록이 구멍투성이다. 그 자리에 있던 사람의 눈으로 본다.',
  detection: '관측기가 찾음 · #C-2209 · 일시 #### · 문장 손상 2건',
  status: { before: '부분 손상', after: '복원됨' },
};

export const EPILOGUE0 = {
  monologue: [
    '한글을 지은 임금, 세종. 모두가 아는 이름이 단락째 무너져 있었다.',
    '나는 줄 끝에 앉은 사람의 눈을 빌려, 그 한 칸을 다시 적었다.',
    '이제 아무도 그 단락이 무너져 있었던 것을 기억하지 못한다.',
  ],
  teaserDocId: '',
  oldReportDocId: '',
  aboutScene: '말은 실록 그대로이고, 자리·몸짓·두루마리의 모습은 사료를 바탕으로 만든 재구성이다. 그날 실록에는 장소가 없다.',
  witnessLogLabel: '실록이 적지 않은 일',
};

export const CLOCKS0 = { start: '22:31', S4: '22:52', S5: '23:04' };
