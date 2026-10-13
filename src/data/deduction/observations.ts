// 관측 장면. 관측 중 문구에는 연도·왕대·장소·인물 이름을 넣지 않는다.
import type { Observation } from '@/core/types';

export const observations: Observation[] = [
  {
    id: 'obs_001',
    provenance: 'fictional',
    sceneId: 'obs001',
    title: '관측 #001',
    lines: [
      '화면의 명도가 한 칸 내려앉는다.',
      '흙냄새. 먹 냄새. 어딘가에서 종이 넘기는 소리.',
      '관측 #001 — 시대: 미상 · 연도: 미상 · 장소: 미확인 · 인물: 미확인',
      '이곳 사람들은 관측자를 보지 못한다. 보고, 듣고, 기록할 수만 있다.',
    ],
    grants: {
      flags: ['obs001_entered'],
      notebook: [
        { id: 'q_when', section: 'question', text: '지금은 언제인가?', provenance: 'fictional' },
        { id: 'q_what', section: 'question', text: '이 관청에서 무슨 일이 벌어지고 있는가?', provenance: 'fictional' },
        {
          id: 'note_obs001_arrival',
          section: 'observed',
          text: '기와 담장 안의 관청. 관복 차림의 관원들, 종이 꾸러미를 나르는 서리들.',
          provenance: 'reconstructed',
        },
      ],
    },
  },
  {
    id: 'obs_001_return',
    provenance: 'fictional',
    sceneId: 'archive',
    title: '귀환',
    lines: [
      '관청의 소리가 멀어지고, 기록관의 낮은 기계음이 돌아온다.',
      '관측 노트는 그대로 남아 있다. 본 것과 들은 것, 한 글자도 빠짐없이.',
      '이제 분석실의 단말로 들은 말과 본 것을 실제 사료와 대조할 수 있다.',
    ],
    grants: {
      flags: ['obs001_returned'],
      notebook: [
        {
          id: 'note_return_001',
          section: 'observed',
          text: '관측 #001 에서 귀환. 들은 칭호, 본 문서, 사람들의 말을 사료와 대조할 것.',
          provenance: 'fictional',
        },
      ],
    },
  },
];
