/**
 * 관측 #001 의 인물. 관측 장면은 음력 7월 11일, 왕의 사초 반입 전교가 실록청에 닿는 날을 재구성한다.
 *
 * provenance 원칙(HISTORICAL_SOURCES 7.4):
 *  - verified     : 실록 kja_10407011_001 국역을 그대로 옮긴 대사만(전교, 당상들의 간언).
 *  - reconstructed: 사실에 근거한 연출(호칭, 귀엣말, 행동 묘사).
 *  - fictional    : 관측자에 관한 SF 연출.
 *
 * 등장시키지 않는 것: 김일손 본인(1498년 소재 미확인), 유자광·어세겸(장면에 있었다는 근거 없음).
 * 이극돈 외의 관원은 신원을 정하지 않는다(personId 없음).
 * 대사 시각은 schedule 의 time(분)과 별개로 플래그로만 열린다(core/world.ts).
 */
import type { NpcDef } from '@/core/types';
import { REF } from '@/data/historical/refs';

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
    label: '미확인 관료',
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
        grants: {
          evidence: [{ id: 'ev_unknown_official' }],
          flags: ['f_met_official'],
          notebook: [{ id: 'q_who', section: 'question', text: '붉은 관복의 당상은 누구인가?', provenance: F }],
        },
      },
      {
        id: 'r2',
        speaker: '붉은 관복의 당상',
        text: '…이 글은 그대로 넘길 수 없소.',
        provenance: R,
        sources: [REF.yiGeukdon, REF.muoSahwa],
        when: { none: ['f_saw_order'] },
      },
      {
        id: 'r3',
        text: '(전교가 닿은 뒤, 다른 당상들과 사초 묶음을 다시 펼친다.)',
        provenance: R,
        sources: [REF.sillokSachoOrder],
        when: { all: ['f_saw_order'] },
      },
    ],
  },
  {
    id: 'npc_blue_official',
    provenance: R,
    sources: [REF.sillokSachoOrder],
    sceneId: 'obs001',
    spriteKey: 'npc_official_blue',
    label: '미확인 관료',
    schedule: [
      { time: 480, x: 24, y: 5, action: 'read' },
      { time: 720, x: 21, y: 8, action: 'stand' },
      { time: 840, x: 21, y: 9, action: 'stand' },
      { time: 960, x: 24, y: 5, action: 'write' },
    ],
    dialogue: [
      {
        id: 'b1',
        text: '(문서를 정리하면서도 붉은 관복의 당상 쪽을 자주 살핀다.)',
        provenance: R,
        sources: [REF.sillokSachoOrder],
        when: { none: ['f_saw_order'] },
      },
      {
        id: 'b2',
        speaker: '당상들',
        text: '“예로부터 사초(史草)는 임금이 스스로 보지 않습니다.”',
        provenance: V,
        sources: [REF.sillokSachoOrder],
        when: { all: ['f_saw_order'] },
      },
      {
        id: 'b3',
        speaker: '당상들',
        text: '“임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다.”',
        provenance: V,
        sources: [REF.sillokSachoOrder],
        when: { all: ['f_saw_order'] },
        grants: {
          evidence: [{ id: 'ev_objection' }],
          notebook: [
            {
              id: 'note_objection',
              section: 'testimony',
              text: '당상들: 사초는 임금이 보지 않는 것이 예로부터의 일이며, 보면 직필이 사라진다.',
              provenance: V,
            },
          ],
        },
      },
      {
        id: 'b4',
        text: '(간언은 받아들여지지 않은 듯하다. 붉은 관복의 당상이 앞장서, 사초에서 여섯 조목을 가려 뽑아 봉한다.)',
        provenance: R,
        sources: [REF.sillokSachoOrder],
        when: { all: ['f_saw_order'] },
        grants: { evidence: [{ id: 'ev_six_articles' }], flags: ['f_saw_sealing'] },
      },
      {
        id: 'b5',
        speaker: '푸른 관복의 당상',
        text: '사초를 쓴 사관은 아직 살아 있소. 곧 불려 가겠지.',
        provenance: R,
        sources: [REF.muoSahwa],
        when: { all: ['f_saw_order'] },
        grants: { evidence: [{ id: 'ev_author_alive' }] },
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
      { time: 720, x: 14, y: 5, action: 'write' },
      { time: 1020, x: 35, y: 12, action: 'stand' },
    ],
    dialogue: [
      {
        id: 'y1',
        speaker: '젊은 관원',
        text: '사초는 두 벌을 쓰오. 한 벌은 바치고, 한 벌은 집에 두지.',
        provenance: R,
        sources: [REF.geomyeol],
      },
      {
        id: 'y2',
        speaker: '젊은 관원',
        text: '곳간의 꾸러미가 집에 두었던 것들이오. 실록을 엮을 때 모두 거두어 가니까.',
        provenance: R,
        sources: [REF.sagwan, REF.seongjongSillok],
        grants: { evidence: [{ id: 'ev_gajang' }] },
      },
      {
        id: 'y3',
        speaker: '젊은 관원',
        text: '당상께서 문제 삼으신 글이… 돌아가신 점필재 선생의 「조의제문」이라 하오.',
        provenance: R,
        sources: [REF.jouijemun, REF.muoSahwa, REF.yiGeukdon],
        when: { all: ['f_met_official'] },
        grants: {
          evidence: [{ id: 'ev_jouijemun' }, { id: 'ev_jongjik_dead' }],
          flags: ['f_heard_jouijemun'],
          collect: [{ entryId: 'col_src_jouijemun', stage: 1 }],
        },
      },
      {
        id: 'y4',
        speaker: '젊은 관원',
        text: '직필이 없어진다는 말… 오늘 그 말이 지켜질지 모르겠소.',
        provenance: R,
        sources: [REF.sillokSachoOrder],
        when: { all: ['f_saw_order'] },
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
      { time: 540, x: 17, y: 8, action: 'carry' },
      { time: 660, x: 5, y: 10, action: 'carry' },
      { time: 780, x: 12, y: 8, action: 'carry' },
      { time: 900, x: 9, y: 16, action: 'walk' },
    ],
    dialogue: [
      {
        id: 'c1',
        speaker: '서리',
        text: '성종대왕 실록을 다 엮어야 이 짐도 끝이 나지.',
        provenance: R,
        sources: [REF.sillokMyoho, REF.seongjongSillok],
        grants: {
          evidence: [{ id: 'ev_myoho' }],
          flags: ['f_heard_myoho'],
          notebook: [
            {
              id: 'note_myoho',
              section: 'testimony',
              text: "서리: 엮고 있는 것은 '성종대왕 실록'.",
              provenance: R,
            },
          ],
        },
      },
      {
        id: 'c2',
        speaker: '서리',
        text: '당상 영감께서는 오늘 한 사초만 붙들고 계시네.',
        provenance: R,
        sources: [REF.yiGeukdon],
        grants: { evidence: [{ id: 'ev_unknown_official' }] },
      },
      {
        id: 'c3',
        speaker: '서리',
        text: '(목소리를 낮추며) 저 영감은 세조대왕 실록 때도 편수를 맡으셨다지.',
        provenance: R,
        sources: [REF.yiGeukdon],
        when: { all: ['f_met_official'] },
        grants: {
          evidence: [{ id: 'ev_veteran' }],
          notebook: [
            {
              id: 'note_veteran',
              section: 'testimony',
              text: '서리: 붉은 관복의 당상은 세조대왕 실록 때도 편수를 맡았다.',
              provenance: R,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'npc_messenger',
    provenance: R,
    sources: [REF.sillokSachoOrder],
    sceneId: 'obs001',
    spriteKey: 'npc_official_green',
    label: '미확인 관원',
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
        when: { none: ['f_met_official'] },
      },
      {
        id: 'm2',
        speaker: '전교(傳敎)',
        text: '“김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라.”',
        provenance: V,
        sources: [REF.sillokSachoOrder],
        when: { all: ['f_met_official'] },
        grants: {
          evidence: [{ id: 'ev_royal_order' }],
          flags: ['f_saw_order'],
          notebook: [
            {
              id: 'note_order',
              section: 'testimony',
              text: '전교: 김일손이라는 사관의 사초를 모두 대내로 들이라.',
              provenance: V,
            },
          ],
        },
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
      },
      {
        id: 's2',
        text: '(대청 쪽이 술렁이자 고개를 들었다가, 다시 물동이를 든다.)',
        provenance: R,
        sources: [REF.sillokSachoOrder],
        when: { all: ['f_saw_order'] },
      },
    ],
  },
];
