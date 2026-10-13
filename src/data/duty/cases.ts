/**
 * v4 「근무」의 건(case)과 그 관측 장면(짧은 디오라마). 설계: docs/DESIGN_V4.md §4 사례표, 근거: docs/HISTORICAL_SOURCES.md §10.
 *
 * 규칙(검증기·테스트가 강제):
 *  - 기록 카드의 원문 조각을 이으면 HISTORICAL_SOURCES 에 적힌 국역(또는 §10 기록 카드 문장) 그대로다(verified, url 출처).
 *  - 변조는 한 조각 하나뿐(fictional, '변조' 표식). 사료로 거짓이 확인되는 낱말만 쓴다(§10 변조안).
 *  - 카드 머리·관측 장면에 4자리 연도를 쓰지 않는다(실록식 날짜만).
 *  - 관측 대사는 reconstructed(근거 출처), 실록 국역을 그대로 옮긴 대사만 verified.
 *  - 정답은 데이터(변조·짝)로 계산된다(core/duty.ts). expected 는 검증기가 맞춰 본다.
 *  - 경고장 사유(explain)는 그 건의 교육적 이유만. #C-2217 의 정답(연도·사건·인물 동정)을 담지 않는다.
 *
 * 관측 장면의 무대(sceneId)는 아트의 디오라마(src/game/scenes/maps: sc_daejojeon · sc_court_decree · sc_council ·
 * sc_print_storage)와 obs001. 말하는 인물(NPC)은 디오라마 장식과 겹치지 않는 빈 칸에 선다(content.test).
 */
import { REF } from '@/data/historical/refs';
import { GLOSS } from '@/data/glossary';
import type { CaseDef, CaseSegment, DialogueLine, Gloss, NpcDef, ObservationTimeline, SourceRef } from '@/core/types';

const V = 'verified' as const;
const R = 'reconstructed' as const;
const F = 'fictional' as const;

type Part = string | [id: string, text: string, gloss?: Gloss];
/** 조각 목록: 문자열은 짚을 일 없는 이음 조각(자동 id), 튜플은 짚을 수 있는 낱말. */
function segs(prefix: string, parts: Part[]): CaseSegment[] {
  let n = 0;
  return parts.map((p) =>
    typeof p === 'string' ? { id: `${prefix}_x${n++}`, text: p } : { id: `${prefix}_${p[0]}`, text: p[1], ...(p[2] ? { gloss: p[2] } : {}) },
  );
}
const joined = (xs: CaseSegment[]) => xs.map((x) => x.text).join('');

interface SpeakerSpec {
  id: string;
  label: string;
  spriteKey: string;
  x: number;
  y: number;
  sources?: SourceRef[];
  action?: string;
  lines: (Omit<DialogueLine, 'provenance'> & { provenance?: DialogueLine['provenance'] })[];
}

/** 짧은 관측 장면: 타임라인 + 말하는 인물(이 장면 전용). 핫스팟은 이 인물들뿐이다. */
function vignette(v: {
  id: string;
  sceneId: string;
  code: string;
  start: number;
  end: number;
  camera: { x: number; y: number };
  speakers: SpeakerSpec[];
  glitches?: ObservationTimeline['glitches'];
}): { timeline: ObservationTimeline; npcs: NpcDef[] } {
  const npcs: NpcDef[] = v.speakers.map((s) => ({
    id: s.id,
    provenance: R,
    sources: s.sources,
    sceneId: v.sceneId,
    spriteKey: s.spriteKey,
    label: s.label,
    schedule: [{ time: v.start, x: s.x, y: s.y, action: s.action ?? 'stand' }],
    dialogue: s.lines.map((l) => ({ provenance: R, ...l, sources: l.sources ?? s.sources })),
  }));
  return {
    npcs,
    timeline: {
      id: v.id,
      provenance: F,
      sceneId: v.sceneId,
      title: `관측 — ${v.code}`,
      start: v.start,
      end: v.end,
      initial: v.start,
      camera: v.camera,
      meta: [
        { label: '건', value: v.code },
        { label: '장소', value: '미확인' },
      ],
      hotspots: npcs.map((n) => ({ id: `hs_${n.id}`, targetId: n.id, kind: 'npc' as const })),
      glitches: v.glitches ?? [{ from: v.start, to: v.start + 2, intensity: 0.4 }],
    },
  };
}

/** 관측 대상(대사)의 조각. 이으면 대사 본문 그대로여야 한다(검증기). */
const lineObs = (id: string, lineId: string, s: CaseSegment[]) => ({ id, kind: 'line' as const, lineId, segments: s });

// ════════════════════════════════════════════════════════════════
// 근무 1 — 승인 시안(docs/NARRATIVE_SHIFT1.md) + §10.1 재검증 정정
// ════════════════════════════════════════════════════════════════

