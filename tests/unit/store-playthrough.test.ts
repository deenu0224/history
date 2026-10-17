import { describe, expect, it } from 'vitest';
import { EP1 } from '@/data/v5';
import {
  selectCard,
  selectContradictionView,
  selectCut,
  selectEyes,
  selectHome,
  selectLog,
  selectMessenger,
  selectRestoration,
  selectRewrite,
  selectRoom,
  selectSearch,
  selectSlotOptions,
  selectTagSheet,
  selectViewer,
  type TagOutcome,
} from '@/store/gameStore';
import { drainMessages, makeStore, texts, type Harness } from './store-helpers';

const viewAll = (h: Harness, eyeId: string) => {
  const eye = EP1.eyes.find((e) => e.id === eyeId)!;
  eye.cuts.forEach((_, i) => h.st().viewCut(eyeId, i));
};
const verdict = (o: TagOutcome) => (o.judgement.status === 'judged' ? o.judgement.verdict : o.judgement.reason);

/** 起承轉: E1 → T1 → E2 → T2(겹침) → T3 → E3 → T4 → E4 */
function playToE4(h: Harness) {
  h.st().startEpisode();
  h.st().openEye('E1');
  viewAll(h, 'E1');
  expect(verdict(h.st().tag('fig_yi', 'yi_geukdon', 'l_e1_2a', 'e1-2'))).toBe('ok');
  h.st().viewCut('E2', 0);
  expect(h.st().openRoom()).toBe('locked'); // 찾기 먼저(T2), 방은 그 뒤
  expect(h.st().search('윤').results.map((r) => r.id)).toEqual(expect.arrayContaining(['yun_hyoson', 'yun_pilsang']));
  expect(verdict(h.st().tag('fig_yun', 'yun_hyoson', 'l_e2_1', 'e2-1'))).toBe('ok');
  expect(h.st().openRoom()).toBe('opened');
  h.st().viewCut('E2', 1);
  h.st().selectRoomTime('13:20');
  h.st().placeMention('e1-3#say:l_e1_3', 'O'); // 들은 말을 그 말이 가리킨 자리(병풍 앞)에 놓는다
  expect(h.st().linkMarkers('e2-2#fig_eo', 'e1-3#say:l_e1_3').verdict).toBe('ok'); // 같은 사람 잇기(플레이어 동작)
  expect(verdict(h.st().tag('fig_eo', 'eo_segyeom', 'l_e1_3', 'e2-2'))).toBe('ok');
  h.st().viewCut('E3', 0);
  h.st().search('국장 도감');
  expect(h.st().openRecord('rec_r02')).toBe(true);
  expect(verdict(h.st().tag('fig_hong', 'hong_gwidal', 'l_e3_1', 'e3-1'))).toBe('ok');
}

