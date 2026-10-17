/**
 * Ep0 「하룻밤」 정답 경로와 멀티 에피소드 진행(DESIGN_V5 §14):
 * 넘기기(3컷) → T0a(두루마리 → 최만리) → 카드 줄 링크 「세종」 → T0b(상소 첫 줄 → 세종) → 다시 쓰기 한 줄 → 복원 → 다리 → Ep1.
 */
import { describe, expect, it } from 'vitest';
import { EP0, EP0_CUT_IDS, EP0_CUT_TIMES, EP1 } from '@/data/v5';
import { validateEpisode } from '@/core/validate';
import {
  createGameStore,
  selectCard,
  selectCut,
  selectEpisodes,
  selectEyes,
  selectHome,
  selectRecord,
  selectRestoration,
  selectRewrite,
  selectSlotOptions,
  selectTagSheet,
  selectViewer,
  type TagOutcome,
} from '@/store/gameStore';
import { drainMessages, makeStore, texts, type Harness } from './store-helpers';

const verdict = (o: TagOutcome) => (o.judgement.status === 'judged' ? o.judgement.verdict : o.judgement.reason);
const ep0 = (seed = 5) => makeStore(seed, 'ep0');
const viewAll = (h: Harness) => EP0.eyes[0].cuts.forEach((_, i) => h.st().viewCut('E0', i));

describe('validator — EP0', () => {
  it('passes every rule', () => {
    expect(validateEpisode(EP0, { cutIds: EP0_CUT_IDS, cutTimes: EP0_CUT_TIMES })).toEqual([]);
  });
  it('scale: one eye (owner known), 3 cuts, 2 tags, 1 line with 1 slot, no room / search / contradictions', () => {
    expect(EP0.eyes).toHaveLength(1);
    expect(EP0.eyes[0].openWhen).toEqual({ kind: 'given', ownerHidden: false });
    expect(EP0.cuts.map((c) => c.id)).toEqual(['e0-1', 'e0-2', 'e0-3']);
    expect(EP0.tags.map((t) => t.id)).toEqual(['T0a', 'T0b']);
    expect(EP0.sentences).toHaveLength(1);
    expect(EP0.sentences[0].segments.filter((g) => g.slot)).toHaveLength(1);
    expect(EP0.verbs).toEqual({ search: false, room: false, rewrite: true });
    expect(EP0.contradictions).toEqual([]);
  });
  it('the 세종 card does not mention the erased fact before restoration', () => {
    const sj = EP0.cards.find((c) => c.id === 'sejong')!;
    for (const f of sj.facts.filter((x) => !x.afterRestore)) expect(f.text).not.toMatch(/언문|훈민정음|한글|28자/);
    expect(sj.starter).toBeUndefined();
  });
  it('message / hint ids do not collide with Ep1 (one continuous chat log)', () => {
    type S = { kind: string; id?: string; options?: { then: S[] }[]; after?: S[] };
    const walk = (steps: S[]): string[] =>
      steps.flatMap((x) => [...(x.id ? [x.id] : []), ...(x.options ?? []).flatMap((o) => walk(o.then)), ...walk(x.after ?? [])]);
    const ids = (ep: typeof EP0) => ep.bursts.flatMap((b) => walk(b.steps as S[]));
    const a = new Set(ids(EP0));
    expect(ids(EP1).filter((x) => a.has(x))).toEqual([]);
  });
});