// #A-0412 확인 — 『성종실록』 성종 25년 12월 24일, kia_12512024_004
const a0412Rec = segs('a0412', [['osi', '오시(午時)', GLOSS.osi], '에 ', ['king', '임금'], '이 ', ['place', '대조전(大造殿)'], '에서 ', ['died', '훙(薨)하였다', GLOSS.hung], '.']);
const a0412Line = segs('a0412o', ['…', ['place', '대조전'], '에서… ', ['king', '상께서'], ' ', ['died', '승하하셨소'], '.']);
const a0412 = vignette({
  id: 'tl_a0412',
  sceneId: 'sc_daejojeon',
  code: '#A-0412',
  start: 700,
  end: 740,
  camera: { x: 7, y: 5 },
  speakers: [
    {
      id: 'v_a0412_naegwan',
      label: '내관',
      spriteKey: 'char_naegwan',
      x: 7,
      y: 7,
      sources: [REF.sillokSeongjongDeath, REF.sillokSeongjongIll],
      lines: [{ id: 'a0412_l1', speaker: '내관', text: joined(a0412Line), at: [{ from: 700, to: 741 }] }],
    },
  ],
});

// #A-0419 정정 — 『연산군일기』 연산 1년 4월 19일, kja_10104019_002. 변조: 이극돈 → 유자광(명단 7인에 없음)
const a0419Rec = segs('a0419', [
  '왕이 ',
  ['eo', '어세겸(魚世謙)'],
  '·',
  ['yi', '이극돈(李克墩)'],
  ' 등에게 명하여 ',
  ['what', '(대행왕의 《실록》을)', GLOSS.daehaengwang],
  ' 편찬하게 하였다.',
]);
const a0419Line = segs('a0419o', ['…', ['eo', '어세겸'], '과 ', ['yi', '이극돈'], '은 ', ['what', '대행왕의 실록'], '을 편찬하라.']);
const a0419 = vignette({
  id: 'tl_a0419',
  sceneId: 'sc_court_decree',
  code: '#A-0419',
  start: 600,
  end: 640,
  camera: { x: 9, y: 6 },
  speakers: [
    {
      id: 'v_a0419_reader',
      label: '명을 읽는 관원',
      spriteKey: 'npc_official_green',
      x: 9,
      y: 5,
      sources: [REF.sillokCompileOrder],
      lines: [{ id: 'a0419_l1', speaker: '명을 읽는 관원', text: joined(a0419Line), at: [{ from: 600, to: 641 }] }],
    },
  ],
});

// #A-0423 함정(정답 확인) — 『연산군일기』 연산 1년 1월 14일, kja_10101014_001
const a0423Rec = segs('a0423', [['myoho', '묘호(廟號)', GLOSS.myoho], '는 ', ['seong', '성(成)'], '이라 하였다.']);
const a0423Line = segs('a0423o', ['대행왕의 ', ['myoho', '묘호'], '는 ', ['seong', '성종'], '으로 정하였소.']);
const a0423 = vignette({
  id: 'tl_a0423',
  sceneId: 'sc_council',
  code: '#A-0423',
  start: 600,
  end: 640,
  camera: { x: 7, y: 5 },
  speakers: [
    {
      id: 'v_a0423_official',
      label: '붉은 관복',
      spriteKey: 'npc_official_red',
      x: 8,
      y: 6,
      sources: [REF.sillokMyoho, REF.myoho],
      lines: [{ id: 'a0423_l1', speaker: '붉은 관복', text: joined(a0423Line), at: [{ from: 600, to: 641 }] }],
    },
  ],
});

// #A-0431 정정 — 『연산군일기』 연산 5년 3월 10일, kja_10503010_002. 변조: 3월 → 9월(2~3월과 겹치지 않는 달)
const a0431Date = segs('a0431d', [['month', '3월'], ['day', ' 10일']]);
const a0431Rec = segs('a0431', [
  ['book', '《성종실록(成宗實錄)》'],
  '이 ',
  ['done', '완성'],
  '되매, ',
  ['who', '수찬 당상·낭청'],
  '에게 차등을 두어 물품을 ',
  ['gift', '사급(賜給)', GLOSS.sageup],
  '하였다.',
]);
const a0431Line = segs('a0431o', [['month', '삼월'], ' ', ['day', '초열흘'], '. ', ['book', '실록'], '이 ', ['done', '이루어졌으니'], ', ', ['who', '수찬한 이들'], '에게 상을 내리신다.']);
const a0431 = vignette({
  id: 'tl_a0431',
  sceneId: 'sc_print_storage',
  code: '#A-0431',
  start: 600,
  end: 640,
  camera: { x: 7, y: 5 },
  speakers: [
    {
      id: 'v_a0431_official',
      label: '푸른 관복',
      spriteKey: 'npc_official_blue',
      x: 7,
      y: 6,
      sources: [REF.sillokCompleted, REF.sillokEnshrined],
      lines: [{ id: 'a0431_l1', speaker: '푸른 관복', text: joined(a0431Line), at: [{ from: 600, to: 641 }] }],
    },
  ],
});

