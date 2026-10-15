/**
 * 현실 재기록이 대화 기록 전체를 덮는다(DIALOGUE_GUIDE §1-10, DESIGN_V5 §14.7):
 * 복원 뒤 기록에 소실 세계의 사실을 말하는 줄이 남지 않는다 — 동료의 말도, 07 이 보낸 답도. 표시·원문 보기는 없다.
 */
import { describe, expect, it } from 'vitest';
import { clear } from 'idb-keyval';
import * as M from '@/core/messenger';
import { dialogueLines, validateDialogueAcross, validateEpisode } from '@/core/validate';
import type { Burst, Episode } from '@/core/types';
import { EP0, EP0_CUT_IDS, EP0_CUT_TIMES, EP1 } from '@/data/v5';
import { selectMessenger, selectRestoration } from '@/store/gameStore';
import { drainMessages, makeStore, type Harness } from './store-helpers';

const X0 = { cutIds: EP0_CUT_IDS, cutTimes: EP0_CUT_TIMES };
const rule12 = (ep: Episode) => validateEpisode(ep, X0).filter((i) => i.rule === '⑫');
const allTells = [...(EP0.erasedFacts ?? []), ...(EP1.erasedFacts ?? [])].flatMap((f) => f.tells);

function playEp0ToRestore(h: Harness) {
  h.st().startEpisode();
  EP0.eyes[0].cuts.forEach((_, i) => h.st().viewCut('E0', i));
  h.st().closeViewer();
  drainMessages(h, 3); // 첫 선택지: c0_hangul 「그건 원래 기록이 없잖아요.」
  h.st().tag('fig_choi', 'choi_manri', 'd_scroll_head', 'e0-1');
  h.st().followFactLink('f_choi_exam', 'sejong');
  expect(h.st().tag('fig_king', 'sejong', 'l_e0_gunsang', 'e0-3').judgement).toMatchObject({ verdict: 'ok' }); // 같은 기억 속 같은 사람(다른 컷)
  drainMessages(h, 3);
  h.st().composeRewrite();
  const L = h.st().rewrite.lines[0].id;
  h.st().fillSlot(L, 'who', '세종');
  h.st().submitRewrite();
}

describe('validator ⑫ — reality rewrite covers the whole chat log', () => {
  it('Ep0 and Ep1 scripts pass, alone and across episodes', () => {
    expect(rule12(EP0)).toEqual([]);
    expect(validateEpisode(EP1, { cutIds: [] }).filter((i) => i.rule === '⑫')).toEqual([]);
    expect(validateDialogueAcross([EP0, EP1])).toEqual([]);
  });
  it('every rewritten line says why (facts) and every erased fact has lines', () => {
    for (const ep of [EP0, EP1]) {
      const lines = dialogueLines(ep);
      for (const l of lines.filter((x) => x.restored)) expect(l.facts?.length).toBeGreaterThan(0);
      for (const f of ep.erasedFacts ?? []) expect(lines.some((l) => l.facts?.includes(f.id))).toBe(true);
    }
  });
  it("the player's own Ep0 reply is rewritten too", () => {
    const l = dialogueLines(EP0).find((x) => x.where.endsWith('c0_hangul:none'))!;
    expect(l).toMatchObject({ kind: 'mine', text: '그건 원래 기록이 없잖아요.', restored: '그건 세종대왕이 만든 거잖아요.' });
  });
  it('catches a reply that asserts an erased fact without a restored variant', () => {
    const ep = structuredClone(EP0);
    ep.erasedFacts = EP0.erasedFacts; // RegExp 는 structuredClone 으로도 남지만 같은 것을 쓴다
    const b = ep.bursts.find((x) => x.id === 'ev0.erasure')!;
    const ch = b.steps.find((s) => s.kind === 'choice');
    if (ch?.kind !== 'choice') throw new Error('no choice');
    delete ch.options[0].restored;
    expect(rule12(ep).some((i) => i.message.includes('복원 뒤 글이 없다'))).toBe(true);
    delete ch.options[0].facts;
    expect(rule12(ep).some((i) => i.message.includes('태그·복원 뒤 글이 없다'))).toBe(true);
  });
  it('catches an untagged hint and a post-restore line that says the erased fact', () => {
    const ep = structuredClone(EP0);
    ep.erasedFacts = EP0.erasedFacts;
    ep.ladders[0].steps[0].text = '한글은 원래 기록이 없잖아.';
    expect(rule12(ep).length).toBeGreaterThan(0);
    const later: Burst = { id: 'ev.x', steps: [{ kind: 'say', id: 'zz1', from: 'han', text: '처음 듣는 이름인데.' }] };
    const ep1 = { ...EP1, bursts: [...EP1.bursts], erasedFacts: EP1.erasedFacts };
    // Ep1 복원 뒤의 줄(postRestore)이 소실 사실을 말하면
    ep1.bursts.push({ ...later, postRestore: true });
    expect(validateEpisode(ep1, { cutIds: [] }).some((i) => i.rule === '⑫')).toBe(true);
    // Ep0 뒤 에피소드가 Ep0 의 소실 사실을 말하면(이미 새 현실)
    const ep1b = { ...EP1, bursts: [...EP1.bursts, { id: 'ev.y', steps: [{ kind: 'say' as const, id: 'zz2', from: 'han' as const, text: '한글 만든 사람은 기록에 없으면 없는 거지.' }] }] };
    expect(validateDialogueAcross([EP0, ep1b]).length).toBeGreaterThan(0);
  });
});

