/**
 * 관측 #C-2217 의 인물. 장면은 실록청에 왕의 사초 반입 전교가 닿는 하루를 재구성한다(docs/NARRATIVE_FIRST10.md 시각표).
 *
 * provenance 원칙(HISTORICAL_SOURCES 7.4):
 *  - verified     : 실록 kja_10407011_001 국역을 그대로 옮긴 대사만(전교, 당상들의 간언).
 *  - reconstructed: 사실에 근거한 연출(호칭, 귀엣말, 행동 묘사).
 *  - fictional    : 관측자에 관한 SF 연출.
 *
 * 표시 이름(label)에 실존 인물 이름을 쓰지 않는다. 김일손 본인·유자광·어세겸은 등장시키지 않는다(장면에 있었다는 근거 없음).
 * 엿듣기: 대사는 at(시각) 구간에 말해지고, 뷰어는 hear(기본: 기준 배율 1.6배 이상 + 화면 중심 3타일 이내)일 때만 들려준다.
 * 대사 id 는 콘텐츠 전체에서 유일하다(hearLine·프레임·단서가 쓴다).
 *
 * 시각표: 08:00 서리 「성종대왕 실록…」 · 08:40 붉은 관복 「…이 글은 그대로 넘길 수 없소.」 · 12:00 회랑 「조의제문」 ·
 *   13:00 서리 귓속말(세조대왕 실록 편수) · 13:56 미세 지직 · 14:00 전교 + 당상들의 간언(verified) · 15:00 봉함 ·
 *   16:00 푸른 관복 「사초를 쓴 사관은 아직 살아 있소.」
 * grants.terms: 들은 표현 그대로 → 검색어 칩(밑줄).
 */
import type { NpcDef } from '@/core/types';
import { REF } from '@/data/historical/refs';
import { GLOSS } from '@/data/glossary';

const R = 'reconstructed' as const;
const V = 'verified' as const;
const F = 'fictional' as const;