// ════════════════════════════════════════════════════════════════
// 근무 2 — 규정 4조(정정에는 근거 프레임): 다른 말은 장면의 한 순간에만 들린다 → 시간 막대 + 셔터
// ════════════════════════════════════════════════════════════════

// #A-0501 정정 — 연산 1년 3월 19일, kja_10103019_001. 변조: 사관 → 내관
const a0501Rec = segs('a0501', [
  '대교 권달수·검열 강징이 "명을 내릴 때에는 반드시 ',
  ['seungji', '승지'],
  '와 ',
  ['sagwan', '사관', GLOSS.sagwan],
  '으로 하여금 참석하여 듣게 하는 것"이라 아뢰었다.',
]);
const a0501Line = segs('a0501o', ['무릇 명을 내릴 때에는 반드시 ', ['seungji', '승지'], '와 ', ['sagwan', '사관'], '으로 하여금 참석하여 듣게 하는 것인데,']);
const a0501 = vignette({
  id: 'tl_a0501',
  sceneId: 'sc_council',
  code: '#A-0501',
  start: 840,
  end: 880,
  camera: { x: 7, y: 5 },
  speakers: [
    {
      id: 'v_a0501_sagwan',
      label: '젊은 관원',
      spriteKey: 'npc_historian',
      x: 6,
      y: 6,
      sources: [REF.sillokSagwanAttend, REF.sagwan],
      lines: [
        { id: 'a0501_l0', text: '(붓을 든 채 무언가를 망설인다.)', at: [{ from: 840, to: 858 }] },
        // 실록 국역 그대로(대교·검열이 아뢴 말) → verified
        { id: 'a0501_l1', speaker: '젊은 관원', text: joined(a0501Line), provenance: V, sources: [REF.sillokSagwanAttend], at: [{ from: 858, to: 866 }] },
        { id: 'a0501_l2', text: '(말을 마치고 고개를 숙인다.)', at: [{ from: 866, to: 881 }] },
      ],
    },
  ],
});

// #A-0502 함정(정답 확인) — 연산 즉위년 12월 29일, kja_10012029_004. 노사신 ↔ '사신 대감'(실록의 이름 약칭)
const a0502Rec = segs('a0502', ['좌의정 ', ['name', '노사신'], '이 ', ['seal', '대보', GLOSS.daebo], '를 ', ['heir', '왕세자'], '에게 주었다.']);
const a0502Line = segs('a0502o', [['name', '사신(思愼) 대감'], '께서 ', ['seal', '대보'], '를 받들어 ', ['heir', '세자 저하'], '께 올리셨소.']);
const a0502 = vignette({
  id: 'tl_a0502',
  sceneId: 'sc_daejojeon',
  code: '#A-0502',
  start: 780,
  end: 820,
  camera: { x: 7, y: 5 },
  speakers: [
    {
      id: 'v_a0502_naegwan',
      label: '내관',
      spriteKey: 'char_naegwan',
      x: 7,
      y: 7,
      sources: [REF.sillokAccession],
      lines: [{ id: 'a0502_l1', speaker: '내관', text: joined(a0502Line), at: [{ from: 780, to: 821 }] }],
    },
  ],
});

// #A-0503 정정 — 연산 3년 12월 21일, kja_10312021_001(obs001: 같은 관청의 다른 날). 변조: 신승선·어세겸 → 노사신·어세겸
const a0503Rec = segs('a0503', ['실록청 ', ['role', '총재관'], ' ', ['heads', '신승선·어세겸'], '과 ', ['dang', '당상'], ' 이극돈 등에게 ', ['gift', '말과 표리', GLOSS.pyori], '를 하사하였다.']);
const a0503Line = segs('a0503o', [['role', '총재관'], ' ', ['heads', '신승선 대감, 어세겸 대감'], '께 ', ['gift', '안장 갖춘 말 한 필과 표리 한 벌'], '이오.']);
const a0503 = vignette({
  id: 'tl_a0503',
  sceneId: 'obs001',
  code: '#A-0503',
  start: 600,
  end: 660,
  camera: { x: 19, y: 11 },
  speakers: [
    {
      id: 'v_a0503_reader',
      label: '대문의 관원',
      spriteKey: 'npc_official_green',
      x: 20,
      y: 12,
      sources: [REF.sillokReward],
      lines: [
        { id: 'a0503_l0', text: '(하사품 목록을 펼친다.)', at: [{ from: 600, to: 628 }] },
        { id: 'a0503_l1', speaker: '대문의 관원', text: joined(a0503Line), at: [{ from: 628, to: 636 }] },
      ],
    },
    {
      id: 'v_a0503_red',
      label: '붉은 관복',
      spriteKey: 'npc_official_red',
      x: 19,
      y: 9,
      sources: [REF.sillokReward, REF.yiGeukdon],
      lines: [{ id: 'a0503_l2', text: '(붉은 관복의 노관이 고개를 숙여 표리를 받는다.)', at: [{ from: 636, to: 661 }] }],
    },
  ],
});