describe('store — Ep1 correct path end to end', () => {
  it('plays from cold open to restoration and the teaser', () => {
    const h = makeStore();
    // 起 — 시작
    expect(h.st().startEpisode()).toBe('started');
    expect(h.st().cardsFound).toEqual(['yi_geukdon', 'eo_segyeom', 'sin_seungseon']);
    expect(selectHome(EP1, h.st()).card).toMatchObject({ code: '#C-2217', date: '####', place: '미확인', status: '빈자리' });
    expect(selectEyes(EP1, h.st()).map((e) => e.state)).toEqual(['open', 'unopened', 'unopened', 'unopened', 'never']);
    expect(selectEyes(EP1, h.st())[0]).toMatchObject({ ownerUnknown: true, label: '첫 번째 관측' });
    // 첫 기억 다섯 컷
    expect(h.st().openEye('E1')).toMatchObject({ status: 'viewed', cutId: 'e1-1', index: 0 });
    viewAll(h, 'E1');
    expect(h.st().swipes).toBe(4);
    const v = selectViewer(EP1, h.st())!;
    expect(v.eyeLabel).toBe('첫 번째 관측');
    expect(v.cut!.time).toBe('15:00');
    const c14 = selectCut(EP1, h.st(), 'e1-4')!;
    expect(c14.bubbles[0]).toMatchObject({ text: '김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라.', garbled: false });
    expect(c14.bubbles[0].provenance).toBeUndefined(); // 플레이 중 출처 배지 없음
    expect(c14.bubbles[0].glosses.map((g) => g.term)).toEqual(['사초', '대내']);

    // 찾기 「김일손」 — 열리지 않는 눈
    const sk = h.st().search('김일손');
    expect(sk.results[0]).toEqual({ kind: 'person', id: 'kim_ilson' });
    const kim = selectCard(EP1, h.st(), 'kim_ilson')!;
    expect(kim.altered[0]).toMatchObject({ state: 'altered', text: '사망 1498년 7월 · 사인: 기록 없음' });
    expect(kim.eyeLine).toBe('관측: 불가 — 그날 그 방에 없었다');
    expect(h.st().search('대내로 들여오라').status).toBe('no_article');

    // T1 — 시트: 이 방 카드 먼저, 근거는 이 사람이 나온 컷 것 먼저
    expect(h.st().tapFigure('e1-2', 'fig_yi').tappable).toBe(true);
    const sheet = selectTagSheet(EP1, h.st(), 'e1-2', 'fig_yi', 'yi_geukdon');
    expect(sheet.figure.label).toBe('책상 너머 관원');
    expect(sheet.evidence[0].fromThisPersonCut).toBe(true);
    expect(sheet.evidence.every((e) => e.kind !== 'fact')).toBe(true); // 카드 줄은 근거가 아니다
    expect(sheet.roomLink).toBeNull(); // 방은 아직
    expect(sheet.searchSeed).toEqual([]); // 찾기 낱말은 퍼즐 찾기어만(이조 판서는 풀이만)
    const t1 = h.st().tag('fig_yi', 'yi_geukdon', 'l_e1_2a');
    expect(t1.judgement).toEqual({ status: 'judged', verdict: 'ok' });
    expect(t1.openedEyes).toEqual(['E2']);
    expect(t1.matchedFacts).toEqual([
      { cardId: 'yi_geukdon', factId: 'f_yi_ijo' },
      { cardId: 'yi_geukdon', factId: 'f_yi_ijo2' },
    ]);
    expect(selectCard(EP1, h.st(), 'yi_geukdon')!.facts.find((f) => f.id === 'f_yi_ijo')!.linkedBy).toBe('l_e1_2a');
    expect(h.st().clock).toBe('00:40');
    expect(h.st().savepoints).toContain('S1');
    expect(selectCut(EP1, h.st(), 'e1-1')!.figures[0]).toMatchObject({ label: '이극돈', named: true, tappable: false });

    // 承 — 둘째 기억: 찾기가 먼저(T2), 그날의 방은 그 뒤에
    h.st().viewCut('E2', 0);
    expect(selectViewer(EP1, h.st())!.canOpenRoom).toBe(false);
    h.st().tapFigure('e2-1', 'fig_yun');
    expect(h.st().searchFromTag('yun_hyoson').seed).toEqual(['윤']);
    expect(h.st().ui.tagTarget).toBeNull();
    const sy = h.st().search('윤');
    expect(sy.results.map((r) => r.id)).toEqual(expect.arrayContaining(['yun_hyoson', 'yun_pilsang']));
    expect(h.st().returnToTag()).toBe(true);
    expect(h.st().ui).toMatchObject({ tagTarget: { cutId: 'e2-1', figureId: 'fig_yun' }, tagCard: 'yun_hyoson' });
    expect(verdict(h.st().tag('fig_yun', 'yun_hyoson', 'l_e2_1', 'e2-1'))).toBe('ok');
    expect(selectEyes(EP1, h.st())[0]).toMatchObject({ ownerUnknown: false, label: '윤효손이 본 것' });
    expect(selectCard(EP1, h.st(), 'yun_hyoson')!.eyeLine).toBe('관측: 가능');
    expect(h.st().openRoom()).toBe('opened');
    const room = selectRoom(EP1, h.st());
    expect(room.time).toBe('11:40');
    // 겹침 시범(한 번): 처음 여는 방 11:40 의 겹침만 저절로
    expect(room.markers.filter((m) => m.merged).map((m) => m.posId).sort()).toEqual(['W', 'Y']);
    expect(h.st().merges.length).toBe(2);
    // 다른 시각에서는 저절로 겹치지 않는다 — 13:20 의 병풍 앞에는 아직 따로인 표시 둘(옆으로 벌려 그린다)
    h.st().viewCut('E2', 1);
    h.st().selectRoomTime('13:20');
    expect(h.st().merges.length).toBe(2);
    // 13:20 의 「들은 말」(윗자리 대감…)은 아직 도면에 없다 — 칩으로만 있고, 플레이어가 자리에 놓아야 「?」 가 생긴다
    const r1320 = selectRoom(EP1, h.st());
    expect(r1320.markers.filter((m) => m.posId === 'O').map((m) => m.keys)).toEqual([['e2-2#fig_eo']]);
    expect(r1320.heard).toEqual([{ key: 'e1-3#say:l_e1_3', cutId: 'e1-3', eyeId: 'E1', text: expect.any(String) }]);
    // 표시끼리 중심 간격 ≥ 1.7칸(360 폭에서 ≈46px — 44px 탭 영역이 겹치지 않는다)
    const ms = r1320.markers;
    for (let i = 0; i < ms.length; i++)
      for (let j = i + 1; j < ms.length; j++) expect(Math.hypot(ms[i]!.x + ms[i]!.ox - ms[j]!.x - ms[j]!.ox, ms[i]!.y + ms[i]!.oy - ms[j]!.y - ms[j]!.oy)).toBeGreaterThanOrEqual(1.69);
    h.st().closeRoom();

    // T3 — 들은 말은 시트에 늘 뜬다. 겹치기 전엔 「그 말이 이 사람 얘기인지 아직 모른다」 → 「이 시각, 그날의 방」
    h.st().viewCut('E2', 1);
    const t3sheet = selectTagSheet(EP1, h.st(), 'e2-2', 'fig_eo', 'eo_segyeom');
    expect(t3sheet.evidence.map((e) => e.id)).toContain('l_e1_3');
    expect(t3sheet.roomLink).toEqual({ cutId: 'e2-2', time: '13:20', label: '이 시각, 그날의 방' });
    expect(h.st().tag('fig_eo', 'eo_segyeom', 'l_e1_3', 'e2-2').judgement).toEqual({
      status: 'judged',
      verdict: 'not_linked',
      feedback: '그 말이 이 사람 얘기인지 아직 모른다',
    });
    expect(h.st().messenger.fired).not.toContain('ev.tag_unmerged'); // 틀린 시도에는 말이 없다(힌트 사다리만)
    // 시트의 「이 시각, 그날의 방」: 그 시각으로 열지만 겹침은 만들지 않는다 — 플레이어가 잇는다
    h.st().tapFigure('e2-2', 'fig_eo');
    const at = h.st().openRoomFromTag('eo_segyeom');
    expect(at).toMatchObject({ status: 'opened', time: '13:20', merges: [] });
    expect(h.st().ui).toMatchObject({ roomOpen: true, tagTarget: null, roomReturnsToTag: true });
    expect(verdict(h.st().tag('fig_eo', 'eo_segyeom', 'l_e1_3', 'e2-2'))).toBe('not_linked');
    // 잘못 이으면 보이는 이유만(공짜): 다른 자리 · 다른 시각 · 한 관측 안
    expect(h.st().linkMarkers('e2-2#fig_eo', 'e1-3#owner')).toEqual({ verdict: 'not_same_pos', feedback: '같은 자리가 아니다' });
    expect(h.st().linkMarkers('e2-2#fig_eo', 'e1-2#fig_yi')).toEqual({ verdict: 'not_same_time', feedback: '같은 시각이 아니다' });
    expect(h.st().linkMarkers('e2-2#fig_eo', 'e2-2#fig_yun')).toEqual({ verdict: 'same_eye', feedback: '한 관측 안의 두 사람이다' });
    expect(h.st().merges.length).toBe(2);
    // 놓기 전에는 이을 수 없다 · 틀린 자리에 놓으면 보이는 이유만(공짜)
    expect(h.st().linkMarkers('e1-3#say:l_e1_3', 'e2-2#fig_eo').verdict).toBe('invalid');
    expect(h.st().placeMention('e1-3#say:l_e1_3', 'Y')).toEqual({ verdict: 'wrong', feedback: '그 말이 가리킨 자리가 아니다' });
    expect(h.st().fails.place).toBe(1);
    expect(h.st().placeMention('e1-3#say:l_e1_3', 'O')).toEqual({ verdict: 'ok', key: 'e1-3#say:l_e1_3', posId: 'O' });
    expect(h.st().placeMention('e1-3#say:l_e1_3', 'O').verdict).toBe('already');
    const placed = selectRoom(EP1, h.st());
    expect(placed.heard).toEqual([]);
    expect(placed.markers.filter((m) => m.posId === 'O').map((m) => m.keys)).toEqual([['e1-3#say:l_e1_3'], ['e2-2#fig_eo']]);
    const ln = h.st().linkMarkers('e1-3#say:l_e1_3', 'e2-2#fig_eo');
    expect(ln).toEqual({ verdict: 'ok', keys: ['e1-3#say:l_e1_3', 'e2-2#fig_eo'], posId: 'O' });
    expect(h.st().fx.some((f) => f.kind === 'merge' && f.posId === 'O')).toBe(true);
    expect(h.st().linkMarkers('e2-2#fig_eo', 'e1-3#say:l_e1_3').verdict).toBe('already');
    expect(selectRoom(EP1, h.st()).markers.find((m) => m.posId === 'O')).toMatchObject({ merged: true, count: 2, ox: 0 });
    // 방을 닫으면 시트로 돌아온다(고른 카드 그대로)
    h.st().closeRoom();
    expect(h.st().ui).toMatchObject({ roomOpen: false, tagTarget: { cutId: 'e2-2', figureId: 'fig_eo' }, tagCard: 'eo_segyeom' });
    expect(verdict(h.st().tag('fig_eo', 'eo_segyeom', 'l_e1_3', 'e2-2'))).toBe('ok');
    expect(h.st().clock).toBe('02:15');
    viewAll(h, 'E2');

    // 轉 — T4 와 넷째 눈
    h.st().viewCut('E3', 0);
    h.st().search('국장 도감');
    h.st().ackFx();
    h.st().openRecord('rec_r02');
    expect(h.st().fx.find((x) => x.kind === 'cards_gained')).toEqual({ kind: 'cards_gained', ids: ['yi_geukgyun', 'han_chihyeong', 'hong_gwidal', 'yu_sun'], from: { kind: 'record', id: 'rec_r02' } });
    expect(h.st().cardsFound).toEqual(expect.arrayContaining(['yi_geukgyun', 'han_chihyeong', 'hong_gwidal', 'yu_sun']));
    expect(verdict(h.st().tag('fig_hong', 'hong_gwidal', 'l_e3_1', 'e3-1'))).toBe('ok');
    expect(h.st().openedEyes).toEqual(['E1', 'E2', 'E3', 'E4']);
    viewAll(h, 'E3'); // 닫히기 전에 다 본다(선택 단서 「조의제문」 포함)
    h.st().viewCut('E4', 0);
    h.st().viewCut('E4', 1);
    expect(selectCut(EP1, h.st(), 'e4-2')!.bubbles[0]).toMatchObject({ text: '…사초를 …… 들여……', garbled: true });
    viewAll(h, 'E4');
    // X1 이 드러나고, 06:00 닫힘은 컷을 떠날 때까지 미룬다
    expect(h.st().revealed).toContain('X1');
    expect(h.st().pendingClosure).toBe('clo_c2217_dawn');
    expect(h.st().closedEyes).toEqual([]);
    h.st().closeViewer();
    expect(h.st().closedEyes).toEqual(['E3']);
    expect(h.st().clock).toBe('06:00');
    expect(selectCard(EP1, h.st(), 'eo_segyeom')!.altered[0].state).toBe('erased');
    expect(selectCut(EP1, h.st(), 'e3-5')!.availability).toBe('viewed_closed');
    expect(selectLog(EP1, h.st()).cuts.find((c) => c.cutId === 'e3-2')!.closedEye).toBe(true);

    // 긴장 순서: 1년 전 보고서가 오기 전에는 X1 을 판정하지 않는다(고르기는 된다 — 'wait')
    expect(selectContradictionView(EP1, h.st(), 'X1')!.waiting).toBe(true);
    expect(h.st().resolveContradiction('X1', 'c_scope_all', 'X1:E1')).toEqual({ status: 'wait' });
    expect(h.st().composeRewrite()).toBe('locked');
    // 메신저: 06:00 대사 + 1년 전 보고서(드러난 X1 이 기다리므로 앞당겨 온다)
    drainMessages(h, 8);
    expect(texts(h.store)).toContain('끊긴 관측은 끊긴 거야. 남은 걸로 해.');
    expect(h.st().docs).toContain('doc_old_report');
    expect(h.st().messenger.presence).toBe('online');

    // 結 — X1 을 방에서 푼다
    const xv = selectContradictionView(EP1, h.st(), 'X1')!;
    expect(xv.geometry.kind).toBe('hearing');
    expect(xv.geometry.radius).toBe(8);
    const hong = xv.geometry.witnesses.find((w) => w.eyeId === 'E4')!;
    expect(hong).toMatchObject({ distance: 9.21 });
    // 판정 전 도면은 기하만 — 자리마다의 결론(또렷/흐림)은 내보내지 않는다
    expect('status' in hong).toBe(false);
    expect(xv.evidence.find((e) => e.id === 'X1:E4')!.text).toBe('홍귀달 자리 — 문 앞에서 약 9칸, 들림 반경 8칸');
    expect(xv.waiting).toBe(false);
    expect(texts(h.store)).toContain('맨 끝 봐, 1년 전에도 너 거기서 멈췄어.');
    expect(h.st().resolveContradiction('X1', 'c_scope_all', 'X1:E4').status).toBe('resolved');
    expect(h.st().messenger.fired).not.toContain('ev.x1_resolved'); // 풀린 것은 화면이 알린다
    expect(h.st().search('#C-2217').results).toEqual([{ kind: 'log', id: 'doc_old_report' }]);

    // 기록 다시 쓰기
    expect(selectHome(EP1, h.st()).buttons).toEqual(['memories', 'rewrite']);
    expect(h.st().composeRewrite()).toBe('opened');
    const add = (pid: string) => {
      const r = h.st().placePiece(pid);
      expect(r.status).toBe('ok');
      return (r as { lineId: string }).lineId;
    };
    // 꼭 돌아와야 할 L1~L4 는 시각순으로 미리 놓여 있다(고를 일이 아니다 — 칸만 채운다). 빼기는 안 된다
    const lineOf = (pid: string) => h.st().rewrite.lines.find((l) => l.pieceId === pid)!.id;
    expect(selectRewrite(EP1, h.st()).lines.map((l) => [l.pieceId, l.preplaced])).toEqual([
      ['pc_L1', true],
      ['pc_L2', true],
      ['pc_L3', true],
      ['pc_L4', true],
    ]);
    expect(h.st().placePiece('pc_L1').status).toBe('already');
    expect(h.st().removeLine(lineOf('pc_L2'))).toBe(false);
    expect(selectRewrite(EP1, h.st()).pieces.map((p) => p.id)).not.toContain('pc_L1');
    const L1 = lineOf('pc_L1');
    expect(h.st().fillSlot(L1, 'whose', '김일손').status).toBe('ok');
    expect(h.st().fillSlot(L1, 'scope', '모두').status).toBe('ok');
    expect(selectSlotOptions(EP1, h.st(), 'scope').map((o) => o.value)).toEqual(['모두']); // 진 값은 빠진다
    const L2 = lineOf('pc_L2');
    const L3 = lineOf('pc_L3');
    // 화자 칸은 한 번 고르면 L2·L3 같이
    h.st().fillSlot(L2, 'speaker', '당상(이극돈 등)');
    expect(h.st().rewrite.lines.find((l) => l.id === L3)!.values.speaker).toBe('당상(이극돈 등)');
    const L4 = lineOf('pc_L4');
    h.st().fillSlot(L4, 'who', '이극돈');
    h.st().fillSlot(L4, 'whose', '김일손');
    // '몇' 칸을 열면 X2
    const r6 = h.st().fillSlot(L4, 'count', '6');
    expect(r6).toEqual({ status: 'contested', contradictionId: 'X2' });
    expect(h.st().revealed).toContain('X2');
    const x2 = selectContradictionView(EP1, h.st(), 'X2')!;
    expect(x2.geometry.occluder?.id).toBe('stack');
    expect(x2.evidence.find((e) => e.id === 'X2:E1')!.text).toMatch(/^윤효손 자리 — 봉하는 자리까지 약 \d+(\.5)?칸, 셀 수 있는 거리 5칸$/);
    expect(h.st().resolveContradiction('X2', 'c_count_6', 'X2:E1').status).toBe('resolved');
    expect(h.st().fillSlot(L4, 'count', '6').status).toBe('ok');
    // 선택 줄 + 회색 줄
    const S3 = add('pc_S3');
    const W = add('w_alive');
    const sub = h.st().submitRewrite();
    expect('results' in sub && sub.results).toEqual({ [L1]: 'restored', [L2]: 'restored', [L3]: 'restored', [L4]: 'restored', [S3]: 'restored', [W]: 'witness' });
    expect('complete' in sub && sub.complete).toBe(true);
    expect(h.st().clock).toBe('06:40');
    const rw = selectRewrite(EP1, h.st());
    expect(rw.lines.find((l) => l.id === L4)!.render.parts.map((p) => p.text).join('')).toBe('극돈 등이 일손의 사초에서 6조목을 절취하여 봉해 올리니,');
    expect(rw.lines.find((l) => l.id === L4)!.render.sourceUrl).toBe('https://sillok.history.go.kr/id/kja_10407011_001');
    expect(rw.lines.find((l) => l.id === W)!.resultText).toBe('실록이 적지 않은 일 — 내가 본 것에만 남는다');

    // 현실 재기록
    expect(h.st().restore()).toBe('restored');
    const home = selectHome(EP1, h.st());
    expect(home.card).toMatchObject({ date: '연산군 4년 7월 11일', place: '『성종실록』 편찬 실록청(춘추관 안) · 재구성', status: '고정됨', placeNote: '전달 방식은 재구성' });
    expect(home.buttons).toEqual(['memories', 'restored']);
    const kimR = selectCard(EP1, h.st(), 'kim_ilson')!;
    expect(kimR.altered[0]).toMatchObject({ state: 'restored', provenance: 'verified' });
    expect(kimR.altered[0].text).toContain('능지 처사(凌遲處死)');
    expect(kimR.eyeExtra.map((l) => l.source.id)).toEqual(['kja_10407012_002', 'kja_10407028_003']);
    expect(selectCard(EP1, h.st(), 'eo_segyeom')!.altered[0].text).toContain('파직하고');
    expect(selectCard(EP1, h.st(), 'hong_gwidal')!.facts.map((f) => f.id)).toContain('f_hong_gongjo');
    const rest = selectRestoration(EP1, h.st())!;
    expect(rest.step).toBe('home');
    expect(rest.steps).toEqual(['home', 'cards', 'monologue', 'teaser']);
    expect(rest.article.parts.filter((p) => p.folded)).toHaveLength(1);
    expect(rest.article.parts.find((p) => p.folded)!.display).toBe('……');
    expect(rest.article.parts.filter((p) => p.by === 'me').map((p) => p.sentenceId)).toEqual(['L1', 'L2', 'L3', 'S3', 'L4']);
    expect(rest.messages.find((m) => m.id === 'm_kim_unknown')).toMatchObject({ before: '처음 듣는 이름인데.', after: '김일손이면 무오사화 그 사관이잖아.' });
    expect(rest.room).toMatchObject({ pairLabel: '유순·안침' });
    expect(rest.absence).toEqual([{ clock: '23:04', query: '대내로 들여오라', text: '실록에 없음' }]);
    expect(rest.witnessLines).toHaveLength(1);
    // 메신저가 다시 쓰인다 + 「그걸 모르는 사람이 어디 있어」
    drainMessages(h, 2);
    const mv = h.st().messenger.log.find((m) => m.id === 'm_kim_unknown')!;
    expect(mv.restored).toBe('김일손이면 무오사화 그 사관이잖아.');
    expect(texts(h.store)).toContain('우리 부서에 그걸 모르는 사람이 어디 있어.');
    // 복원 뒤 대화 기록 전체: 소실 세계의 사실을 말하는 줄이 하나도 없다(동료·내 답·힌트 모두)
    const tells = (EP1.erasedFacts ?? []).flatMap((f) => f.tells);
    const shown = selectMessenger(EP1, h.st(), h.clock.t).items;
    for (const m of shown) for (const re of tells) expect(re.test(m.display), `${m.id} 「${m.display}」`).toBe(false);
    expect(shown.filter((m) => m.rewritten).length).toBeGreaterThanOrEqual(3);
    // 그날의 방: 「?」 둘에 짝 이름
    h.st().openRoom('14:05');
    const rr = selectRoom(EP1, h.st());
    expect(rr.markers.filter((m) => m.label === '유순·안침').map((m) => m.posId).sort()).toEqual(['A', 'U']);
    // 같은 검색이 평범한 결과로
    expect(h.st().search('대내로 들여오라').results).toEqual([{ kind: 'record', id: 'rec_0711' }]);
    expect(h.st().search('불살라').results).toEqual([{ kind: 'record', id: 'rec_burn' }]);
    // 에필로그 → 예고
    for (let i = 0; i < 10 && !h.st().epilogueDone; i++) h.st().advanceRestore();
    expect(h.st().epilogueDone).toBe(true);
    expect(h.st().clock).toBe('06:52');
    drainMessages(h, 2);
    expect(h.st().docs).toContain('doc_c0408');
    expect(selectSearch(EP1, h.st()).footer).toMatchObject({ title: '#C-0408 · 2년 전 · 대조관 07' });
    expect(h.st().savepoints).toEqual(['S1', 'S2', 'S3', 'S4', 'S5']);
  });
});

