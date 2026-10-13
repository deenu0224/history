/**
 * 메신저. 스토리 비트·디에게틱 힌트·에필로그/예고가 여기로 온다. 도착하는 순간 grants 가 적용된다.
 *  - 한 선임(가상)은 반말, 주인공('나')은 존댓말. 그는 연도나 퍼즐 정답을 말하지 않는다.
 *  - 답장 선택지는 분위기 플래그(reply_*)만 세운다(검증기 choice_solves_puzzle).
 *  - 복원(현실 이동) 뒤 지난 메시지는 새 현실로 다시 쓰인다(src/data/terminal/reality.ts). 메신저에는 표식이 없고,
 *    플레이어 쪽 연필 표시('어제는 이렇게 말했었다')만 원래 말을 기억한다(store.selectRewrittenMessages).
 *  - 흑막·원리는 말하지 않는다. 말소도 복원도 단말에는 "변경 0건"으로만 보인다.
 */
import type { Message } from '@/core/types';
import { REF } from '@/data/historical/refs';

const F = 'fictional' as const;
const V = 'verified' as const;
const SEN = '한 선임';
const ME = '나';
const SYS = '결록 단말';
const DEV = '관측 장치';

/** B1 이 오는 조건 = 메신저가 설치되는 조건(콜드 오픈의 단어를 검색했거나, 검색을 두 번 했다) */
export const MESSENGER_WHEN = { any: [{ searched: ['se_muo'] }, { minStats: { searches: 2 } }] };
const EPILOGUE = { all: ['restored_order', 'restored_person', 'restored_event'] };