// #A-0504 확인 — 연산 즉위년 12월 26일, kja_10012026_003(빈전 도감 제조의 아룀)
const a0504Rec = segs('a0504', ['빈전 도감 제조 ', ['who', '이극돈'], '이 아뢰기를, "무릇 ', ['sangje', '상제(喪制)', GLOSS.sangje], '는 한결같이 ', ['yemun', '예문'], '을 따르는 것이온데']);
const a0504Line = segs('a0504o', ['무릇 ', ['sangje', '상제'], '는 한결같이 ', ['yemun', '예문'], '을 따르는 것이온데… 날의 길흉은 믿을 것이 못 되옵니다.']);
const a0504 = vignette({
  id: 'tl_a0504',
  sceneId: 'sc_council',
  code: '#A-0504',
  start: 660,
  end: 700,
  camera: { x: 7, y: 5 },
  speakers: [
    {
      id: 'v_a0504_red',
      label: '붉은 관복',
      spriteKey: 'npc_official_red',
      x: 8,
      y: 4,
      sources: [REF.sillokMourning],
      lines: [{ id: 'a0504_l1', speaker: '붉은 관복', text: joined(a0504Line), at: [{ from: 660, to: 701 }] }],
    },
  ],
});

// #A-0505 정정 — 연산 5년 3월 15일, kja_10503015_001. 변조: 홍귀달 → 이극돈
const a0505Rec = segs('a0505', ['참찬 ', ['hong', '홍귀달'], '·병조 참판 ', ['gwon', '권건'], '을 파견하여 《성종실록》을 ', ['where', '외방 사고', GLOSS.sago], '에 ', ['bongan', '봉안', GLOSS.bongan], '하게 하였다.']);
const a0505Line = segs('a0505o', [['hong', '홍 참찬 영감'], '과 ', ['gwon', '권 참판 영감'], '이 이 궤를 ', ['where', '외방 사고'], '로 ', ['bongan', '모시고'], ' 가신다오.']);
const a0505 = vignette({
  id: 'tl_a0505',
  sceneId: 'sc_print_storage',
  code: '#A-0505',
  start: 540,
  end: 580,
  camera: { x: 8, y: 6 },
  speakers: [
    {
      id: 'v_a0505_clerk',
      label: '서리',
      spriteKey: 'npc_clerk',
      x: 8,
      y: 7,
      action: 'carry',
      sources: [REF.sillokEnshrined],
      lines: [
        { id: 'a0505_l0', text: '(궤 뚜껑을 닫고 끈을 맨다.)', at: [{ from: 540, to: 556 }] },
        { id: 'a0505_l1', speaker: '서리', text: joined(a0505Line), at: [{ from: 556, to: 564 }] },
        { id: 'a0505_l2', text: '(다음 궤로 옮겨 간다.)', at: [{ from: 564, to: 581 }] },
      ],
    },
  ],
});

// ════════════════════════════════════════════════════════════════
// 근무 3 — 규정 5조(종결 건 재판정 금지): 새 종류 = 진짜 노이즈 좌표(자동 종결이 정답)
// ════════════════════════════════════════════════════════════════

// #A-0601 정정 — 연산 3년 8월 1일, kja_10308001_003. 변조: 참예하도록 하지 말라 → 참예하게 하라
const a0601Rec = segs('a0601', ['전교하기를, "', ['who', '사관'], '은 ', ['verb', '참예하도록 하지 말라', GLOSS.chamye], '." 하였다.']);
const a0601Line = segs('a0601o', [['who', '사관'], '은 ', ['verb', '참예하도록 하지 말라'], '.']);
const a0601 = vignette({
  id: 'tl_a0601',
  sceneId: 'sc_court_decree',
  code: '#A-0601',
  start: 720,
  end: 760,
  camera: { x: 9, y: 6 },
  speakers: [
    {
      id: 'v_a0601_reader',
      label: '명을 읽는 관원',
      spriteKey: 'npc_official_green',
      x: 9,
      y: 5,
      sources: [REF.sillokSagwanBarred],
      lines: [
        { id: 'a0601_l0', text: '(전교를 받든 관원이 계단 아래로 내려선다.)', at: [{ from: 720, to: 738 }] },
        { id: 'a0601_l1', speaker: '전교(傳敎)', text: joined(a0601Line), provenance: V, sources: [REF.sillokSagwanBarred], at: [{ from: 738, to: 746 }] },
        { id: 'a0601_l2', text: '(뜰에 선 관원들 사이로 짧은 침묵이 지나간다.)', at: [{ from: 746, to: 761 }] },
      ],
    },
  ],
});