export const npcs: NpcDef[] = [
  {
    id: 'npc_red_official',
    provenance: R,
    sources: [REF.yiGeukdon, REF.sillokSachoOrder],
    sceneId: 'obs001',
    spriteKey: 'npc_official_red',
    label: '붉은 관복',
    personId: 'per_yi_geukdon',
    schedule: [
      { time: 480, x: 19, y: 5, action: 'read' },
      { time: 840, x: 19, y: 9, action: 'stand' },
      { time: 900, x: 19, y: 5, action: 'write' },
      { time: 1140, x: 18, y: 9, action: 'stand' },
    ],
    dialogue: [
      {
        id: 'r1',
        text: '(사초 한 장을 오래 들여다본다. 붓을 들었다가, 내려놓는다.)',
        provenance: R,
        sources: [REF.yiGeukdon],
        at: [{ from: 480, to: 840 }],
      },
      {
        id: 'r2',
        speaker: '붉은 관복',
        text: '…이 글은 그대로 넘길 수 없소.',
        provenance: R,
        sources: [REF.yiGeukdon, REF.muoSahwa],
        at: [{ from: 520, to: 840 }],
      },
      {
        id: 'r3',
        text: '(전교가 닿은 뒤, 다른 당상들과 사초 묶음을 다시 펼친다. 몇 장을 가려 뽑아 봉한다.)',
        provenance: R,
        sources: [REF.sillokSachoOrder],
        at: [{ from: 900, to: 960 }],
      },
    ],
  },
  {
    id: 'npc_blue_official',
    provenance: R,
    sources: [REF.sillokSachoOrder],
    sceneId: 'obs001',
    spriteKey: 'npc_official_blue',
    label: '푸른 관복',
    schedule: [
      { time: 480, x: 24, y: 5, action: 'read' },
      { time: 720, x: 21, y: 8, action: 'stand' },
      { time: 840, x: 21, y: 9, action: 'stand' },
      { time: 960, x: 24, y: 5, action: 'write' },
    ],
    dialogue: [
      {
        id: 'b1',
        text: '(문서를 정리하면서도 붉은 관복 쪽을 자주 살핀다.)',
        provenance: R,
        sources: [REF.sillokSachoOrder],
        at: [{ from: 480, to: 840 }],
      },
      {
        id: 'b2',
        speaker: '당상들',
        text: '“예로부터 사초(史草)는 임금이 스스로 보지 않습니다.”',
        provenance: V,
        sources: [REF.sillokSachoOrder],
        at: [{ from: 840, to: 960 }],
        grants: { terms: ['사초'] },
        glossary: [GLOSS.sacho, GLOSS.dangsang],
      },
      {
        id: 'b3',
        speaker: '당상들',
        text: '“임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다.”',
        provenance: V,
        sources: [REF.sillokSachoOrder],
        at: [{ from: 840, to: 960 }],
        grants: { terms: ['직필'] },
        glossary: [GLOSS.sacho, GLOSS.jikpil],
      },
      {
        id: 'b4',
        text: '(간언은 받아들여지지 않은 듯하다. 당상들이 사초에서 몇 장을 가려 뽑아 봉한다. 붉은 관복도 그 자리에 있다.)',
        provenance: R,
        sources: [REF.sillokSachoOrder],
        at: [{ from: 900, to: 960 }],
      },
      {
        id: 'b5',
        speaker: '푸른 관복',
        text: '사초를 쓴 사관은 아직 살아 있소. 곧 불려 가겠지.',
        provenance: R,
        sources: [REF.muoSahwa, REF.sillokVerdict],
        at: [{ from: 960, to: 1141 }],
        glossary: [GLOSS.sacho],
      },
    ],
  },
  {
    id: 'npc_young_official',
    provenance: R,
    sources: [REF.geomyeol, REF.jouijemun],
    sceneId: 'obs001',
    spriteKey: 'npc_historian',
    label: '젊은 관원',
    schedule: [
      { time: 480, x: 14, y: 5, action: 'write' },
      { time: 600, x: 4, y: 9, action: 'read' },
      { time: 720, x: 33, y: 9, action: 'stand' },
      { time: 840, x: 14, y: 5, action: 'write' },
      { time: 1020, x: 35, y: 12, action: 'stand' },
    ],
    dialogue: [
      {
        id: 'y1',
        speaker: '젊은 관원',
        text: '사관은 집에도 사초를 따로 적어 두오. 실록을 엮을 땐 그것까지 거두어 가지.',
        provenance: R,
        sources: [REF.geomyeol, REF.sagwan],
        at: [{ from: 600, to: 720 }],
        grants: { terms: ['사초'] },
        glossary: [GLOSS.sacho],
      },
      {
        id: 'y2',
        speaker: '젊은 관원',
        text: '안쪽 방의 꾸러미가 다 집에 둔 사초요. 이름표마다 주인이 다르지.',
        provenance: R,
        sources: [REF.sagwan, REF.seongjongSillok],
        at: [{ from: 600, to: 720 }],
        grants: { terms: ['집에 둔 사초'] },
      },
      {
        id: 'y3',
        speaker: '젊은 관원',
        text: '당상께서 문제 삼으신 글이… 돌아가신 점필재 선생의 「조의제문」이라 하오.',
        provenance: R,
        sources: [REF.jouijemun, REF.muoSahwa, REF.yiGeukdon],
        at: [{ from: 720, to: 840 }],
        grants: { terms: ['조의제문', '점필재'] },
        glossary: [GLOSS.dangsang],
      },
      {
        id: 'y4',
        speaker: '젊은 관원',
        text: '직필이 없어진다는 말… 오늘 그 말이 지켜질지 모르겠소.',
        provenance: R,
        sources: [REF.sillokSachoOrder],
        at: [{ from: 1020, to: 1141 }],
        grants: { terms: ['직필'] },
        glossary: [GLOSS.jikpil],
      },
    ],
  },
  {
    id: 'npc_clerk',
    provenance: R,
    sources: [REF.sagwan],
    sceneId: 'obs001',
    spriteKey: 'npc_clerk',
    label: '서리',
    schedule: [
      { time: 480, x: 5, y: 9, action: 'carry' },
      { time: 540, x: 18, y: 7, action: 'carry' },
      { time: 660, x: 5, y: 10, action: 'carry' },
      { time: 780, x: 17, y: 7, action: 'carry' },
      { time: 900, x: 9, y: 16, action: 'walk' },
    ],
    dialogue: [
      {
        id: 'c1',
        speaker: '서리',
        text: '성종대왕 실록을 다 엮어야 이 짐도 끝이 나지.',
        provenance: R,
        sources: [REF.sillokMyoho, REF.seongjongSillok],
        at: [{ from: 480, to: 780 }],
        grants: { terms: ['성종대왕 실록', '성종대왕'] },
      },
      {
        id: 'c2',
        speaker: '서리',
        text: '당상 영감께서는 오늘 한 사초만 붙들고 계시네.',
        provenance: R,
        sources: [REF.yiGeukdon],
        at: [{ from: 540, to: 660 }],
        grants: { terms: ['당상'] },
        glossary: [GLOSS.dangsang, GLOSS.sacho],
      },
      {
        id: 'c3',
        speaker: '서리',
        text: '(목소리를 낮추며) 저 당상 영감은 세조대왕 실록 때도 편수를 맡으셨다지.',
        provenance: R,
        sources: [REF.yiGeukdon],
        at: [{ from: 780, to: 900 }],
        grants: { terms: ['세조대왕 실록'] },
        glossary: [GLOSS.dangsang, GLOSS.pyeonsu],
      },
    ],
  },
  {
    id: 'npc_messenger',
    provenance: R,
    sources: [REF.sillokSachoOrder],
    sceneId: 'obs001',
    spriteKey: 'npc_official_green',
    label: '대문의 관원',
    schedule: [
      { time: 420, x: 20, y: 26, action: 'stand' },
      { time: 840, x: 20, y: 12, action: 'bow' },
      { time: 960, x: 19, y: 26, action: 'stand' },
    ],
    dialogue: [
      {
        id: 'm1',
        text: '(대문 안쪽에서 누군가를 기다리듯 서 있다. 손에 접은 종이.)',
        provenance: R,
        sources: [REF.sillokSachoOrder],
        at: [{ from: 420, to: 840 }],
      },
      {
        id: 'm2',
        speaker: '전교(傳敎)',
        text: '“김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라.”',
        provenance: V,
        sources: [REF.sillokSachoOrder],
        at: [{ from: 840, to: 960 }],
        grants: { terms: ['대내로 들여오라', '김일손'] },
        glossary: [GLOSS.jeongyo, GLOSS.sacho, GLOSS.daenae],
      },
    ],
  },
  {
    id: 'npc_servant',
    provenance: R,
    sources: [REF.seongjongSillok],
    sceneId: 'obs001',
    spriteKey: 'npc_servant',
    label: '하인',
    schedule: [
      { time: 480, x: 12, y: 22, action: 'draw_water' },
      { time: 600, x: 25, y: 19, action: 'sweep' },
      { time: 780, x: 8, y: 17, action: 'sweep' },
      { time: 900, x: 12, y: 20, action: 'stand' },
    ],
    dialogue: [
      {
        id: 's1',
        text: '(물을 긷는다. 바로 곁에 선 관측자를 보지 못한다.)',
        provenance: F,
        at: [{ from: 480, to: 840 }],
      },
      {
        id: 's2',
        text: '(대청 쪽이 술렁이자 고개를 들었다가, 다시 물동이를 든다.)',
        provenance: R,
        sources: [REF.sillokSachoOrder],
        at: [{ from: 840, to: 1141 }],
      },
    ],
  },
];