describe('store — Ep0 correct path', () => {
  it('fresh store starts at ep0; ep1 is locked', () => {
    const h = createGameStore({ now: () => 0, seed: 1 });
    expect(h.getState().episodeId).toBe('ep0');
    expect(selectEpisodes(h.getState()).map((e) => [e.id, e.state])).toEqual([
      ['ep0', 'current'],
      ['ep1', 'locked'],
    ]);
    expect(h.getState().startEpisode('ep1')).toBe('locked');
  });

  it('plays 넘기기 → T0a → link → T0b → rewrite → restoration → bridge → Ep1', () => {
    const h = ep0();
    expect(h.st().startEpisode()).toBe('started');
    expect(h.st().clock).toBe('22:31');
    expect(h.st().cardsFound).toEqual(['choi_manri', 'jeong_changson', 'kim_mun']);
    const home = selectHome(EP0, h.st());
    expect(home.card).toMatchObject({ code: '#C-2209', date: '####', place: '미확인', status: '빈자리' });
    expect(home.episode.verbs).toEqual({ search: false, room: false, rewrite: true });
    expect(home.buttons).toEqual(['memories']);
    expect(selectEyes(EP0, h.st())[0]).toMatchObject({ state: 'open', ownerUnknown: false, label: '하위지가 본 것' });

    // 넘기기
    expect(h.st().openEye('E0')).toMatchObject({ status: 'viewed', cutId: 'e0-1' });
    const c1 = selectCut(EP0, h.st(), 'e0-1')!;
    expect(c1.figures.filter((f) => f.tappable).map((f) => f.figureId)).toEqual(['fig_king', 'fig_choi']);
    expect(c1.bubbles[0].speaker).toBe('두루마리를 든 관원 등'); // 관측 중엔 이름 없음
    expect(c1.details.find((d) => d.id === 'd_scroll_head')!.label).toBe('두루마리 첫머리: 부제학 최만리(副提學 崔萬理)');
    viewAll(h);
    expect(selectViewer(EP0, h.st())!.canOpenRoom).toBe(false);
    expect(selectCut(EP0, h.st(), 'e0-3')!.bubbles[0].text).toBe('만일 내가 그 운서를 바로잡지 아니하면 누가 이를 바로잡을 것이냐.');

    // T0a 미끼: 직위가 다르다
    const s0 = selectTagSheet(EP0, h.st(), 'e0-1', 'fig_choi', 'jeong_changson');
    expect(s0.evidence.map((e) => e.id)).toEqual(['l_e0_memorial', 'd_scroll_head', 'd_e0_dais', 'l_e0_seolchong', 'l_e0_gunsang', 'l_e0_unseo']);
    expect(s0.roomLink).toBeNull();
    expect(s0.searchSeed).toEqual([]);
    expect(h.st().tag('fig_choi', 'jeong_changson', 'd_scroll_head', 'e0-1').judgement).toEqual({
      status: 'judged',
      verdict: 'not_pointing',
      feedback: '근거가 이 사람을 가리키지 않는다',
    });
    expect(h.st().messenger.fired).not.toContain('ev0.decoy.rank'); // 틀린 시도에는 말이 없다(힌트 사다리만)
    // T0a 정답
    const a = h.st().tag('fig_choi', 'choi_manri', 'd_scroll_head', 'e0-1');
    expect(verdict(a)).toBe('ok');
    expect(a.matchedFacts).toEqual([{ cardId: 'choi_manri', factId: 'f_choi_list' }]);
    expect(a.openedEyes).toEqual([]);

    // T0b: 세종 카드가 없다 → 최만리 카드의 줄 링크
    expect(verdict(h.st().tag('fig_king', 'sejong', 'l_e0_gunsang', 'e0-2'))).toBe('card_not_found');
    // 최만리는 그 시각 줄 맨 앞에 있었다(이미 이름 붙임) → 한 사람이 두 자리에 있을 수 없다
    expect(verdict(h.st().tag('fig_king', 'choi_manri', 'l_e0_gunsang', 'e0-3'))).toBe('contradicts');
    // 신하 카드(최만리·정창손·김문): 군상(임금)이라 자기를 부른 사람을 가리키지 않는다
    expect(verdict(h.st().tag('fig_king', 'jeong_changson', 'l_e0_gunsang', 'e0-2'))).toBe('not_pointing');
    expect(h.st().messenger.fired).not.toContain('ev0.decoy.choi'); // 틀린 시도에는 말이 없다(힌트 사다리만)
    expect(verdict(h.st().tag('fig_king', 'kim_mun', 'l_e0_gunsang', 'e0-2'))).toBe('not_pointing');
    // 상소 첫 줄(「언문을 제작하신」)은 그 사람을 가리키지만 판정 사실이 없다 — 누가 만들었는지는 지워진 사실, 다시 쓰기의 결론
    expect(verdict(h.st().tag('fig_king', 'kim_mun', 'l_e0_memorial', 'e0-1'))).toBe('not_pointing');
    // 다른 근거(왕의 말 자체)는 사실을 담지 않는다 — 찍기로 통과하지 않는다
    expect(verdict(h.st().tag('fig_king', 'kim_mun', 'l_e0_unseo', 'e0-3'))).toBe('not_pointing');
    const card = selectCard(EP0, h.st(), 'choi_manri')!;
    expect(card.facts.find((f) => f.id === 'f_choi_list')!.linkedBy).toBe('d_scroll_head');
    expect(card.facts.find((f) => f.id === 'f_choi_exam')!.links).toEqual([{ term: '세종', cardId: 'sejong', found: false }]);
    h.st().ackFx();
    expect(h.st().followFactLink('f_choi_exam', 'sejong')).toEqual({ status: 'gained', cardId: 'sejong' });
    expect(h.st().fx).toContainEqual({ kind: 'cards_gained', ids: ['sejong'], from: { kind: 'fact_link', id: 'f_choi_exam' } });
    expect(h.st().followFactLink('f_choi_exam', 'sejong').status).toBe('already');
    expect(selectCard(EP0, h.st(), 'sejong')!.facts.map((f) => f.id)).toEqual(['f_sj_def', 'f_sj_name', 'f_sj_accede']);
    // 왕의 말(사실 없음)로는 안 된다 · 상소 첫 줄이면 된다
    expect(verdict(h.st().tag('fig_king', 'sejong', 'l_e0_unseo', 'e0-3'))).toBe('not_pointing');
    expect(verdict(h.st().tag('fig_king', 'sejong', 'l_e0_memorial', 'e0-1'))).toBe('not_pointing');
    // 시트의 근거 글: 군상(君上, 임금)
    expect(selectTagSheet(EP0, h.st(), 'e0-2', 'fig_king', 'sejong').evidenceAll.find((e) => e.id === 'l_e0_gunsang')!.text).toBe(
      '너희들이 설총은 옳다 하면서 군상(君上, 임금)의 하는 일은 그르다 하는 것은 무엇이냐.',
    );
    const b = h.st().tag('fig_king', 'sejong', 'l_e0_gunsang', 'e0-2');
    expect(verdict(b)).toBe('ok');
    expect(b.matchedFacts).toEqual([
      { cardId: 'sejong', factId: 'f_sj_def' },
      { cardId: 'choi_manri', factId: 'f_choi_exam' },
    ]);
    expect(selectCut(EP0, h.st(), 'e0-3')!.figures[0]).toMatchObject({ label: '세종', named: true });

    // 기록 다시 쓰기: 한 줄이 미리 놓인다, 칸 하나
    expect(selectHome(EP0, h.st()).buttons).toEqual(['memories', 'rewrite']);
    expect(h.st().composeRewrite()).toBe('opened');
    const rw = selectRewrite(EP0, h.st());
    expect(rw.lines).toHaveLength(1);
    expect(rw.lines[0].slots).toEqual([{ kind: 'who' }]);
    expect(selectSlotOptions(EP0, h.st(), 'who').map((o) => o.value)).toEqual(['최만리', '세종', '상소를 올린 사람들']);
    const L = rw.lines[0].id;
    h.st().fillSlot(L, 'who', '상소를 올린 사람들');
    // 그날 고정률: 필수 문장 하나 → 0% / 100%. 판정 전·흐릿한 줄은 세지 않는다
    expect(selectRewrite(EP0, h.st()).fixRate).toEqual({ fixed: 0, total: 1, pct: 0 });
    let sub = h.st().submitRewrite();
    expect('results' in sub && sub.results[L]).toBe('not_recorded');
    expect(selectRewrite(EP0, h.st()).fixRate.pct).toBe(0);
    expect(h.st().messenger.fired).not.toContain('ev.write_miss'); // 틀린 시도에는 말이 없다(힌트 사다리만)
    h.st().fillSlot(L, 'who', '세종');
    sub = h.st().submitRewrite();
    expect('complete' in sub && sub.complete).toBe(true);
    expect(selectRewrite(EP0, h.st()).fixRate).toEqual({ fixed: 1, total: 1, pct: 100 });
    expect(selectHome(EP0, h.st()).fixRate.pct).toBe(100);
    expect(h.st().clock).toBe('22:52');
    const done = selectRewrite(EP0, h.st()).lines[0];
    expect(done.render.parts.map((p) => p.text).join('')).toBe('임금이 소(疏)를 보고, 만리(萬理) 등에게 이르기를, "…너희들이 설총은 옳다 하면서 군상(君上)의 하는 일은 그르다 하는 것은 무엇이냐. … 만일 내가 그 운서를 바로잡지 아니하면 누가 이를 바로잡을 것이냐. …"');
    expect(done.render.sourceUrl).toBe('https://sillok.history.go.kr/id/kda_12602020_001');

    // 복원: 홈 카드, 이웃 기록(是月), 동료의 말
    expect(selectRecord(EP0, h.st(), 'rec0_eonmun28')!.provenance).toBe('fictional');
    expect(h.st().restore()).toBe('restored');
    expect(selectHome(EP0, h.st()).card).toMatchObject({ date: '세종 26년 2월 20일', status: '고정됨' });
    const r = selectRestoration(EP0, h.st())!;
    expect(r.steps).toEqual(['home', 'monologue', 'bridge']);
    expect(r.article.parts.filter((p) => p.by === 'me').map((p) => p.sentenceId)).toEqual(['R0']);
    expect(r.asides.map((x) => x.id)).toEqual(['rec0_eonmun28']);
    expect(r.asides[0].lines[0].text).toContain('이달에 임금이 친히 언문(諺文) 28자(字)를 지었는데');
    expect(selectRecord(EP0, h.st(), 'rec0_eonmun28')!.provenance).toBe('verified');
    expect(selectCard(EP0, h.st(), 'sejong')!.facts.map((f) => f.id)).toContain('f_sj_eonmun');
    drainMessages(h, 3);
    expect(texts(h.store)).toContain('세종대왕이 만든 거 모르는 사람이 어디 있어.');
    expect(texts(h.store)).toContain('관측기: 내 관측 기록은 그대로');
    expect(texts(h.store)).toContain('07, 아까 그 건 끝났어?');
    // 한은 구멍을 기억하지 않는다(QA_STORY_R2 N1) — 다시 쓰인 줄을 알리는 끝줄은 없다
    expect(texts(h.store).some((t) => t.includes('그 칸 얘기'))).toBe(false);
    // 대화 기록 다시 쓰기(내 답 포함)는 reality-rewrite.test.ts 가 메시지를 다 받은 경로로 확인한다

    // 다리 → 23:04 → Ep1
    h.st().ackFx();
    for (let i = 0; i < 10 && !h.st().epilogueDone; i++) h.st().advanceRestore();
    expect(h.st().clock).toBe('23:04');
    expect(h.st().completed).toEqual(['ep0']);
    expect(h.st().unlocked).toContain('ep1');
    expect(h.st().fx).toContainEqual({ kind: 'episode_end', episodeId: 'ep0', next: 'ep1' });
    expect(selectHome(EP0, h.st()).nextEpisode).toBe('ep1');
    drainMessages(h, 2);
    expect(texts(h.store)).toContain('어, 하나 더 떴다.');
    const logBefore = h.st().messenger.log.length;

    expect(h.st().startEpisode('ep1')).toBe('started');
    expect(h.st().episodeId).toBe('ep1');
    expect(h.st().clock).toBe('23:04');
    expect(h.st().viewedCuts).toEqual([]);
    expect(h.st().completed).toEqual(['ep0']);
    expect(selectEpisodes(h.st()).map((e) => e.state)).toEqual(['done', 'current']);
    // 대화는 이어지고, Ep0 의 ⟲ 말풍선은 복원 뒤 글로 굳었다
    expect(h.st().messenger.log.length).toBe(logBefore);
    h.advance(10_000);
    expect(h.st().messenger.log.slice(logBefore).map((m) => m.text)[0]).toBe('07, 우선순위 낮은 건 하나 너한테 갔다.');
    expect(h.st().cardsFound).toEqual(['yi_geukdon', 'eo_segyeom', 'sin_seungseon']);
  });

  it('asks for a hint: 07 asks, the next rung of the active ladder comes at once', () => {
    const h = ep0();
    h.st().startEpisode();
    viewAll(h);
    h.st().closeViewer();
    drainMessages(h, 3, 'none');
    expect(h.st().askHint()).toEqual({ status: 'hint', ladderId: 'h0_choi' });
    drainMessages(h, 1, 'none');
    expect(texts(h.store)).toContain('어디부터 볼까요?');
    expect(texts(h.store)).toContain('모르는 얼굴 있으면 눌러 봐.');
    // 연달아 묻기는 막힌다(같은 말이 쌓이지 않는다)
    expect(h.st().askHint()).toEqual({ status: 'busy' });
    expect(texts(h.store).filter((t) => t === '어디부터 볼까요?')).toHaveLength(1);
    h.advance(31_000);
    h.st().askHint();
    drainMessages(h, 1, 'none');
    expect(texts(h.store)).toContain('두루마리에 뭐라고 적혀 있지?');
    h.st().tag('fig_choi', 'choi_manri', 'd_scroll_head', 'e0-1');
    h.advance(31_000);
    h.st().askHint();
    drainMessages(h, 1, 'none');
    expect(texts(h.store)).toContain('그 사람이 자기를 뭐라고 불렀지?');
    h.advance(31_000);
    h.st().askHint();
    drainMessages(h, 1, 'none');
    expect(texts(h.store)).toContain('최만리 카드를 펼쳐 봐.');
  });

  it('failure thresholds: two wrong tags on the presenter bring the first hint rung', () => {
    const h = ep0();
    h.st().startEpisode();
    viewAll(h);
    h.st().closeViewer();
    h.advance(21_000);
    h.st().tag('fig_choi', 'kim_mun', 'd_scroll_head', 'e0-1');
    h.advance(91_000);
    expect(h.st().hints.sent.h0_choi ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('saves v7 with the episode id and loads back into ep0', async () => {
    const { clear } = await import('idb-keyval');
    await clear();
    const h = ep0(11);
    h.st().startEpisode();
    h.st().openEye('E0');
    await h.st().save('manual');
    const h2 = makeStore(11, 'ep1');
    expect(await h2.st().load('manual')).toBe('loaded');
    expect(h2.st().episodeId).toBe('ep0');
    expect(h2.st().viewedCuts).toEqual(['e0-1']);
  });
});