// #A-0602 함정(정답 확인) — 연산 1년 5월 28일, kja_10105028_005. '26가지' ↔ '스물여섯 가지'
const a0602Rec = segs('a0602', [['post', '충청도 도사'], ' ', ['name', '김일손'], '이 "이익과 병폐 ', ['count', '26가지'], '를 삼가 조목으로" 상소하였다.']);
const a0602Line = segs('a0602o', [['post', '충청도 도사'], ' ', ['name', '김일손'], '의 상소이옵니다. 이익과 병폐 ', ['count', '스물여섯 가지'], '를 조목으로 아뢰었사옵니다.']);
const a0602 = vignette({
  id: 'tl_a0602',
  sceneId: 'sc_council',
  code: '#A-0602',
  start: 600,
  end: 640,
  camera: { x: 7, y: 5 },
  speakers: [
    {
      id: 'v_a0602_official',
      label: '푸른 관복',
      spriteKey: 'npc_official_blue',
      x: 8,
      y: 6,
      sources: [REF.sillokKimIlsonMemorial],
      lines: [{ id: 'a0602_l1', speaker: '푸른 관복', text: joined(a0602Line), at: [{ from: 600, to: 641 }] }],
    },
  ],
});

// 진짜 노이즈 좌표(가상): 아무 일도 없는 밤, 화면이 계속 지직인다. 말하는 사람 없음.
const noise4410 = vignette({
  id: 'tl_c4410',
  sceneId: 'sc_court_decree',
  code: '#C-4410',
  start: 1320,
  end: 1340,
  camera: { x: 9, y: 7 },
  speakers: [],
  glitches: [{ from: 1320, to: 1341, intensity: 0.75 }],
});
const noise0951 = vignette({
  id: 'tl_c0951',
  sceneId: 'sc_print_storage',
  code: '#C-0951',
  start: 120,
  end: 140,
  camera: { x: 7, y: 5 },
  speakers: [],
  glitches: [{ from: 120, to: 141, intensity: 0.8 }],
});
for (const n of [noise4410, noise0951]) n.timeline.meta = [{ label: '좌표', value: n.timeline.title.replace('관측 — ', '') }, { label: '일시', value: '####' }, { label: '장소', value: '미확인' }];

export const caseTimelines: ObservationTimeline[] = [a0412, a0419, a0423, a0431, a0501, a0502, a0503, a0504, a0505, a0601, a0602, noise4410, noise0951].map((v) => v.timeline);
export const caseNpcs: NpcDef[] = [a0412, a0419, a0423, a0431, a0501, a0502, a0503, a0504, a0505, a0601, a0602].flatMap((v) => v.npcs);

const RULE3 = '규정 3조 위반 — 규정 외 도장(불일치). 대조관의 도장은 확인·정정 둘뿐이다.';

