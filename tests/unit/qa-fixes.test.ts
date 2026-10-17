/**
 * QA(재미·이야기) 반영 엔진 계약: 같은 사람 잇기 · 모순 도면은 기하만 · 긴장 순서(1년 전 보고서 → X1·역사 고정) ·
 * 복원 때 복원 전 묶음 버리기 · 철 지난 힌트 거두기 · 시트 카드/근거 순서가 답을 흘리지 않기 · 「모두 밝혀졌다」 조건.
 */
import { describe, expect, it } from 'vitest';
import { EP0, EP1 } from '@/data/v5';
import { judgeLink } from '@/core/link';
import { dropBursts, expediteTask, createMessenger } from '@/core/messenger';
import { selectContradictionView, selectHome, selectNextTask, selectTagProgress, selectTagSheet } from '@/store/gameStore';
import { knowledge } from '@/store/engine';
import { drainMessages, makeStore, texts, type Harness } from './store-helpers';

const viewAll = (h: Harness, eyeId: string) => EP1.eyes.find((e) => e.id === eyeId)!.cuts.forEach((_, i) => h.st().viewCut(eyeId, i));

function toT3(h: Harness) {
  h.st().startEpisode();
  viewAll(h, 'E1');
  h.st().tag('fig_yi', 'yi_geukdon', 'l_e1_2a', 'e1-2');
  h.st().viewCut('E2', 0);
  h.st().search('윤');
  h.st().tag('fig_yun', 'yun_hyoson', 'l_e2_1', 'e2-1');
  h.st().viewCut('E2', 1);
}

describe('같은 사람 잇기', () => {
  it('judgeLink: 시각·자리·관측으로만 판정한다', () => {
    const k = { viewedCuts: ['e1-2', 'e1-3', 'e2-1', 'e2-2'], named: {}, merges: [], openedEyes: ['E1', 'E2'], closedEyes: [], cardsFound: [], restored: false };
    expect(judgeLink(EP1, k, 'e2-2#fig_eo', 'e1-3#say:l_e1_3')).toMatchObject({ verdict: 'ok', posId: 'O' });
    expect(judgeLink(EP1, k, 'e2-2#fig_yun', 'e1-3#owner').verdict).toBe('ok'); // 같은 시각 같은 자리 — 맞은편 관원 = 첫 번째 관측의 주인
    expect(judgeLink(EP1, k, 'e2-2#fig_eo', 'e1-3#owner').verdict).toBe('not_same_pos');
    expect(judgeLink(EP1, k, 'e2-1#fig_yun', 'e1-3#owner').verdict).toBe('not_same_time');
    expect(judgeLink(EP1, k, 'e2-1#fig_yun', 'e2-2#fig_eo').verdict).toBe('same_eye');
    expect(judgeLink(EP1, k, 'e2-2#fig_eo', 'e4-1#owner').verdict).toBe('invalid'); // 안 본 컷
  });

  it('방이 열려야 잇는다 · 첫 방은 11:40 시범(저절로) · 그 밖은 직접', () => {
    const h = makeStore();
    toT3(h);
    expect(h.st().linkMarkers('e2-2#fig_eo', 'e1-3#say:l_e1_3').verdict).toBe('invalid'); // 방을 아직 안 열었다
    h.st().openRoom();
    expect(h.st().roomTime).toBe('11:40'); // 처음 여는 방 = 시범 시각
    expect(h.st().merges).toHaveLength(2);
    h.st().selectRoomTime('13:20');
    expect(h.st().merges).toHaveLength(2);
    h.st().placeMention('e1-3#say:l_e1_3', 'O'); // 들은 말을 그 말이 가리킨 자리(병풍 앞)에 놓는다
    expect(h.st().linkMarkers('e2-2#fig_eo', 'e1-3#say:l_e1_3').verdict).toBe('ok');
    expect(h.st().merges).toHaveLength(3);
    expect(h.st().fails.link ?? 0).toBe(0);
    h.st().linkMarkers('e2-2#fig_eo', 'e1-3#owner');
    expect(h.st().fails.link).toBe(1); // 실패는 공짜 — 힌트 사다리의 셈에만
  });
});

