/**
 * 사료 뷰어의 형광 구절. text 는 반드시 해당 사료 excerpt(국사편찬위원회 국역 그대로)의 부분 문자열(검증기).
 * 구절을 고르면 관측에서 얻은 증거 카드가 사료로 검증되어 다음 단계(연대 제약 공개)로 오른다.
 * when 이 맞지 않으면 'no_link' — 벌점 없음, 나중에 다시 고를 수 있다.
 */
import type { SourcePhrase } from '@/core/types';
import { sources } from '@/data/historical/sources';

const V = 'verified' as const;

const raw: Omit<SourcePhrase, 'sources'>[] = [
  {
    id: 'ph_myoho_seong',
    provenance: V,
    sourceId: 'src_myoho',
    text: '묘호는 성(成)이라 하고',
    when: { evidence: ['ev_myoho'] },
    missText: '칭호를 정한 날의 기록이다. 관측에서 이 칭호를 들었다면 맞춰 볼 수 있다.',
    grants: { evidence: [{ id: 'ev_myoho', level: 1 }], collect: [{ entryId: 'col_src_myoho', stage: 3 }] },
  },
  {
    // 호기심 구절 → '대행왕' 검색어(선택 수집으로 이어짐)
    id: 'ph_myoho_daehaeng',
    provenance: V,
    sourceId: 'src_myoho',
    text: '대행왕의 시호 및 묘호(廟號)·능호(陵號)·전호(殿號)를 의논하였다',
    grants: { terms: ['대행왕'] },
  },
  {
    id: 'ph_death',
    provenance: V,
    sourceId: 'src_seongjong_death',
    text: '임금이 대조전(大造殿)에서 훙(薨)하였는데',
    grants: { collect: [{ entryId: 'col_src_seongjong_death', stage: 3 }] },
  },
  {
    id: 'ph_daehaeng',
    provenance: V,
    sourceId: 'src_daehaengwang',
    text: '세조(世祖)·예종(睿宗)·대행왕의 즉위 때 사령(赦令)을 반포한 전례',
    grants: { collect: [{ entryId: 'col_src_daehaengwang', stage: 3 }] },
  },
  {
    id: 'ph_compile',
    provenance: V,
    sourceId: 'src_compile_order',
    text: '명하여 편찬하게 하였다',
    when: { evidence: ['ev_sillokcheong'] },
    missText: '편찬을 명한 기록이다. 관측에서 무언가를 엮는 모습을 보았다면 맞춰 볼 수 있다.',
    grants: { evidence: [{ id: 'ev_sillokcheong', level: 1 }], collect: [{ entryId: 'col_src_compile_order', stage: 3 }] },
  },
  {
    id: 'ph_order',
    provenance: V,
    sourceId: 'src_sacho_order',
    text: '김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라',
    when: { evidence: ['ev_royal_order'] },
    missText: '왕의 전교다. 관측에서 같은 말을 들었다면 맞춰 볼 수 있다.',
    grants: {
      evidence: [{ id: 'ev_royal_order', level: 1 }],
      collect: [
        { entryId: 'col_src_sacho_order', stage: 3 },
        { entryId: 'col_evt_muo_sahwa', stage: 1 },
      ],
    },
  },
  {
    id: 'ph_custom',
    provenance: V,
    sourceId: 'src_sacho_order',
    text: '예로부터 사초(史草)는 임금이 스스로 보지 않습니다',
    when: { all: ['f_saw_order'] },
    missText: '당상들의 간언이다. 이 말이 나온 자리를 보았다면 맞춰 볼 수 있다.',
    grants: { evidence: [{ id: 'ev_objection' }], terms: ['직필'] },
  },
  {
    id: 'ph_six',
    provenance: V,
    sourceId: 'src_sacho_order',
    text: '일손의 사초에서 6조목을 절취하여 봉해 올리니',
    when: { evidence: ['ev_six_articles'] },
    missText: '사초 일부를 뽑아 올린 기록이다. 관측에서 그 장면을 보았다면 맞춰 볼 수 있다.',
    grants: { evidence: [{ id: 'ev_six_articles', level: 1 }] },
  },
  {
    id: 'ph_house',
    provenance: V,
    sourceId: 'src_house_search',
    text: '김일손(金馹孫)의 집에서 수색해 낸 잡문서',
    grants: { collect: [{ entryId: 'col_src_house_search', stage: 2 }] },
  },
  {
    id: 'ph_verdict',
    provenance: V,
    sourceId: 'src_verdict',
    text: '대역(大逆)의 죄에 해당하니 능지 처사(凌遲處死)하고',
    when: { evidence: ['ev_author_alive'] },
    missText: '처분 기록이다. 관측에서 사초를 쓴 사관의 소식을 들었다면 맞춰 볼 수 있다.',
    grants: {
      evidence: [{ id: 'ev_author_alive', level: 1 }],
      collect: [
        { entryId: 'col_per_kim_ilson', stage: 3 },
        { entryId: 'col_src_verdict', stage: 2 },
      ],
    },
  },
];

/** 출처는 구절이 속한 사료의 출처를 그대로 쓴다. */
export const phrases: SourcePhrase[] = raw.map((p) => ({
  ...p,
  sources: sources.find((s) => s.id === p.sourceId)?.sources ?? [],
}));