/** 근무 1~3 의 건(순서는 shifts.ts 큐가 정한다) */
export const cases: CaseDef[] = [
  // ── 근무 1 ──
  {
    id: 'case_a0412',
    provenance: V,
    sources: [REF.sillokSeongjongDeath],
    code: '#A-0412',
    kind: 'routine',
    dutyId: 'duty_1',
    title: '기록 대조',
    record: { citation: '『성종실록』 성종 25년 12월 24일', segments: a0412Rec, sources: [REF.sillokSeongjongDeath] },
    timelineId: 'tl_a0412',
    observed: [lineObs('a0412_ob1', 'a0412_l1', a0412Line)],
    pairs: [
      { record: 'a0412_place', observed: 'a0412o_place' },
      { record: 'a0412_king', observed: 'a0412o_king', notation: true, note: '실록의 ‘임금’을 궁 안에서는 ‘상(上)’이라 불렀다.' },
      { record: 'a0412_died', observed: 'a0412o_died', notation: true, note: '‘훙(薨)’과 ‘승하’는 둘 다 임금이 세상을 떠났다는 말이다.' },
    ],
    expected: ['confirm'],
    explain: { correct: "'훙(薨)'과 '승하'는 둘 다 임금이 세상을 떠났다는 말이다. 글자가 아니라 뜻을 비교한다." },
    minutes: 40,
  },
  {
    id: 'case_a0419',
    provenance: V,
    sources: [REF.sillokCompileOrder],
    code: '#A-0419',
    kind: 'routine',
    dutyId: 'duty_1',
    title: '기록 대조',
    record: {
      citation: '『연산군일기』 연산 1년 4월 19일',
      segments: a0419Rec,
      distortion: { segmentId: 'a0419_yi', text: '유자광(柳子光)' },
      sources: [REF.sillokCompileOrder],
    },
    timelineId: 'tl_a0419',
    observed: [lineObs('a0419_ob1', 'a0419_l1', a0419Line)],
    pairs: [
      { record: 'a0419_eo', observed: 'a0419o_eo' },
      { record: 'a0419_yi', observed: 'a0419o_yi' },
      { record: 'a0419_what', observed: 'a0419o_what' },
    ],
    expected: ['correct'],
    explain: { confirm: "관측된 명에는 '유자광'이 없었다. 실록이 적은 편찬의 명은 어세겸·이극돈 등 일곱 사람에게 내려졌다." },
    minutes: 40,
  },
  {
    id: 'case_a0423',
    provenance: V,
    sources: [REF.sillokMyoho],
    code: '#A-0423',
    kind: 'routine',
    dutyId: 'duty_1',
    title: '기록 대조',
    record: { citation: '『연산군일기』 연산 1년 1월 14일', segments: a0423Rec, sources: [REF.sillokMyoho, REF.myoho] },
    timelineId: 'tl_a0423',
    observed: [lineObs('a0423_ob1', 'a0423_l1', a0423Line)],
    pairs: [
      { record: 'a0423_myoho', observed: 'a0423o_myoho' },
      { record: 'a0423_seong', observed: 'a0423o_seong', notation: true, note: '실록은 묘호를 ‘성(成)’이라 적고, 같은 기사에서 ‘성종(成宗)’이라고도 부른다.' },
    ],
    expected: ['confirm'],
    explain: {
      correct: "묘호 '성(成)'에 '종(宗)'을 붙여 부르는 이름이 '성종'이다. 같은 실록 기사도 '성종(成宗)'이라 쓴다. 같은 내용 — 글자가 아니라 뜻을 비교한다.",
    },
    minutes: 40,
  },
  {
    id: 'case_a0431',
    provenance: V,
    sources: [REF.sillokCompleted],
    code: '#A-0431',
    kind: 'routine',
    dutyId: 'duty_1',
    title: '기록 대조',
    record: {
      citation: '『연산군일기』 연산 5년',
      date: a0431Date,
      segments: a0431Rec,
      distortion: { segmentId: 'a0431d_month', text: '9월' },
      sources: [REF.sillokCompleted],
    },
    timelineId: 'tl_a0431',
    observed: [lineObs('a0431_ob1', 'a0431_l1', a0431Line)],
    pairs: [
      { record: 'a0431d_month', observed: 'a0431o_month', notation: true },
      { record: 'a0431d_day', observed: 'a0431o_day', notation: true, note: '초열흘은 열흘(10일)이다.' },
      { record: 'a0431_book', observed: 'a0431o_book', notation: true },
      { record: 'a0431_done', observed: 'a0431o_done', notation: true },
      { record: 'a0431_who', observed: 'a0431o_who', notation: true },
    ],
    expected: ['correct'],
    explain: { confirm: '관측한 날은 삼월이었다. 실록은 『성종실록』이 완성되어 상을 내린 날을 3월 10일로 적는다.' },
    minutes: 40,
  },
  {
    id: 'case_c2217',
    provenance: F,
    code: '#C-2217',
    kind: 'lost',
    dutyId: 'duty_1',
    title: '좌표 손상 건',
    assignmentId: 'as_c2217',
    detection: '좌표 #C-2217 · 일시 #### · 이 지점을 가리키는 기록 3건에서 자동 탐지',
    recommend: '실록 기록: 없음 · 시스템 권장: 대조할 기록 없음 → 장비 오류로 자동 종결',
    timelineId: 'tl_obs001',
    observed: [],
    pairs: [],
    // 승인 시안: 서랍의 불일치(규정 위반 경고) 또는 자동 종결 — 어느 쪽이든 같은 길로 간다(실패 없음)
    expected: ['mismatch', 'auto_close'],
    explain: { mismatch: RULE3 },
    readyWhen: { any: [{ heard: ['m2'] }, { reached: { timelineId: 'tl_obs001', minute: 1020 } }] },
    notReadyText: '하루 전체 관측 건이다. 시간 막대를 끝까지 밀어 보자.',
    minutes: 90,
    replay: {
      minutes: 60,
      windows: [
        { id: 'rw_08', label: '08:00–11:00', from: 480, to: 660 },
        { id: 'rw_11', label: '11:00–14:00', from: 660, to: 840 },
        { id: 'rw_14', label: '14:00–17:00', from: 840, to: 1020 },
        { id: 'rw_17', label: '17:00–19:00', from: 1020, to: 1140 },
      ],
    },
  },

  // ── 근무 2 ──
  {
    id: 'case_a0501',
    provenance: V,
    sources: [REF.sillokSagwanAttend],
    code: '#A-0501',
    kind: 'routine',
    dutyId: 'duty_2',
    title: '기록 대조',
    record: { citation: '『연산군일기』 연산 1년 3월 19일', segments: a0501Rec, distortion: { segmentId: 'a0501_sagwan', text: '내관' }, sources: [REF.sillokSagwanAttend] },
    timelineId: 'tl_a0501',
    observed: [lineObs('a0501_ob1', 'a0501_l1', a0501Line)],
    pairs: [
      { record: 'a0501_seungji', observed: 'a0501o_seungji' },
      { record: 'a0501_sagwan', observed: 'a0501o_sagwan' },
    ],
    expected: ['correct'],
    explain: { confirm: "들은 말은 '승지와 사관'이었다. 명을 내릴 때 승지와 함께 사관이 들어야 기록이 남는다 — 그것이 대교·검열이 아뢴 뜻이다." },
    minutes: 65,
  },
  {
    id: 'case_a0502',
    provenance: V,
    sources: [REF.sillokAccession],
    code: '#A-0502',
    kind: 'routine',
    dutyId: 'duty_2',
    title: '기록 대조',
    record: { citation: '『연산군일기』 연산 즉위년 12월 29일', segments: a0502Rec, sources: [REF.sillokAccession] },
    timelineId: 'tl_a0502',
    observed: [lineObs('a0502_ob1', 'a0502_l1', a0502Line)],
    pairs: [
      { record: 'a0502_name', observed: 'a0502o_name', notation: true, note: '실록은 사람을 이름만 줄여 부르기도 한다 — 같은 기사에 “사신이 대보를 왕세자에게 주니”.' },
      { record: 'a0502_seal', observed: 'a0502o_seal' },
      { record: 'a0502_heir', observed: 'a0502o_heir', notation: true },
    ],
    expected: ['confirm'],
    explain: {
      correct: "실록은 사람을 이름만 줄여 부르기도 한다. 같은 기사에도 '사신이 대보를 왕세자에게 주니'라고 적었다. 노사신과 '사신 대감'은 같은 사람이다.",
    },
    minutes: 65,
  },
  {
    id: 'case_a0503',
    provenance: V,
    sources: [REF.sillokReward],
    code: '#A-0503',
    kind: 'routine',
    dutyId: 'duty_2',
    title: '기록 대조',
    record: { citation: '『연산군일기』 연산 3년 12월 21일', segments: a0503Rec, distortion: { segmentId: 'a0503_heads', text: '노사신·어세겸' }, sources: [REF.sillokReward] },
    timelineId: 'tl_a0503',
    observed: [lineObs('a0503_ob1', 'a0503_l1', a0503Line)],
    pairs: [
      { record: 'a0503_role', observed: 'a0503o_role' },
      { record: 'a0503_heads', observed: 'a0503o_heads', notation: true },
      { record: 'a0503_gift', observed: 'a0503o_gift', notation: true },
    ],
    expected: ['correct'],
    explain: { confirm: '들은 명단의 총재관은 신승선·어세겸이었다. 실록도 그 둘을 총재관으로, 이극돈 등을 당상으로 적는다.' },
    minutes: 65,
  },
  {
    id: 'case_a0504',
    provenance: V,
    sources: [REF.sillokMourning],
    code: '#A-0504',
    kind: 'routine',
    dutyId: 'duty_2',
    title: '기록 대조',
    record: { citation: '『연산군일기』 연산 즉위년 12월 26일', segments: a0504Rec, trailingEllipsis: true, sources: [REF.sillokMourning] },
    timelineId: 'tl_a0504',
    observed: [lineObs('a0504_ob1', 'a0504_l1', a0504Line)],
    pairs: [
      { record: 'a0504_sangje', observed: 'a0504o_sangje' },
      { record: 'a0504_yemun', observed: 'a0504o_yemun' },
    ],
    expected: ['confirm'],
    minutes: 65,
  },
  {
    id: 'case_a0505',
    provenance: V,
    sources: [REF.sillokEnshrined],
    code: '#A-0505',
    kind: 'routine',
    dutyId: 'duty_2',
    title: '기록 대조',
    record: { citation: '『연산군일기』 연산 5년 3월 15일', segments: a0505Rec, distortion: { segmentId: 'a0505_hong', text: '이극돈' }, sources: [REF.sillokEnshrined] },
    timelineId: 'tl_a0505',
    observed: [lineObs('a0505_ob1', 'a0505_l1', a0505Line)],
    pairs: [
      { record: 'a0505_hong', observed: 'a0505o_hong', notation: true },
      { record: 'a0505_gwon', observed: 'a0505o_gwon', notation: true },
      { record: 'a0505_where', observed: 'a0505o_where' },
      { record: 'a0505_bongan', observed: 'a0505o_bongan', notation: true, note: '‘봉안’은 받들어 모셔 둔다는 말이다.' },
    ],
    expected: ['correct'],
    explain: { confirm: "들은 말은 '홍 참찬'이었다. 실록은 참찬 홍귀달·병조 참판 권건을 보내 실록을 외방 사고에 봉안했다고 적는다." },
    minutes: 65,
  },

  // ── 근무 3 ──
  {
    id: 'case_c4410',
    provenance: F,
    code: '#C-4410',
    kind: 'noise',
    dutyId: 'duty_3',
    title: '좌표 손상 건',
    detection: '좌표 #C-4410 · 일시 #### · 이 지점을 가리키는 기록 1건에서 자동 탐지',
    recommend: '실록 기록: 없음 · 시스템 권장: 대조할 기록 없음 → 장비 오류로 자동 종결',
    timelineId: 'tl_c4410',
    observed: [],
    pairs: [],
    expected: ['auto_close'],
    explain: { mismatch: `${RULE3} 이 좌표에서는 아무 일도 관측되지 않았다. 기록 1건만 가리키는 좌표는 대개 장비 노이즈다.` },
    readyWhen: { reached: { timelineId: 'tl_c4410', minute: 1335 } },
    notReadyText: '좌표 손상 건은 끝까지 보고 판단한다. 시간 막대를 밀어 보자.',
    minutes: 25,
  },
  {
    id: 'case_a0601',
    provenance: V,
    sources: [REF.sillokSagwanBarred],
    code: '#A-0601',
    kind: 'routine',
    dutyId: 'duty_3',
    title: '기록 대조',
    record: {
      citation: '『연산군일기』 연산 3년 8월 1일',
      segments: a0601Rec,
      distortion: { segmentId: 'a0601_verb', text: '참예하게 하라' },
      sources: [REF.sillokSagwanBarred],
    },
    timelineId: 'tl_a0601',
    observed: [lineObs('a0601_ob1', 'a0601_l1', a0601Line)],
    pairs: [
      { record: 'a0601_who', observed: 'a0601o_who' },
      { record: 'a0601_verb', observed: 'a0601o_verb' },
    ],
    expected: ['correct'],
    explain: { confirm: "들은 전교는 '참예하도록 하지 말라'였다. 사관이 그 자리에 함께하는 것을 왕이 허락하지 않았다." },
    minutes: 55,
  },
  {
    id: 'case_c0951',
    provenance: F,
    code: '#C-0951',
    kind: 'noise',
    dutyId: 'duty_3',
    title: '좌표 손상 건',
    detection: '좌표 #C-0951 · 일시 #### · 이 지점을 가리키는 기록 1건에서 자동 탐지',
    recommend: '실록 기록: 없음 · 시스템 권장: 대조할 기록 없음 → 장비 오류로 자동 종결',
    timelineId: 'tl_c0951',
    observed: [],
    pairs: [],
    expected: ['auto_close'],
    explain: { mismatch: `${RULE3} 빈 곳간과 지직임뿐이었다. 기록 1건만 가리키는 좌표는 대개 장비 노이즈다.` },
    readyWhen: { reached: { timelineId: 'tl_c0951', minute: 135 } },
    notReadyText: '좌표 손상 건은 끝까지 보고 판단한다. 시간 막대를 밀어 보자.',
    minutes: 25,
  },
  {
    id: 'case_a0602',
    provenance: V,
    sources: [REF.sillokKimIlsonMemorial],
    code: '#A-0602',
    kind: 'routine',
    dutyId: 'duty_3',
    title: '기록 대조',
    record: { citation: '『연산군일기』 연산 1년 5월 28일', segments: a0602Rec, sources: [REF.sillokKimIlsonMemorial] },
    timelineId: 'tl_a0602',
    observed: [lineObs('a0602_ob1', 'a0602_l1', a0602Line)],
    pairs: [
      { record: 'a0602_post', observed: 'a0602o_post' },
      { record: 'a0602_name', observed: 'a0602o_name' },
      { record: 'a0602_count', observed: 'a0602o_count', notation: true, note: '26가지와 스물여섯 가지는 같은 수다.' },
    ],
    expected: ['confirm'],
    explain: { correct: "'26가지'와 '스물여섯 가지'는 같은 수다. 표기가 달라도 뜻이 같으면 확인이다." },
    minutes: 55,
  },
  {
    id: 'case_c2217_re',
    provenance: F,
    code: '#C-2217',
    kind: 'lost',
    dutyId: 'duty_3',
    title: '좌표 손상 건(재탐지)',
    assignmentId: 'as_c2217',
    detection: '좌표 #C-2217 · 일시 #### · 이 지점을 가리키는 기록 2건에서 자동 탐지(재탐지)',
    recommend: '시스템 권장: 규정 5조 — 자동 종결 건 재판정 금지 → 자동 종결',
    observed: [],
    pairs: [],
    // 규정을 따르는 자동 종결도, 위원회 직송 보고서도 허용(실패 없음). 근무 3 은 보고서가 들어가야 끝난다.
    expected: ['report', 'auto_close'],
    explain: { mismatch: RULE3 },
    minutes: 30,
  },
];