describe('store — mistakes are free and informative', () => {
  it('each tag feedback type, without revealing answers', () => {
    const h = makeStore();
    h.st().startEpisode();
    viewAll(h, 'E1');
    // T1: 어세겸 + 귓속말 → not_pointing · 이극돈 + 전교 → not_pointing · 「?」 없음 · 판정 무효(근거 없음)
    let o = h.st().tag('fig_yi', 'eo_segyeom', 'l_e1_2a', 'e1-2');
    expect(o.judgement).toEqual({ status: 'judged', verdict: 'not_pointing', feedback: '근거가 이 사람을 가리키지 않는다' });
    o = h.st().tag('fig_yi', 'yi_geukdon', 'l_order1', 'e1-2');
    expect(verdict(o)).toBe('not_pointing');
    expect(verdict(h.st().tag('fig_yi', 'yi_geukdon', 'l_e2_1', 'e1-2'))).toBe('evidence_not_held');
    expect(verdict(h.st().tag('fig_yi', 'yun_hyoson', 'l_e1_2a', 'e1-2'))).toBe('card_not_found');
    // 이름 없는 사람 두 번 → 한 선임
    h.st().tag('fig_clerk', 'yi_geukdon', 'l_e1_1', 'e1-1');
    h.st().tag('fig_clerk', 'sin_seungseon', 'l_e1_1', 'e1-1');
    expect(h.st().messenger.fired).not.toContain('ev.tag_anon'); // 틀린 시도에는 말이 없다(힌트 사다리만)
    expect(h.st().fails['tag:T1']).toBe(2);
    expect(h.st().named).toEqual({});
    // 정답
    h.st().tag('fig_yi', 'yi_geukdon', 'l_e1_2a', 'e1-2');
    // T2 미끼: 윤필상(no_room_record, 피드백은 not_pointing 문구) · 이극돈(contradicts — 두 자리)
    h.st().viewCut('E2', 0);
    h.st().search('윤');
    o = h.st().tag('fig_yun', 'yun_pilsang', 'l_e2_1', 'e2-1');
    expect(o.judgement).toEqual({ status: 'judged', verdict: 'no_room_record', feedback: '근거가 이 사람을 가리키지 않는다' });
    expect(h.st().messenger.fired).not.toContain('ev.decoy.T2'); // 틀린 시도에는 말이 없다(힌트 사다리만)
    o = h.st().tag('fig_yun', 'yi_geukdon', 'l_e2_1', 'e2-1');
    expect(o.judgement).toEqual({ status: 'judged', verdict: 'contradicts', feedback: '근거끼리 모순된다' });
    h.st().tag('fig_yun', 'yun_hyoson', 'l_e2_1', 'e2-1');
    // T3: 겹치기 전 1-3 귓속말 → not_linked(방에서 이어진다) · 다른 사람에겐 not_pointing · 신승선 미끼 · 총재관 줄 → not_unique
    h.st().viewCut('E2', 1);
    expect(verdict(h.st().tag('fig_eo', 'eo_segyeom', 'l_e1_3', 'e2-2'))).toBe('not_linked');
    expect(verdict(h.st().tag('fig_clerk', 'eo_segyeom', 'l_e1_3', 'e2-2'))).toBe('not_pointing'); // 그 자리가 아닌 사람
    h.st().openRoom('13:20');
    h.st().placeMention('e1-3#say:l_e1_3', 'O'); // 들은 말을 그 말이 가리킨 자리(병풍 앞)에 놓는다
    h.st().linkMarkers('e2-2#fig_eo', 'e1-3#say:l_e1_3');
    expect(verdict(h.st().tag('fig_eo', 'sin_seungseon', 'l_e1_3', 'e2-2'))).toBe('not_pointing');
    expect(h.st().messenger.fired).not.toContain('ev.decoy.T3'); // 틀린 시도에는 말이 없다(힌트 사다리만)
    expect(h.st().tag('fig_eo', 'eo_segyeom', 'f_eo_r18', 'e2-2').judgement).toEqual({
      status: 'judged',
      verdict: 'not_unique',
      feedback: '근거가 이 사람 하나만 가리키지는 않는다',
    });
    // 기록 줄 하나뿐인 사실이라도 화면 속 사람을 가리키지는 못한다
    expect(verdict(h.st().tag('fig_eo', 'eo_segyeom', 'f_eo_r17', 'e2-2'))).toBe('not_pointing');
    // 「?」 두 관원
    h.st().viewCut('E2', 2);
    h.st().tag('fig_a', 'yi_geukdon', 'l_remon1', 'e2-3');
    expect(verdict(h.st().tag('fig_a', 'eo_segyeom', 'l_remon1', 'e2-3'))).toBe('not_pointing');
    expect(h.st().messenger.fired).not.toContain('ev.tag_noevidence'); // 틀린 시도에는 말이 없다(힌트 사다리만)
    h.st().tag('fig_eo', 'eo_segyeom', 'l_e1_3', 'e2-2');
    // T4 미끼: 이극균·한치형(이 방 기록 없음) · 유순(산릉)
    h.st().viewCut('E3', 0);
    h.st().search('국장 도감');
    h.st().openRecord('rec_r02');
    expect(verdict(h.st().tag('fig_hong', 'yi_geukgyun', 'l_e3_1', 'e3-1'))).toBe('no_room_record');
    expect(verdict(h.st().tag('fig_hong', 'han_chihyeong', 'l_e3_1', 'e3-1'))).toBe('no_room_record');
    expect(verdict(h.st().tag('fig_hong', 'yu_sun', 'l_e3_1', 'e3-1'))).toBe('not_pointing');
    expect(h.st().messenger.fired).not.toContain('ev.decoy.T4'); // 틀린 시도에는 말이 없다(힌트 사다리만)
    expect(h.st().openedEyes).not.toContain('E4');
  });

  it('contradiction wrong pick → retry text, then the right one resolves', () => {
    const h = makeStore();
    playToE4(h);
    viewAll(h, 'E4');
    h.st().closeViewer();
    drainMessages(h, 8); // 1년 전 보고서가 먼저(긴장 순서)
    expect(h.st().revealed).toEqual(['X1']);
    // 근거 2칸: 판단 + 자리 사실. 한 칸만으로는 판정하지 않는다
    expect(h.st().resolveContradiction('X1', 'c_scope_six')).toEqual({ status: 'invalid' });
    const ev = selectContradictionView(EP1, h.st(), 'X1')!.evidence;
    expect(ev.map((e) => e.id)).toContain('X1:E1');
    expect(ev.find((e) => e.id === 'X1:E1')!.text).toBe('윤효손 자리 — 문 앞에서 약 5.5칸, 들림 반경 8칸');
    // 틀린 판단 + 가르는 자리 / 맞는 판단 + 가르지 않는 자리 — 둘 다 같은 문구(어느 칸인지 말하지 않는다)
    expect(h.st().resolveContradiction('X1', 'c_scope_six', 'X1:E1')).toEqual({ status: 'retry', text: '다른 말을 한 자리에 그 말이 닿았는지 보자' });
    expect(h.st().fails['contra:X1']).toBe(1);
    if (ev.some((e) => e.id === 'X1:E2')) expect(h.st().resolveContradiction('X1', 'c_scope_all', 'X1:E2')).toEqual({ status: 'retry', text: '다른 말을 한 자리에 그 말이 닿았는지 보자' });
    expect(h.st().resolveContradiction('X1', 'c_scope_all', 'X1:E9')).toEqual({ status: 'invalid' });
    expect(h.st().resolved).toEqual({});
    expect(h.st().composeRewrite()).toBe('locked'); // X1 이 풀려야 結
    expect(h.st().resolveContradiction('X1', 'c_scope_all', 'X1:E4').status).toBe('resolved');
    expect(h.st().composeRewrite()).toBe('opened');
    // 진 쪽 조각의 새 이름
    expect(selectRewrite(EP1, h.st()).pieces.find((p) => p.id === 'w_six_only')!.label).toBe('뒤섞인 전해 들은 말 — 여섯 조목만 올리라 했다더라');
  });

  it('wrong slot values: line is not recorded (which slot is not said); grey ink for witness-only', () => {
    const h = makeStore();
    playToE4(h);
    viewAll(h, 'E4');
    h.st().closeViewer();
    drainMessages(h, 8);
    expect(h.st().resolveContradiction('X1', 'c_scope_all', 'X1:E4').status).toBe('resolved');
    viewAll(h, 'E2');
    h.st().closeViewer();
    h.st().composeRewrite();
    const lineOf = (pid: string) => h.st().rewrite.lines.find((l) => l.pieceId === pid)!.id;
    const [L1, L2, L3, L4] = ['pc_L1', 'pc_L2', 'pc_L3', 'pc_L4'].map(lineOf);
    expect(h.st().fillSlot(L2, 'speaker', '윗자리 대감').status).toBe('ok');
    expect(h.st().fillSlot(L2, 'speaker', '아무개').status).toBe('not_confirmed');
    const G = (h.st().placePiece('w_corner') as { lineId: string }).lineId;
    const sub = h.st().submitRewrite();
    // 화자 칸은 함께 쓴다(L3 도 같은 값) · 빈 칸이 있는 줄은 incomplete
    expect('results' in sub && sub.results).toEqual({ [L1]: 'incomplete', [L2]: 'not_recorded', [L3]: 'not_recorded', [L4]: 'incomplete', [G]: 'witness' });
    expect(selectRewrite(EP1, h.st()).lines.find((l) => l.id === L2)!.resultText).toBe('흐릿함 — 그날에 붙지 않았다');
    expect(h.st().messenger.fired).toContain('ev.witness_line');
    expect(h.st().restore()).toBe('not_ready');
    // 한 줄만 고쳐 다시 — 공짜
    h.st().fillSlot(L2, 'speaker', '당상(이극돈 등)');
    const one = h.st().submitLine(L2);
    expect('results' in one && one.results).toEqual({ [L2]: 'restored' });
    // 고정된 줄의 함께 쓰는 칸은 지워도 남는다
    h.st().clearSlot(L3, 'speaker');
    expect(h.st().rewrite.lines.find((l) => l.id === L2)!.values.speaker).toBe('당상(이극돈 등)');
    // 그날 고정률: 필수 L1~L4 중 하나 = 25%. 증인 줄(w_corner)은 세지 않는다
    expect(selectRewrite(EP1, h.st()).fixRate).toEqual({ fixed: 1, total: 4, pct: 25 });
    expect(selectHome(EP1, h.st()).fixRate.pct).toBe(25);
    expect(h.st().messenger.fired).not.toContain('ev.write_partial'); // 틀린 시도에는 말이 없다(힌트 사다리만)
    expect(h.st().placePiece('pc_L2').status).toBe('already');
    expect(h.st().placePiece('pc_S1').status).toBe('not_held'); // 3-4 를 못 봤다(닫히는 눈의 선택 줄)
  });
});