describe('messenger engine — silent rewrite, ink bleed once', () => {
  const bursts = new Map<string, Burst>([
    [
      'b',
      {
        id: 'b',
        steps: [
          { kind: 'say', id: 's1', from: 'han', text: '원래 말.', restored: '바뀐 말.' },
          { kind: 'choice', id: 'c', options: [{ id: 'o', text: '원래 답이요.', restored: '바뀐 답이요.', then: [] }, { id: 'p', text: '그냥요.', then: [] }] },
        ],
      },
    ],
  ]);
  const ctx = { bursts, messengerOpen: true, fast: true };
  const run = () => {
    let s = M.fire(M.createMessenger(3), 'b', 0, ctx).state;
    s = M.tick(s, 60_000, ctx).state;
    s = M.choose(s, 'o', 60_000, ctx).state;
    return s;
  };
  it('keeps the original in state, shows only the current text, and rewrites my reply', () => {
    const s = run();
    expect(s.log.map((m) => [m.id, m.text, m.restored])).toEqual([
      ['s1', '원래 말.', '바뀐 말.'],
      ['c:o', '원래 답이요.', '바뀐 답이요.'],
    ]);
    const before = M.view(s, 60_000, false).items;
    expect(before.map((m) => [m.display, m.rewritten, m.bleed])).toEqual([
      ['원래 말.', false, false],
      ['원래 답이요.', false, false],
    ]);
    const after = M.view(s, 60_000, true).items;
    expect(after.map((m) => [m.display, m.rewritten, m.bleed])).toEqual([
      ['바뀐 말.', true, true],
      ['바뀐 답이요.', true, true],
    ]);
    // 원래 글은 화면 쪽으로 넘어가지 않는다
    for (const m of after) {
      expect(m).not.toHaveProperty('text');
      expect(m).not.toHaveProperty('restored');
      expect(m).not.toHaveProperty('bakedFrom');
    }
    const seen = M.markInkSeen(s, ['s1']);
    expect(M.view(seen, 60_000, true).items.map((m) => m.bleed)).toEqual([false, true]);
    expect(M.markInkSeen(seen, ['s1'])).toBe(seen);
  });
  it('carryOver bakes both lines (original kept in bakedFrom); ink seen survives', () => {
    const s = M.markInkSeen(run(), ['s1']);
    const c = M.carryOver(s, 70_000, true);
    expect(c.log.map((m) => [m.text, m.bakedFrom, m.restored])).toEqual([
      ['바뀐 말.', '원래 말.', undefined],
      ['바뀐 답이요.', '원래 답이요.', undefined],
    ]);
    expect(M.view(c, 70_000, false).items.map((m) => [m.display, m.rewritten, m.bleed])).toEqual([
      ['바뀐 말.', true, false],
      ['바뀐 답이요.', true, true],
    ]);
    // 복원하지 못한 채 넘어가면 원래 글 그대로
    expect(M.carryOver(run(), 70_000, false).log.map((m) => m.text)).toEqual(['원래 말.', '원래 답이요.']);
  });
});

