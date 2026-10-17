import { describe, expect, it } from 'vitest';
import { hanBubblesMax, hanLineCount, HAN_LINES_MAX, validateEpisode, quotedFrom, type ValidateExtras } from '@/core/validate';
import { CUT_IDS, CUT_TIMES, EP1, KIM_ALLOWED_BURSTS, MISTRANSLATED_0711 } from '@/data/v5';
import { EP0 } from '@/data/v5/ep0';
import type { Episode } from '@/core/types';

const X: ValidateExtras = { cutIds: CUT_IDS, cutTimes: CUT_TIMES, kimAllowedBursts: KIM_ALLOWED_BURSTS, mistranslated: MISTRANSLATED_0711 };
const clone = (): Episode => structuredClone(EP1);
const rules = (ep: Episode) => validateEpisode(ep, X).map((i) => i.rule);

describe('validator — EP1 passes all 11 rules', () => {
  it('has no issues', () => {
    expect(validateEpisode(EP1, X)).toEqual([]);
  });
  it('episode scale per DESIGN_V5 §0/§4: 8 people, 4 eyes + never-opening, 20 cuts, 2 contradictions, 4 (+3) lines', () => {
    expect(EP1.figures).toHaveLength(8);
    expect(EP1.eyes.filter((e) => e.openWhen.kind !== 'never')).toHaveLength(4);
    expect(EP1.eyes.filter((e) => e.openWhen.kind === 'never')).toHaveLength(1);
    expect(EP1.cuts).toHaveLength(20);
    expect(EP1.contradictions.map((x) => x.id)).toEqual(['X1', 'X2']);
    expect(EP1.sentences.filter((s) => !s.optional)).toHaveLength(4);
    expect(EP1.sentences.filter((s) => s.optional)).toHaveLength(3);
    expect(EP1.figures.filter((f) => f.revealOnRestore)).toHaveLength(2);
  });
  it('quotedFrom checks ellipsis chunks in order', () => {
    expect(quotedFrom('가나…라마', '가나다라마')).toBe(true);
    expect(quotedFrom('라마…가나', '가나다라마')).toBe(false);
  });
});