export const messages: Message[] = [
  // ── B0 콜드 오픈: 어젯밤 내가 쓴 손 노트(동기화 제외 스캔) ─────────
  {
    id: 'm_sys_scan',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: '손 노트 스캔 1쪽 — 동기화 대상 아님.',
    order: 0,
    grants: {
      terms: ['무오█화'],
      notebook: [{ id: 'note_cold', section: 'question', text: '무오█화 — 계속 조사', provenance: F }],
    },
  },

  // ── B1 ─────────────────────────────────────────────────
  {
    id: 'm_sys_boot',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: '로그인했습니다. 통합 역사 DB 동기화: 정상. 23:04',
    when: MESSENGER_WHEN,
    order: 1,
  },
  {
    id: 'm_c_01',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '아직 안 갔어? 또 그 사관 기록이야? 「김일손」. 사인 없는 졸년 기록, 옛날엔 흔해. 못 믿겠으면 직접 찾아봐.',
    when: MESSENGER_WHEN,
    order: 2,
    grants: { terms: ['김일손'] },
  },

  // ── B2~B4 ──────────────────────────────────────────────
  {
    id: 'm_c_02',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '봤지? 오류 0건, 원본 대조 통과. 그게 정상이야.',
    when: { searched: ['se_kim_ilson'] },
    order: 10,
    choices: [
      { id: 'ch_three', text: '같은 달에 세 사람이 죽었는데, 이유가 하나도 없어요.', setsFlags: ['reply_three'] },
      { id: 'ch_fine', text: '…그렇네요.', setsFlags: ['reply_fine'] },
    ],
  },
  {
    id: 'm_c_03a',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '그 시절엔 역병도 있고 흉년도 있어. 기록이 다 적혀야 한다는 건 우리 욕심이고.',
    when: { all: ['reply_three'] },
    order: 11,
  },
  {
    id: 'm_c_03b',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '그래, 오늘은 접어.',
    when: { all: ['reply_fine'] },
    order: 11,
  },
  {
    // 공통(답장을 끝내 고르지 않아도 막히지 않게: 검색 3회)
    id: 'm_c_04',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '…아, 그 사람 거문고는 아직 남아 있어. 「탁영금」, 보물이야. 사람은 가도 물건은 남지. 손으로 적는 버릇은 여전하네.',
    when: { searched: ['se_kim_ilson'], any: [{ all: ['reply_three'] }, { all: ['reply_fine'] }, { minStats: { searches: 3 } }] },
    order: 12,
    grants: { terms: ['탁영금'] },
  },

  // ── B5 관측 지점 + 규칙 한 줄 ─────────────────────────────
  {
    id: 'm_dev_01',
    provenance: F,
    thread: 'device',
    from: DEV,
    text: '연결 자료 감지 — 탁영금 · 김일손. 관측 지점 #001 개방. 연도: ####. 장소: 미확인.',
    when: { all: ['research_takyeong', 'research_kim_ilson'] },
    order: 20,
    grants: { flags: ['obs_link_001'] },
  },
  {
    id: 'm_dev_rule',
    provenance: F,
    thread: 'device',
    from: DEV,
    text: '관측은 과거를 바꾸지 않습니다. 바뀌는 것은 현재가 기억하는 기록입니다.',
    when: { all: ['obs_link_001'] },
    order: 21,
  },

  // ── B8 귀환: 본 것이 실록에 없다 ───────────────────────────
  {
    id: 'm_dev_02',
    provenance: F,
    thread: 'device',
    from: DEV,
    text: '관측 #001 종료. 관측 기록 보존 위치: 손 노트(스캔) — 동기화 대상 아님.',
    when: { all: ['obs001_returned'] },
    order: 30,
  },
  {
    id: 'm_c_05',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '아직 있어? …뭘 봤는데 그래.',
    when: {
      all: ['obs001_returned'],
      any: [{ searched: ['se_sacho_order'] }, { minStats: { deductionAttempts: 1 } }, { minStats: { searches: 8 } }],
    },
    order: 31,
    grants: { flags: ['talked_order'] },
    choices: [
      { id: 'ch_saw', text: '왕이 한 사관의 사초를 가져오라고 했어요. 실록에 없어요.', setsFlags: ['reply_saw'] },
      { id: 'ch_wait', text: '아직은 말 못 하겠어요.', setsFlags: ['reply_wait'] },
    ],
  },
  {
    id: 'm_c_06a',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '실록에 없는 걸 봤다고? 그건 관측이 아니라 상상이야. …정 그러면 본 걸 보드에 붙여서 정리해 봐. 누가 누군지라도.',
    when: { all: ['reply_saw'] },
    order: 32,
  },
  {
    id: 'm_c_06b',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '그래. 정리부터 해. 보드에 붙여 보면 보여.',
    when: { all: ['reply_wait'] },
    order: 32,
  },

  // ── B11 밤사이 말소(정합성 보정): 메모가 사라지고, 선임은 대화를 기억하지 못한다 ──
  {
    id: 'm_sys_correction',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: '야간 정합성 보정 완료 · 변경 0건.',
    when: { corrections: ['corr_001'] },
    order: 50,
  },
  {
    id: 'm_c_07',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '어제 무슨 사초 얘기 했었나? 기억이 잘 안 나네. 피곤했나 봐.',
    when: { corrections: ['corr_001'] },
    order: 51,
    choices: [
      { id: 'ch_insist', text: '메모가 지워졌어요. 노트에는 남아 있고요.', setsFlags: ['reply_insist'] },
      { id: 'ch_doubt', text: '…아니에요, 아무것도.', setsFlags: ['reply_doubt'] },
    ],
  },
  {
    id: 'm_c_08a',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '종이 노트? 요즘 누가 그런 걸 믿어. …뭐, 네 글씨는 네가 알겠지.',
    when: { all: ['reply_insist'] },
    order: 52,
  },
  {
    id: 'm_c_08b',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '그래. 단말이 맞아. 단말은 늘 맞아.',
    when: { all: ['reply_doubt'] },
    order: 52,
  },
  {
    id: 'm_c_09',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '원문은 내가 손댈 수 없어. 원문 대조 권한 열어 줄게. 네가 들은 말 중에 진짜 실록에 남아 있는 게 있으면, 그걸로 증명해 봐.',
    when: { read: ['m_c_07'] },
    order: 53,
    grants: { flags: ['source_access'] },
  },
  {
    // 막힘 방지: 보정 메시지를 끝내 읽지 않아도 원문 대조가 열린다
    id: 'm_sys_access',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: '원문 대조 권한이 부여되었습니다(요청자: 한 선임).',
    when: { corrections: ['corr_001'], minStats: { searches: 20 } },
    order: 54,
    grants: { flags: ['source_access'] },
  },

  // ── B13 첫 복원 = 첫 현실 이동. 고마워하지 않는다: 원래 다 아는 것 ──
  {
    id: 'm_sys_sync_order',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: '통합 역사 DB 동기화: 정상 · 변경 0건.',
    when: { all: ['restored_order'] },
    order: 60,
  },
  {
    id: 'm_c_10',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '그 기사? 「김일손의 사초를 모두 대내로 들이라」. 실록청 사람이면 다 아는 거잖아. 갑자기 왜?',
    when: { all: ['restored_order'] },
    order: 61,
    choices: [
      { id: 'ch_yesterday', text: '어제는 검색이 안 됐어요.', setsFlags: ['reply_yesterday'] },
      { id: 'ch_nothing', text: '…아니에요.', setsFlags: ['reply_nothing'] },
    ],
  },
  {
    id: 'm_c_11a',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '그 기사가 검색이 안 될 리가 있어? 동기화 로그도 변경 0건이야.',
    when: { all: ['reply_yesterday'] },
    order: 62,
  },
  {
    id: 'm_c_11b',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '싱겁긴.',
    when: { all: ['reply_nothing'] },
    order: 62,
  },

  // ── B15 에필로그(세 기록 모두): 복원된 기사 요약(verified) → 나 → 한 선임 ──
  {
    id: 'm_ep_01',
    provenance: V,
    thread: 'system',
    from: '복원된 기록',
    text:
      '1498년(연산군 4) 음력 7월 11일. 왕이 “김일손의 사초를 모두 대내로 들여오라” 전교했다. ' +
      '당상들은 “예로부터 사초는 임금이 스스로 보지 않습니다”라고 아뢰었고, 사초에서 6조목이 뽑혀 올라갔다.',
    sources: [REF.sillokSachoOrder],
    when: EPILOGUE,
    order: 90,
  },
  {
    id: 'm_ep_02',
    provenance: V,
    thread: 'system',
    from: '복원된 기록',
    text: '7월 12일. 김일손의 집에서 수색해 낸 잡문서 가운데 이목·권오복이 그에게 보낸 편지가 나왔다.',
    sources: [REF.sillokHouseSearch],
    when: EPILOGUE,
    order: 91,
  },
  {
    id: 'm_ep_03',
    provenance: V,
    thread: 'system',
    from: '복원된 기록',
    text:
      '7월 26일. “김일손·권오복·권경유는 대역의 죄에 해당하니 능지 처사하고.” ' +
      '이튿날 그 일을 종묘 사직에 고했다. 이미 세상을 떠난 김종직은 부관참시되었다.',
    sources: [REF.sillokVerdict, REF.sillokProclaim],
    when: EPILOGUE,
    order: 92,
  },
  {
    id: 'm_ep_04',
    provenance: V,
    thread: 'system',
    from: '복원된 기록',
    text:
      '어세겸·이극돈 등은 수사관으로서 문제의 사초를 보고도 고하지 않은 죄로 파면되었다. ' +
      '실록 편찬은 멈추지 않아, 이듬해 『성종실록』이 완성되어 사고에 봉안되었다. 이 일을 무오사화라 한다.',
    sources: [REF.muoSahwa, REF.seongjongSillok],
    when: EPILOGUE,
    order: 93,
  },
  {
    id: 'm_ep_05',
    provenance: F,
    thread: 'colleague',
    from: ME,
    text: '기록을 남긴 사람이, 기록 때문에 죽었어요. 그리고 방금까지, 아무도 그걸 몰랐어요.',
    when: EPILOGUE,
    order: 94,
  },
  {
    id: 'm_ep_06',
    provenance: F,
    thread: 'colleague',
    from: SEN,
    text: '무오사화를? 우리 부서에 그걸 모르는 사람이 어디 있어. 너 신입 때 나한테 그걸로 발표했잖아. …너 오늘 좀 이상하다.',
    when: EPILOGUE,
    order: 95,
    grants: {
      notebook: [{ id: 'note_only_me', section: 'observed', text: '나만 기억한다. 바뀌기 전을.', provenance: F }],
    },
  },
  {
    // 두 번째 동료(아키비스트): 기억이 한 선임과 다르게 흔들린다 — 기억은 있는데 이력이 없다.
    id: 'm_arc_01',
    provenance: F,
    thread: 'archivist',
    from: '서 아키비스트',
    text: '무오사화 원문 열람 요청, 처리했어요. …이상하네요. 이 기사들 작년에 제가 직접 교정을 봤는데, 교정 이력이 비어 있어요. 원래 그런 건가.',
    when: { all: ['restored_event'] },
    order: 96,
  },

  // ── 예고(기록관 중앙 진열 뒤) ───────────────────────────
  {
    id: 'm_teaser_01',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: '이상 징후 #002. 다른 시대, 다른 사관의 기록에서 같은 공백이 감지되었습니다.',
    when: { all: ['restored_event', 'archive_center_seen'] },
    order: 100,
  },
  {
    id: 'm_teaser_02',
    provenance: F,
    thread: 'device',
    from: DEV,
    text: '새 연결 탐색 중… 관측 지점 #002: 잠김.',
    when: { all: ['restored_event', 'archive_center_seen'] },
    order: 101,
  },
  {
    id: 'm_teaser_03',
    provenance: F,
    thread: 'colleague',
    from: ME,
    text: '…이번에는, 무엇이 없어진 거지?',
    when: { all: ['restored_event', 'archive_center_seen'] },
    order: 102,
  },
];
