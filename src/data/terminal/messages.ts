/**
 * 메신저·메일. 스토리 비트·목표 안내·프롤로그/에필로그/예고가 여기로 온다. 도착하는 순간 grants 가 적용된다.
 *  - 동료 '한 선임'(가상)은 언제나 "데이터상 정상"이라 말한다. 힌트는 그의 잔소리 속에 있다(디에게틱 힌트).
 *  - 답장 선택지는 분위기·후속 대사용 플래그(reply_*)만 세운다. 퍼즐을 대신 풀지 않는다(검증기).
 *  - from '나' = 플레이어가 보낸 말(오른쪽 말풍선).
 *  - 흑막·말소 원리는 말하지 않는다. 정합성 보정은 "변경 0건"이라는 조용한 모순으로만 보인다.
 */
import type { Message } from '@/core/types';
import { REF } from '@/data/historical/refs';

const F = 'fictional' as const;
const V = 'verified' as const;
const SEN = '한 선임';
const ME = '나';

export const messages: Message[] = [
  // ── B1 프롤로그 ─────────────────────────────────────────
  {
    id: 'm_sys_boot',
    provenance: F,
    thread: 'system',
    from: '결록 단말',
    text: '로그인했습니다. 통합 역사 DB 동기화: 정상. 23:04',
    order: 0,
  },
  {
    id: 'm_c_01',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '아직 안 갔어? 또 그 사관 자료 보는 거지. 김일손. 데이터상 정상이라니까 — 못 믿겠으면 직접 검색해 봐.',
    order: 1,
    grants: { terms: ['김일손'] },
  },
  {
    id: 'm_c_02',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '봤지? 오류 0건, 원본 대조 통과. 너무 매끄럽다는 건 칭찬이야.',
    when: { searched: ['se_kim_ilson'] },
    order: 10,
    choices: [
      { id: 'ch_smooth', text: '그러니까 이상한 거예요.', setsFlags: ['reply_smooth'] },
      { id: 'ch_fine', text: '…그렇네요.', setsFlags: ['reply_fine'] },
    ],
  },
  {
    id: 'm_c_03a',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '하여간 고집은. 그 사람 거문고가 아직 남아 있다던데, 그거나 찾아보고 자. 손으로 적는 버릇도 좀 고치고.',
    when: { all: ['reply_smooth'] },
    order: 11,
  },
  {
    id: 'm_c_03b',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '그래, 쉬어. …아, 그 사관 거문고가 아직 남아 있는 거 알았어? 보물이래. 또 노트에 적고 있지?',
    when: { all: ['reply_fine'] },
    order: 11,
  },

  // ── B4 관측 지점 ────────────────────────────────────────
  {
    id: 'm_dev_01',
    provenance: F,
    thread: 'device',
    from: '관측 장치',
    text: '연결 자료 감지 — 탁영금 · 김일손. 관측 지점 #001 개방. 연도: ####. 장소: 미확인.',
    when: { all: ['research_takyeong', 'research_kim_ilson'] },
    order: 20,
    grants: { flags: ['obs_link_001'] },
  },

  // ── B9 관측 종료 ────────────────────────────────────────
  {
    id: 'm_dev_02',
    provenance: F,
    thread: 'device',
    from: '관측 장치',
    text: '관측 #001 종료. 관측 기록 보존 위치: 손 노트(스캔) — 동기화 대상 아님.',
    when: { all: ['obs001_returned'] },
    order: 30,
  },
  {
    id: 'm_c_05',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '아직 있어? 뭘 봤든 정리부터 해. 누가 누군지 보드에 붙여 보면 보여.',
    when: { all: ['obs001_returned'] },
    order: 31,
  },

  // ── B11 첫 인물 확정 → 기록관 ───────────────────────────
  {
    id: 'm_sys_archive',
    provenance: F,
    thread: 'system',
    from: '결록 단말',
    text: '개인 기록관에 새 전시물이 등록되었습니다.',
    when: { all: ['ded_person_confirmed'] },
    order: 40,
  },

  // ── B12 정합성 보정(가상, 조용한 사건) ───────────────────
  {
    id: 'm_sys_correction',
    provenance: F,
    thread: 'system',
    from: '결록 단말',
    text: '야간 정합성 보정 완료 · 변경 0건.',
    when: { corrections: ['corr_001'] },
    order: 50,
  },
  {
    id: 'm_c_06',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '그 0.998 얘기 말이야. 방금 다시 열어 봤는데 0.712던데? 정상 범위. 피곤해서 잘못 본 거야.',
    when: { corrections: ['corr_001'] },
    order: 51,
    choices: [
      { id: 'ch_insist', text: '분명 0.998이었어요. 노트에 적어 뒀어요.', setsFlags: ['reply_insist'] },
      { id: 'ch_doubt', text: '…제가 잘못 봤나 봐요.', setsFlags: ['reply_doubt'] },
    ],
  },
  {
    id: 'm_c_07a',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '종이 노트? 요즘 누가 그런 걸 믿어. …뭐, 네 글씨는 네가 알겠지.',
    when: { all: ['reply_insist'] },
    order: 52,
  },
  {
    id: 'm_c_07b',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '그래. 단말이 맞아. 단말은 늘 맞아.',
    when: { all: ['reply_doubt'] },
    order: 52,
  },
  {
    id: 'm_c_08',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '보정이든 뭐든 원문은 안 바뀌어. 사료 뷰어 권한 열어 뒀어. 들은 말이 있으면 원문에서 찾아봐.',
    when: { read: ['m_c_06'] },
    order: 53,
    grants: { flags: ['app_reader'] },
  },

  // ── 막힘 방지: 보정 사건 메시지를 끝내 읽지 않아도 사료 뷰어가 열린다 ──
  {
    id: 'm_sys_reader',
    provenance: F,
    thread: 'system',
    from: '결록 단말',
    text: '사료 뷰어 권한이 부여되었습니다(요청자: 한 선임).',
    when: { corrections: ['corr_001'], minStats: { searches: 12 } },
    order: 54,
    grants: { flags: ['app_reader'] },
  },

  // ── B15 에필로그(세 추리 확정) ──────────────────────────
  {
    id: 'm_ep_01',
    provenance: V,
    thread: 'system',
    from: '관측 기록 #001 요약',
    text: '1498년 음력 7월 11일. 왕은 한 사관의 사초를 대내로 들이라 명했다.',
    sources: [REF.sillokSachoOrder],
    when: { all: ['ded_year_confirmed', 'ded_person_confirmed', 'ded_event_confirmed'] },
    order: 90,
  },
  {
    id: 'm_ep_02',
    provenance: V,
    thread: 'system',
    from: '관측 기록 #001 요약',
    text: '당상들은 "임금이 만약 사초를 보면 후세에 직필이 없다"고 아뢰었고, 사초에서 여섯 조목이 뽑혀 올라갔다.',
    sources: [REF.sillokSachoOrder],
    when: { all: ['ded_year_confirmed', 'ded_person_confirmed', 'ded_event_confirmed'] },
    order: 91,
  },
  {
    id: 'm_ep_03',
    provenance: V,
    thread: 'system',
    from: '관측 기록 #001 요약',
    text: '이튿날부터 신문이 이어졌다. 김일손은 그달 처형되었고, 스승 김종직은 부관참시되었다.',
    sources: [REF.muoSahwa, REF.sillokVerdict, REF.sillokProclaim],
    when: { all: ['ded_year_confirmed', 'ded_person_confirmed', 'ded_event_confirmed'] },
    order: 92,
  },
  {
    id: 'm_ep_04',
    provenance: V,
    thread: 'system',
    from: '관측 기록 #001 요약',
    text: '실록 편찬은 멈추지 않았다. 이듬해 『성종실록』이 완성되어 사고에 봉안되었다.',
    sources: [REF.seongjongSillok],
    when: { all: ['ded_year_confirmed', 'ded_person_confirmed', 'ded_event_confirmed'] },
    order: 93,
  },
  {
    id: 'm_ep_05',
    provenance: F,
    thread: 'colleague',
    from: ME,
    text: '기록을 남긴 사람이, 기록 때문에 사라졌어요. 그런데 그 기록들은 모두 제자리에 있어요. 빠진 날도, 찢긴 장도 없이.',
    when: { all: ['ded_year_confirmed', 'ded_person_confirmed', 'ded_event_confirmed'] },
    order: 94,
  },
  {
    id: 'm_ep_06',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '그러니까, 데이터상 정상이라는 거잖아.',
    when: { all: ['ded_year_confirmed', 'ded_person_confirmed', 'ded_event_confirmed'] },
    order: 95,
  },

  // ── 예고(기록관 중앙 진열 뒤) ───────────────────────────
  {
    id: 'm_teaser_01',
    provenance: F,
    thread: 'system',
    from: '결록 단말',
    text: '이상 징후 #002. 다른 시대, 다른 사관의 자료 주변에서 같은 매끄러움이 감지되었습니다.',
    when: { all: ['ded_event_confirmed', 'archive_center_seen'] },
    order: 100,
  },
  {
    id: 'm_teaser_02',
    provenance: F,
    thread: 'device',
    from: '관측 장치',
    text: '새 연결 탐색 중… 관측 지점 #002: 잠김.',
    when: { all: ['ded_event_confirmed', 'archive_center_seen'] },
    order: 101,
  },
  {
    id: 'm_teaser_03',
    provenance: F,
    thread: 'colleague',
    from: ME,
    text: '…이번에는, 누구지?',
    when: { all: ['ded_event_confirmed', 'archive_center_seen'] },
    order: 102,
  },
];