describe('validator — catches broken content', () => {
  it('① hiding a ledger fact from a card (to fake uniqueness)', () => {
    const ep = clone();
    const hong = ep.cards.find((c) => c.id === 'hong_gwidal')!;
    hong.facts = hong.facts.filter((f) => !f.keys.includes('sillokcheong_staff'));
    hong.roomAnchored = false;
    expect(rules(ep)).toContain('①');
  });
  it('① evidence that points at several people (compiled_sejo_sillok)', () => {
    const ep = clone();
    ep.lines.find((l) => l.id === 'l_e1_2a')!.keys = ['compiled_sejo_sillok'];
    expect(validateEpisode(ep, X).some((i) => i.rule === '①' && i.message.includes('유일'))).toBe(true);
  });
  it('② a clear bubble outside the hearing radius', () => {
    const ep = clone();
    ep.cuts.find((c) => c.id === 'e4-2')!.heard[0].clarity = 'clear';
    expect(rules(ep)).toContain('②');
  });
  it('② counting slips through the 사초 더미', () => {
    const ep = clone();
    delete ep.details.find((d) => d.id === 'd_slips_five')!.occludedView;
    expect(rules(ep)).toContain('②');
  });
  it('③ contradiction winner must equal the verified sentence value', () => {
    const ep = clone();
    const l4 = ep.sentences.find((s) => s.id === 'L4')!;
    l4.segments.find((g) => g.slot?.kind === 'count')!.slot!.accepts = '5';
    expect(rules(ep)).toContain('③');
  });
  it('④ two-route rule: a required value only inside the closing eye', () => {
    const ep = clone();
    const c = ep.claims.find((x) => x.id === 'c_scope_all')!;
    c.from = ['l_order2'];
    expect(rules(ep)).toContain('④');
  });
  it('⑤ a year in an observation line', () => {
    const ep = clone();
    ep.lines.find((l) => l.id === 'l_e1_1')!.text = '1498년 꾸러미입니다.';
    expect(rules(ep)).toContain('⑤');
  });
  it('⑥ a name in a hint, a long bubble, polite 한 선임', () => {
    const ep = clone();
    ep.ladders[1].steps[0].text = '이극돈 카드 봐.';
    expect(rules(ep)).toContain('⑥');
    const ep2 = clone();
    (ep2.bursts[0].steps[3] as { text: string }).text = '야근이네요.';
    expect(rules(ep2)).toContain('⑥');
  });
  it('⑦ verified text must match the 국역; mistranslation forbidden', () => {
    const ep = clone();
    ep.lines.find((l) => l.id === 'l_order1')!.text = '김일손의 사초를 다 가져오라.';
    expect(rules(ep)).toContain('⑦');
    const ep2 = clone();
    ep2.lines.find((l) => l.id === 'l_propose')!.text = '…일손의 사초가 과연 조종조의 일에 범하여 그른 점이 있다는 것은 신들도 들어 아는 바이므로,';
    expect(rules(ep2)).toContain('⑦');
  });
  it('⑧ 홍귀달 may not be drawn remonstrating', () => {
    const ep = clone();
    ep.cuts.find((c) => c.id === 'e3-1')!.figures[0].pose = 'remonstrate';
    expect(rules(ep)).toContain('⑧');
  });
  it('⑨ the given eye never hears its owner named', () => {
    const ep = clone();
    ep.lines.find((l) => l.id === 'l_e1_1')!.text = '윤 대감, 꾸러미입니다.';
    expect(rules(ep)).toContain('⑨');
  });
  it('⑩ no evidence may point at a 「?」 figure', () => {
    const ep = clone();
    ep.lines.find((l) => l.id === 'l_e1_2b')!.refers = { figureId: 'fig_u' };
    expect(rules(ep)).toContain('⑩');
  });
  it('⑪ ban words', () => {
    const ep = clone();
    ep.lines.find((l) => l.id === 'l_e1_2a')!.text = '저 영감께선 선왕 승하하실 무렵 이조 판서셨지요.';
    expect(rules(ep)).toContain('⑪');
  });
  it('words: search underline only for data-declared search words; glosses short and present', () => {
    const ep = clone();
    ep.lines.find((l) => l.id === 'l_remon2')!.terms = ['직필']; // 어려운 말이지만 찾기어가 아니다 → 풀이만
    expect(rules(ep)).toContain('words');
    const ep2 = clone();
    ep2.glossary = [{ term: '사초', gloss: '사관이 적어 둔 기록. 실록을 엮는 바탕이 된다.' }];
    expect(rules(ep2)).toContain('words');
    const ep3 = clone();
    ep3.verbs = { ...ep3.verbs, search: false };
    expect(rules(ep3)).toContain('words');
  });
  it('⑬ 한 선임 말수 예산: 사건 하나 ≤3(복원 장면 ≤4), 에피소드 줄 상한', () => {
    expect(hanLineCount(EP0)).toBeLessThanOrEqual(HAN_LINES_MAX.ep0);
    expect(hanLineCount(EP1)).toBeLessThanOrEqual(HAN_LINES_MAX.ep1);
    for (const ep of [EP0, EP1])
      for (const b of ep.bursts) expect(hanBubblesMax(b.steps), `${ep.id} ${b.id}`).toBeLessThanOrEqual(b.id === 'ev.restore' ? 4 : 3);
    const ep = clone();
    const x1 = ep.bursts.find((b) => b.id === 'ev.x1')!;
    x1.steps = [...x1.steps, ...['하나.', '둘.', '셋.'].map((text, i) => ({ kind: 'say' as const, id: `zz${i}`, from: 'han' as const, text }))];
    expect(validateEpisode(ep, X).some((i) => i.rule === '⑬' && i.message.includes('ev.x1'))).toBe(true);
    const ep2 = clone();
    for (let i = 0; i < 12; i++)
      ep2.bursts.push({ id: `ev.pad${i}`, steps: [1, 2, 3].map((k) => ({ kind: 'say' as const, id: `pad${i}_${k}`, from: 'han' as const, text: '응.' })) });
    expect(validateEpisode(ep2, X).some((i) => i.rule === '⑬' && i.message.includes('ep1'))).toBe(true);
  });
  it('cut ids must exist in CUT_IDS', () => {
    expect(validateEpisode(EP1, { ...X, cutIds: CUT_IDS.filter((c) => c !== 'e2-3') }).map((i) => i.rule)).toContain('cut_ids');
  });
});
