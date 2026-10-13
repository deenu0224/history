/**
 * 관측 뷰어(디오라마)의 사물 핫스팟. 좌표는 world/maps.ts 의 타일 좌표.
 *  - 걷기 폐지: 연구실·기록관 오브젝트는 단말 앱(검색·메신저·기록관)으로 옮겼다(src/data/terminal).
 *  - obs001(과거) 문구에는 연도·왕대·관청 이름·인물 이름을 넣지 않는다.
 *  - windows: 그 시각에만 살펴볼 수 있다(사람이 자리를 비웠을 때 등). 진행 필수 증거는 항상 열린 대체 경로가 있다.
 *  - grants.terms: 보고 들은 그대로의 표현 → 검색어 수첩(칩).
 *  - 탁영금은 DB 자료로만 등장한다(과거 장면에 두지 않음: 각자 시기 미확인).
 */
import type { Interactable } from '@/core/types';
import { REF } from '@/data/historical/refs';

const R = 'reconstructed' as const;

// ── 관측 #001(obs001, 과거) ─────────────────────────────────
// 근거: 실록청에서 가장사초를 거두어 편찬함(E0029555, E0002091), 7월 11일 사초 반입 사건(kja_10407011_001).
// 배치·사물의 세부 묘사는 재구성.
const obs001: Interactable[] = [
  {
    id: 'obs_gate_signboard',
    provenance: R,
    sources: [REF.seongjongSillok],
    sceneId: 'obs001',
    x: 18,
    y: 28,
    spriteKey: 'obj_signboard',
    kind: 'object',
    label: '현판',
    examine: ['대문 곁의 현판. 글씨가 그늘에 묻혀 읽히지 않는다.', '관원과 서리가 쉴 새 없이 드나든다. 관청이다.'],
    grants: { collect: [{ entryId: 'col_plc_chunchugwan', stage: 1 }] },
  },
  {
    id: 'obs_yard_well',
    provenance: R,
    sources: [REF.seongjongSillok],
    sceneId: 'obs001',
    x: 11,
    y: 21,
    spriteKey: 'obj_well',
    kind: 'object',
    label: '우물',
    examine: ['두레박이 젖어 있다. 먹을 갈 물도 여기서 긷는 모양이다.'],
  },
  {
    id: 'obs_store_sacho',
    provenance: R,
    sources: [REF.geomyeol, REF.sagwan],
    sceneId: 'obs001',
    x: 3,
    y: 8,
    spriteKey: 'obj_sacho_bundle',
    kind: 'object',
    label: '종이 꾸러미',
    examine: [
      '끈으로 묶은 종이 꾸러미가 수십 묶음 쌓여 있다.',
      '꼬리표마다 다른 사람의 이름. 여러 집에서 거둬 온 것이다.',
    ],
    grants: {
      evidence: [{ id: 'ev_gajang' }, { id: 'ev_sillokcheong' }],
      flags: ['f_saw_bundles'],
      notebook: [
        {
          id: 'note_bundles',
          section: 'observed',
          text: '곳간에 여러 사람의 이름이 붙은 종이 꾸러미가 쌓여 있다.',
          provenance: R,
        },
      ],
    },
  },
  {
    id: 'obs_store_bookshelf',
    provenance: R,
    sources: [REF.seongjongSillok],
    sceneId: 'obs001',
    x: 6,
    y: 8,
    spriteKey: 'obj_bookshelf',
    kind: 'object',
    label: '서가',
    examine: ['서책과 문서철이 빽빽하다. 표제는 그늘에 묻혀 읽히지 않는다.'],
  },
  {
    id: 'obs_store_chest',
    provenance: R,
    sources: [REF.seongjongSillok],
    sceneId: 'obs001',
    x: 7,
    y: 10,
    spriteKey: 'obj_chest',
    kind: 'object',
    label: '궤',
    examine: ['무거운 궤. 자물쇠가 채워져 있다.'],
  },
  {
    id: 'obs_store_jar',
    provenance: R,
    sources: [REF.seongjongSillok],
    sceneId: 'obs001',
    x: 3,
    y: 11,
    spriteKey: 'obj_jar',
    kind: 'object',
    label: '항아리',
    examine: ['물이 반쯤 담긴 항아리. 바닥에 먹물 자국.'],
  },
  {
    id: 'obs_hall_desk_scribe',
    provenance: R,
    sources: [REF.gyeongguk],
    sceneId: 'obs001',
    x: 14,
    y: 6,
    spriteKey: 'obj_desk_writing',
    kind: 'object',
    label: '젊은 관원의 서안',
    examine: ['붓과 벼루, 옮겨 적다 만 종이.', "그리고 손때 묻은 책 한 권. 표지에 '經國大典'."],
    // 주인이 자리를 비운 동안에만 책상 위가 보인다(선택 단서·레드 헤링)
    windows: [
      { from: 600, to: 720 },
      { from: 1020, to: 1141 },
    ],
    hiddenText: '젊은 관원이 서안 앞에 앉아 있어 책상 위가 가려져 있다.',
    grants: {
      evidence: [{ id: 'ev_lawbook' }],
      flags: ['f_saw_lawbook'],
      collect: [{ entryId: 'col_src_gyeongguk', stage: 1 }],
      terms: ['經國大典'],
    },
  },
  {
    id: 'obs_hall_manuscript',
    provenance: R,
    sources: [REF.seongjongSillok],
    sceneId: 'obs001',
    x: 16,
    y: 6,
    spriteKey: 'obj_books_stack',
    kind: 'object',
    label: '원고 더미',
    examine: [
      '날짜 순으로 옮겨 적은 초고가 높이 쌓였다.',
      '한 임금의 치세를 하루하루 엮고 있다. 맨 끝은 그 임금의 마지막 날이다.',
    ],
    grants: { evidence: [{ id: 'ev_sillokcheong' }], flags: ['f_saw_bundles'] },
  },
  {
    id: 'obs_hall_desk_red',
    provenance: R,
    sources: [REF.yiGeukdon],
    sceneId: 'obs001',
    x: 19,
    y: 6,
    spriteKey: 'obj_desk_writing',
    kind: 'object',
    label: '당상의 서안',
    examine: ['펼쳐 둔 사초 한 묶음.', '같은 장을 몇 번이고 넘긴 자국이 있다.'],
    // 붉은 관복의 노관이 일어서 있는 짧은 틈에만(선택 단서 → 기록관 전시물)
    windows: [{ from: 840, to: 900 }],
    hiddenText: '붉은 관복의 노관이 서안을 차지하고 있다. 가까이 들여다볼 수 없다.',
    grants: {
      flags: ['f_saw_red_desk'],
      notebook: [
        {
          id: 'note_red_desk',
          section: 'observed',
          text: '붉은 관복의 노관이 한 사초를 몇 번이고 다시 읽는다.',
          provenance: R,
        },
      ],
    },
  },
  {
    id: 'obs_hall_desk_blue',
    provenance: R,
    sources: [REF.seongjongSillok],
    sceneId: 'obs001',
    x: 24,
    y: 6,
    spriteKey: 'obj_desk_writing',
    kind: 'object',
    label: '서안',
    examine: ['문서철이 가지런히 쌓였다. 붓끝이 말라 있다.'],
  },
  {
    id: 'obs_hall_screen',
    provenance: R,
    sources: [REF.seongjongSillok],
    sceneId: 'obs001',
    x: 19,
    y: 4,
    spriteKey: 'obj_screen',
    kind: 'object',
    label: '병풍',
    examine: ['빛바랜 병풍. 대청 안쪽을 가리고 있다.'],
  },
  {
    id: 'obs_hall_lamp',
    provenance: R,
    sources: [REF.seongjongSillok],
    sceneId: 'obs001',
    x: 27,
    y: 5,
    spriteKey: 'obj_lamp',
    kind: 'object',
    label: '등잔',
    examine: ['아직 불을 켜지 않은 등잔. 해가 지면 오래 켜 둘 모양이다.'],
    hiddenText: '등잔에 불이 들어왔다. 대청의 일은 밤까지 이어질 모양이다.',
    windows: [{ from: 480, to: 1080 }],
  },
];

export const worldObjects: Interactable[] = [...obs001];