describe('모순 도면 = 기하만 · 긴장 순서', () => {
  function toX1(h: Harness) {
    toT3(h);
    h.st().openRoom('13:20');
    h.st().placeMention('e1-3#say:l_e1_3', 'O'); // 들은 말을 그 말이 가리킨 자리(병풍 앞)에 놓는다
    h.st().linkMarkers('e2-2#fig_eo', 'e1-3#say:l_e1_3');
    h.st().tag('fig_eo', 'eo_segyeom', 'l_e1_3', 'e2-2');
    h.st().viewCut('E3', 0);
    h.st().search('국장 도감');
    h.st().openRecord('rec_r02');
    h.st().tag('fig_hong', 'hong_gwidal', 'l_e3_1', 'e3-1');
    viewAll(h, 'E4');
    h.st().closeViewer();
  }

  it('도면·근거 글에 결론 낱말이 없다(또렷/흐림·셀 수 있음/가림)', () => {
    const h = makeStore();
    toX1(h);
    const v = selectContradictionView(EP1, h.st(), 'X1')!;
    for (const w of v.geometry.witnesses) expect(w).not.toHaveProperty('status');
    for (const l of v.geometry.listeners) expect(l).not.toHaveProperty('status');
    expect(v.geometry.witnesses.every((w) => typeof w.dirDeg === 'number')).toBe(true);
    for (const e of v.evidence) expect(e.text).not.toMatch(/또렷|흐림|안 들림|셀 수 있음|가림|가려|멀다|시야 밖/);
  });

  it('1년 전 보고서가 오기 전엔 X1 판정·역사 고정이 열리지 않고, 보고서는 앞당겨 온다', () => {
    const h = makeStore();
    toX1(h);
    expect(h.st().closures).toHaveLength(1);
    expect(selectContradictionView(EP1, h.st(), 'X1')!.waiting).toBe(true);
    expect(h.st().resolveContradiction('X1', 'c_scope_all', 'X1:E1')).toEqual({ status: 'wait' });
    expect(selectNextTask(EP1, h.st())).toEqual({ kind: 'contradiction', id: 'X1' });
    // 닫힘의 선택지에 답한 뒤 보고서는 비동기 상한(120초)보다 훨씬 빨리 온다
    h.st().openMessenger();
    expect(h.st().settings.fastMessages).toBe(false); // 보통 속도
    let tClosure = 0; // 06:00 닫힘 줄이 온 때(그 앞의 밀린 대화는 시험 하네스가 읽지 않은 것)
    let t0 = 0;
    for (let i = 0; i < 1200 && !h.st().docs.includes('doc_old_report'); i++) {
      h.advance(250);
      const m = h.st().messenger;
      if (!tClosure && h.st().messenger.log.some((x) => x.text.startsWith('관측기 06:00'))) tClosure = h.clock.t;
      if (m.choice) {
        h.st().chooseReply(m.choice.step.options[0].id);
        t0 = h.clock.t; // 「…끊겼어?」에 답한 때
      }
    }
    expect(h.st().docs).toContain('doc_old_report');
    expect(h.clock.t - t0).toBeLessThan(12_000); // 비동기 40~90초(상한 120초) 대신
    // QA_FUN_R2 N5: 닫힘 줄부터(바로 답하면) 약 20초 안에 보고서
    expect(h.clock.t - tClosure).toBeLessThan(20_000);

    expect(selectContradictionView(EP1, h.st(), 'X1')!.waiting).toBe(false);
    expect(h.st().resolveContradiction('X1', 'c_scope_all', 'X1:E4').status).toBe('resolved');
    expect(h.st().composeRewrite()).toBe('opened');
    // 보고서가 「이제 고정해 봐」보다 먼저
    drainMessages(h, 3);
    const t = texts(h.store);
    expect(t.indexOf('이거 1년 전 네 거야.')).toBeGreaterThan(-1);
    expect(t.indexOf('이거 1년 전 네 거야.')).toBeLessThan(t.indexOf('이제 고정해 봐, 본 것만.'));
  });

  it('「모두 밝혀졌다」는 할 일이 남지 않았을 때만 — Ep1 T4 뒤엔 이름 4/4 만', () => {
    const h = makeStore();
    toX1(h);
    const p = selectTagProgress(EP1, h.st());
    expect(p).toMatchObject({ done: 4, total: 4, complete: true, allClear: false });
    expect(selectHome(EP1, h.st()).next.kind).toBe('contradiction');
    drainMessages(h, 8);
    h.st().resolveContradiction('X1', 'c_scope_all', 'X1:E4');
    expect(selectTagProgress(EP1, h.st()).allClear).toBe(true);
    expect(selectHome(EP1, h.st()).next).toEqual({ kind: 'rewrite' });
  });
});

describe('시트가 답을 흘리지 않는다', () => {
  it('카드 타일은 이름 + 생몰만, 순서는 이름순 · 근거는 시각순 고정(방을 다녀와도 같다)', () => {
    const h = makeStore();
    toT3(h);
    const before = selectTagSheet(EP1, h.st(), 'e2-2', 'fig_eo');
    const names = before.cards.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'ko')));
    for (const c of before.cards) {
      expect(Object.keys(c).sort()).toEqual(['hanja', 'id', 'lifespan', 'name', 'sub']);
      expect(c.sub).toBe(c.lifespan ?? '');
    }
    const order = before.evidenceAll.map((e) => e.id);
    const times = before.evidenceAll.map((e) => e.time ?? '99:99');
    expect(times).toEqual([...times].sort());
    h.st().openRoom('13:20');
    h.st().placeMention('e1-3#say:l_e1_3', 'O'); // 들은 말을 그 말이 가리킨 자리(병풍 앞)에 놓는다
    h.st().linkMarkers('e2-2#fig_eo', 'e1-3#say:l_e1_3');
    const after = selectTagSheet(EP1, h.st(), 'e2-2', 'fig_eo');
    expect(after.evidenceAll.map((e) => e.id)).toEqual(order);
    expect(after.evidenceAll.find((e) => e.id === 'l_e1_3')!.fromThisPersonCut).toBe(true); // 표시만(점)
  });
});