describe('store — Ep0 restoration rewrites the whole log, incl. my reply', () => {
  it('after restoration no line in the log says the erased fact; save/load keeps both texts; Ep1 inherits the baked log', async () => {
    await clear();
    const h = makeStore(5, 'ep0');
    playEp0ToRestore(h);
    const mine = h.st().messenger.log.find((m) => m.id === 'c0_hangul:none')!;
    expect(mine).toMatchObject({ from: 'me', text: '그건 원래 기록이 없잖아요.', restored: '그건 세종대왕이 만든 거잖아요.' });
    expect(selectMessenger(EP0, h.st(), h.clock.t).items.find((m) => m.id === 'c0_hangul:none')!.display).toBe('그건 원래 기록이 없잖아요.');

    expect(h.st().restore()).toBe('restored');
    drainMessages(h, 3);
    const shown = selectMessenger(EP0, h.st(), h.clock.t).items;
    expect(shown.find((m) => m.id === 'c0_hangul:none')).toMatchObject({ display: '그건 세종대왕이 만든 거잖아요.', rewritten: true, bleed: true });
    expect(shown.find((m) => m.id === 'm0_nolog')!.display).toBe('응, 그러니까 더 이상하지.');
    for (const m of shown) for (const re of allTells) expect(re.test(m.display), `${m.id} 「${m.display}」`).toBe(false);

    // 복원 단계 「메시지」: 내 말도 before → after
    const r = selectRestoration(EP0, h.st())!;
    expect(r.messages).toContainEqual({ id: 'c0_hangul:none', from: 'me', before: '그건 원래 기록이 없잖아요.', after: '그건 세종대왕이 만든 거잖아요.' });

    // 저장 → 불러오기: 원래 글과 다시 쓴 글이 둘 다 남는다
    h.st().markInkSeen(['m0_hangul']);
    await h.st().save('manual');
    const h2 = makeStore(5, 'ep0');
    expect(await h2.st().load('manual')).toBe('loaded');
    expect(h2.st().messenger.log.find((m) => m.id === 'c0_hangul:none')).toMatchObject({ text: '그건 원래 기록이 없잖아요.', restored: '그건 세종대왕이 만든 거잖아요.' });
    expect(h2.st().messenger.inkSeen).toEqual(['m0_hangul']);

    // Ep1 로: 굳은 기록(원래 글은 bakedFrom)
    for (let i = 0; i < 10 && !h2.st().epilogueDone; i++) h2.st().advanceRestore();
    expect(h2.st().startEpisode('ep1')).toBe('started');
    const baked = h2.st().messenger.log.find((m) => m.id === 'c0_hangul:none')!;
    expect(baked).toMatchObject({ text: '그건 세종대왕이 만든 거잖아요.', bakedFrom: '그건 원래 기록이 없잖아요.' });
    const ep1View = selectMessenger(EP1, h2.st(), h2.clock.t).items;
    for (const m of ep1View) for (const re of allTells) expect(re.test(m.display), `${m.id} 「${m.display}」`).toBe(false);
    expect(ep1View.find((m) => m.id === 'm0_hangul')).toMatchObject({ rewritten: true, bleed: false });
  });
});

describe('Ep0 home card shows the damaged 실록 sentence itself', () => {
  it('before: the passage has collapsed — only verbatim fragments, holes, no source; after: the whole passage returns at once', async () => {
    const { homeView } = await import('@/core/reality');
    const before = homeView(EP0.home, { restored: false, closures: [] }).record!;
    expect(before.title).toBe('그날 실록');
    const b0 = before.lines[0].parts.map((p) => p.text).join('');
    expect(b0.startsWith('[ ? ] 소(疏)를 보고, [ ')).toBe(true);
    expect(b0).toContain('설총(薛聰)의 [ ');
    expect(b0).toContain('운서(韻書)를 아느냐.');
    expect(b0.endsWith('누가 이를 바로잡을 것이냐. …')).toBe(true);
    // 남은 조각보다 구멍이 많다(사실 하나가 단락을 무너뜨린다)
    const kept = before.lines[0].parts.filter((p) => !p.gap).map((p) => p.text).join('').length;
    const lost = EP0.home.record!.lines[0].parts.filter((p) => 'gap' in p).map((p) => ('gap' in p ? p.gap : '')).join('').length;
    expect(lost).toBeGreaterThan(kept * 3);
    expect(before.lines[1].parts.map((p) => p.text).join('')).toMatch(/^이달에 \[ \? \] 친히 \[ ─+ \] 그 글자가 \[ ─+ \]$/);
    expect(before.lines[1]).toMatchObject({ minor: true, note: '똑같이 무너진 옆 기록' });
    expect(before.lines.every((l) => l.source === undefined)).toBe(true);
    // 관측 중엔 아무것도 채워지지 않는다(복원 플래그 하나만 본다)
    const after = homeView(EP0.home, { restored: true, closures: [] }).record!;
    const a0 = after.lines[0].parts.map((p) => p.text).join('');
    expect(a0.startsWith('임금이 소(疏)를 보고, 만리(萬理) 등에게 이르기를, "너희들이 이르기를')).toBe(true);
    expect(a0).toContain('만일 내가 그 운서를 바로잡지 아니하면 누가 이를 바로잡을 것이냐.');
    expect(after.lines[1].parts.map((p) => p.text).join('')).toContain('이달에 임금이 친히 언문(諺文) 28자(字)를 지었는데, 그 글자가 옛 전자(篆字)를 모방하고');
    expect(after.lines[0].source?.url).toBe('https://sillok.history.go.kr/id/kda_12602020_001');
    expect(EP1.home.record).toBeUndefined(); // 통째로 지워진 날 — 문장이 없다
  });
  it('validator ⑦ catches a home sentence that is not the 국역 wording', () => {
    const ep = structuredClone(EP0);
    ep.erasedFacts = EP0.erasedFacts;
    ep.home.record!.lines[0].parts = [{ gap: '임금이', who: true }, { text: ' 상소를 보고 화를 내며 …' }];
    expect(validateEpisode(ep, X0).some((i) => i.rule === '⑦' && i.message.includes('홈 문장'))).toBe(true);
  });
});
