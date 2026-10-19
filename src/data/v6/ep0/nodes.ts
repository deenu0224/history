/** Ep0 기록 그래프(DESIGN_V6 §6.2). 글 전용. marks.text '*' = 줄 전체가 밑줄 */
import type { Link, RecordNode } from '@/core/v6/types';

const link = (id: string, kind: Link['kind'], label: string, to: string, extra: Partial<Link> = {}): Link => ({ id, kind, label, to, ...extra });

export const START = 'N0';

export const NODES: Record<string, RecordNode> = {
  N0: {
    id: 'N0',
    kind: 'sillok',
    title: '#C-2209 · 손상된 그날 실록',
    provenance: 'reconstructed',
    header: { text: '관측기: 문장 손상 2건 · 자동 탐지', provenance: 'fictional' },
    goalTarget: true,
    pages: [
      {
        blocks: [
          { kind: 'heading', text: '올린 글' },
          { kind: 'line', line: 'm_head', marks: [{ clue: 'c_head', text: '*' }] },
          { kind: 'line', line: 'm_eonmun', marks: [{ clue: 'c_eonmun', text: '*' }] },
          { kind: 'line', line: 'm_s_seol', marks: [{ clue: 'c_s_seol', text: '*' }] },
          { kind: 'line', line: 'm_tail', marks: [{ clue: 'c_tail', text: '*' }] },
          { kind: 'heading', text: '처분' },
          {
            kind: 'line',
            line: 'm_roster',
            marks: [
              { clue: 'c_r_choi', text: '부제학 최만리' },
              { clue: 'c_r_jeong', text: '응교 정창손' },
            ],
          },
        ],
      },
    ],
    links: [
      link('n0_n1', 'time', '같은 날 · 관측 1', 'N1'),
      link('n0_n2', 'person', '최만리', 'N2'),
      link('n0_n3', 'person', '정창손', 'N3'),
      link('n0_n5', 'person', '하위지', 'N5'),
      link('n0_n6', 'time', '나흘 전', 'N6'),
      link('n0_n7', 'time', '이튿날', 'N7'),
      link('n0_n10', 'event', '탐지 기록', 'N10'),
      link('n0_n9', 'event', '같은 손상', 'N9', { locked: { reason: '날짜 없음 — 관측 불가', opensOnRestore: true } }),
      link('n0_n11', 'person', '임금', 'N11', { restoredOnly: true }),
      link('n0_n8', 'time', '여드레 뒤', 'N8', { restoredOnly: true }),
    ],
  },
  N1: {
    id: 'N1',
    kind: 'observation',
    title: '관측 1 · 하위지의 눈',
    provenance: 'reconstructed',
    header: { text: '그날 기록에 이름이 남은 사람의 눈으로 쓴 글', provenance: 'fictional' },
    pages: [
      { blocks: [{ kind: 'scene', line: 's_title', clue: 'c_title' }] },
      {
        blocks: [
          { kind: 'heard', line: 'm_k_seol', clue: 'c_k_seol' },
          { kind: 'heard', line: 'm_gunsang', clue: 'c_gunsang' },
        ],
      },
      {
        blocks: [
          { kind: 'heard', line: 'm_unseo', clue: 'c_unseo' },
          { kind: 'heard', line: 'm_summon', clue: 'c_summon' },
        ],
      },
    ],
    links: [link('n1_n0', 'event', '이 글', 'N0'), link('n1_n5', 'person', '하위지', 'N5'), link('n1_n2', 'person', '최만리', 'N2', { showAfter: 'k_A' })],
  },
  N2: {
    id: 'N2',
    kind: 'person',
    title: '최만리 카드',
    provenance: 'verified',
    pages: [{ blocks: [{ kind: 'line', line: 'm_choi_1' }, { kind: 'line', line: 'm_choi_2' }] }],
    links: [link('n2_n0', 'event', '이 글', 'N0')],
  },
  N3: {
    id: 'N3',
    kind: 'person',
    title: '정창손 카드',
    provenance: 'verified',
    pages: [{ blocks: [{ kind: 'line', line: 'm_jeong_1' }, { kind: 'line', line: 'm_jeong_2' }] }],
    links: [link('n3_n0', 'event', '이 글', 'N0')],
  },
  N5: {
    id: 'N5',
    kind: 'person',
    title: '하위지 카드',
    provenance: 'verified',
    pages: [{ blocks: [{ kind: 'line', line: 'm_ha_1' }] }],
    links: [link('n5_n1', 'time', '같은 날 · 관측', 'N1')],
  },
  N6: {
    id: 'N6',
    kind: 'sillok',
    title: '나흘 전 기록',
    provenance: 'reconstructed',
    pages: [{ blocks: [{ kind: 'line', line: 'm_n6' }] }],
    links: [link('n6_n0', 'event', '언문', 'N0')],
  },
  N7: {
    id: 'N7',
    kind: 'sillok',
    title: '이튿날 기록',
    provenance: 'reconstructed',
    pages: [{ blocks: [{ kind: 'line', line: 'm_n7' }] }],
    links: [],
  },
  N8: {
    id: 'N8',
    kind: 'sillok',
    title: '여드레 뒤 기록',
    provenance: 'reconstructed',
    restoredOnly: true,
    pages: [{ blocks: [{ kind: 'line', line: 'm_n8' }] }],
    links: [],
  },
  N9: {
    id: 'N9',
    kind: 'fragment',
    title: '같은 손상',
    provenance: 'reconstructed',
    restoredOnly: true,
    pages: [{ blocks: [{ kind: 'line', line: 'm_n9_holed' }] }],
    links: [link('n9_n11', 'person', '임금', 'N11')],
  },
  N10: {
    id: 'N10',
    kind: 'current',
    title: '관측기 탐지 기록',
    provenance: 'fictional',
    pages: [
      {
        blocks: [
          { kind: 'note', text: '문장 손상 2건 · 자동 탐지', provenance: 'fictional' },
          { kind: 'note', text: '① 그날 실록 한 꼭지 — 문장이 통째로 뚫렸다.', provenance: 'fictional' },
          { kind: 'note', text: '② 같은 모양의 손상 — 날짜 없음, 관측 불가.', provenance: 'fictional' },
          { kind: 'line', line: 'm_n9_holed' },
        ],
      },
    ],
    links: [link('n10_n0', 'event', '이 글', 'N0'), link('n10_n9', 'event', '같은 손상', 'N9', { locked: { reason: '날짜 없음 — 관측 불가', opensOnRestore: true } })],
  },
  N11: {
    id: 'N11',
    kind: 'person',
    title: '세종 카드',
    provenance: 'verified',
    restoredOnly: true,
    pages: [
      {
        blocks: [
          { kind: 'line', line: 'm_sejong_1' },
          { kind: 'line', line: 'm_sejong_2' },
          { kind: 'note', text: '이 줄이 돌아왔다 — 언문 28자를 지은 임금', provenance: 'fictional' },
        ],
      },
    ],
    links: [link('n11_n0', 'event', '이 글', 'N0')],
  },
};