describe('메신저 순서', () => {
  it('철 지난 힌트는 배달 직전에 거둔다(Ep0: T0a 를 맞힌 직후 「모르는 얼굴 있으면 눌러 봐」가 오지 않는다)', () => {
    const h = makeStore(5, 'ep0');
    h.st().startEpisode();
    drainMessages(h, 3);
    h.st().openEye('E0');
    h.st().viewCut('E0', 1); // 넘기기 힌트는 끈다
    h.st().viewCut('E0', 0);
    h.st().closeViewer();
    const hint = 'hint.h0_choi_1';
    for (let i = 0; i < 2400 && !h.st().messenger.fired.includes(hint); i++) h.advance(250);
    expect(h.st().messenger.fired).toContain(hint);
    const text = EP0.ladders.flatMap((l) => l.steps).find((s) => s.id === 'h0_choi_1')!.text;
    expect(texts(h.store)).not.toContain(text); // 아직 입력 중
    expect(h.st().tag('fig_choi', 'choi_manri', 'd_scroll_head', 'e0-1').judgement).toMatchObject({ verdict: 'ok' });
    h.advance(20_000);
    expect(texts(h.store)).not.toContain(text);
  });

  it('dropBursts / expediteTask(순수)', () => {
    const s = { ...createMessenger(1, 0), queue: [{ burstId: 'a', at: 0 }, { burstId: 'b', at: 0 }], tasks: [{ event: 'ev.x', startAt: 0, earliestAt: 60_000, capAt: 120_000 }] };
    const d = dropBursts(s, (id) => id === 'b');
    expect(d.queue.map((q) => q.burstId)).toEqual(['b']);
    expect(d.tasks).toEqual([]);
    const e = expediteTask(s, 'ev.x', 1_000, 8_000);
    expect(e.tasks[0]).toMatchObject({ capAt: 8_000, earliestAt: 8_000 });
    expect(expediteTask(s, 'ev.x', 50_000, 8_000).tasks[0].capAt).toBe(50_000);
  });

  it('복원하면 아직 오지 않은 복원 전 묶음은 버린다', () => {
    const h = makeStore(5, 'ep0');
    h.st().startEpisode();
    // 대기 중인 복원 전 묶음을 하나 만들어 둔다(아직 배달 전)
    h.store.setState({ messenger: { ...h.st().messenger, queue: [...h.st().messenger.queue, { burstId: 'hint.h0_write_1', at: h.clock.t }] } });
    const k = knowledge(h.st());
    expect(k.viewedCuts).toEqual([]);
    // 정답 경로를 빠르게
    for (let i = 0; i < 3; i++) h.st().viewCut('E0', i);
    h.st().tag('fig_choi', 'choi_manri', 'd_scroll_head', 'e0-1');
    const ch = EP0.cards.find((c) => c.id === 'choi_manri')!;
    const f = ch.facts.find((x) => x.links?.length)!;
    h.st().followFactLink(f.id, f.links![0].cardId);
    h.st().tag('fig_king', 'sejong', 'l_e0_gunsang', 'e0-3');
    h.st().composeRewrite();
    const line = h.st().rewrite.lines[0];
    h.st().fillSlot(line.id, 'who', '세종');
    h.st().submitRewrite();
    h.store.setState({ messenger: { ...h.st().messenger, queue: [...h.st().messenger.queue, { burstId: 'ev0.eye_rule', at: h.clock.t }] } });
    expect(h.st().restore()).toBe('restored');
    const m = h.st().messenger;
    const q = [...m.queue.map((x) => x.burstId), ...(m.active ? [m.active.burstId] : [])];
    expect(q).not.toContain('ev0.eye_rule');
    expect(q).not.toContain('hint.h0_write_1');
    expect(q).toContain('ev.restore');
  });
});

describe('역사 고정 줄의 조사', () => {
  it('칸 값 뒤 조사를 값에 맞춘다(「최만리이」 → 「최만리가」), 고정된 국역은 그대로', async () => {
    const { renderLine } = await import('@/core/rewrite');
    const piece = EP0.pieces.find((p) => p.sentenceId === EP0.sentences[0].id)!;
    const text = (who: string, r?: 'restored') => renderLine(EP0, { id: 'x', pieceId: piece.id, values: { who } }, r).parts.map((p) => p.text).join('');
    expect(text('최만리')).toMatch(/^최만리가 /);
    expect(text('세종', 'restored')).toMatch(/^임금이 /);
  });
});