describe('store — closing eye (06:00) and the two-route guarantee', () => {
  it('closes E3 after 120s when 4-5 was never seen; unseen cuts are lost, the rewrite still completes', () => {
    const h = makeStore();
    playToE4(h); // E3 은 3-1 만 봤다
    h.st().closeViewer();
    h.st().openEye('E4');
    h.st().closeViewer();
    expect(h.st().closedEyes).toEqual([]);
    h.advance(119_000);
    expect(h.st().closedEyes).toEqual([]);
    h.advance(2_000);
    expect(h.st().closedEyes).toEqual(['E3']);
    expect(h.st().messenger.fired).toContain('ev.closure');
    expect(h.st().viewCut('E3', 4).status).toBe('lost');
    expect(selectCut(EP1, h.st(), 'e3-5')!.lostText).toBe('볼 수 없다 — 이 사람의 그날 기록이 지워졌다');
    expect(h.st().viewCut('E3', 0).status).toBe('reviewed'); // 본 컷은 로그에 남는다
    h.st().closeViewer();
    // 나머지는 닫히지 않는 눈으로
    viewAll(h, 'E2');
    viewAll(h, 'E4');
    h.st().closeViewer();
    expect(h.st().revealed).toContain('X1');
    drainMessages(h, 8);
    expect(h.st().resolveContradiction('X1', 'c_scope_all', 'X1:E4').status).toBe('resolved');
    h.st().composeRewrite();
    const add = (pid: string) => h.st().rewrite.lines.find((l) => l.pieceId === pid)!.id;
    const L1 = add('pc_L1');
    h.st().fillSlot(L1, 'whose', '김일손');
    h.st().fillSlot(L1, 'scope', '모두');
    h.st().fillSlot(add('pc_L2'), 'speaker', '당상(이극돈 등)');
    const L4 = add('pc_L4');
    h.st().fillSlot(L4, 'who', '이극돈');
    h.st().fillSlot(L4, 'whose', '김일손');
    h.st().fillSlot(L4, 'count', '6');
    h.st().resolveContradiction('X2', 'c_count_6', 'X2:E1');
    expect(h.st().fillSlot(L4, 'count', '6').status).toBe('ok');
    expect(h.st().placePiece('pc_S1').status).toBe('not_held'); // ② 전교 컷(3-4)은 잃었다
    const sub = h.st().submitRewrite();
    expect('complete' in sub && sub.complete).toBe(true);
    expect(h.st().restore()).toBe('restored');
    // 복원 뒤 ②는 실록 전문에서 읽힌다
    expect(selectRestoration(EP1, h.st())!.article.parts.find((p) => p.sentenceId === 'S1')!.by).toBe('sillok');
  });

  it('never closes under the finger: pending until the cut is left', () => {
    const h = makeStore();
    playToE4(h);
    h.st().viewCut('E4', 0);
    h.advance(130_000);
    expect(h.st().pendingClosure).toBe('clo_c2217_dawn');
    expect(h.st().closedEyes).toEqual([]);
    h.st().viewCut('E4', 1);
    expect(h.st().closedEyes).toEqual(['E3']);
  });
});
