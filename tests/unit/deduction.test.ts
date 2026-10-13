// 보고서 엔진(core/report.ts) + 인물 판정(core/deduction.ts) — 실제 콘텐츠로.
import { judgePerson } from '@/core/deduction';
import { blankClues, emptyDraft, frameClues, judgeFacts, judgeReport, judgeWhen, judgeWho, type Frame, type ReportWorld } from '@/core/report';
import { idealSnapshot } from '@/core/validate';
import { content } from '@/data';
import { FACT } from '@/data/historical/facts';

const spec = content.reports[0]!;
const clue = (id: string) => content.clues.find((c) => c.id === id)!;
const frameFor = (id: string): Frame => {
  const snap = idealSnapshot(clue(id).frame!, content)!;
  return { ...snap, id: `f_${id}`, seq: 1, clueIds: frameClues(snap, content.clues) };
};
const frames = ['cl_order', 'cl_alive', 'cl_veteran', 'cl_dangsang', 'cl_objection', 'cl_bundles'].map(frameFor);
const w: ReportWorld = {
  clues: content.clues,
  frames,
  records: Object.fromEntries(content.records.map((r) => [r.id, r])),
  persons: Object.fromEntries(content.persons.map((p) => [p.id, p])),
};
const F = (id: string) => ({ kind: 'frame' as const, id: `f_${id}` });
const R = (id: string) => ({ kind: 'record' as const, id });

describe('frames → clues', () => {
  it('a frame proves what it heard and showed', () => {
    expect(frameFor('cl_order').clueIds).toContain('cl_order');
    expect(frameFor('cl_veteran').clueIds).toEqual(expect.arrayContaining(['cl_veteran', 'cl_dangsang']));
    // 붉은 관복이 화면에 없으면 귓속말은 그를 가리키지 못한다
    const snap = { ...idealSnapshot(clue('cl_veteran').frame!, content)!, visibleHotspotIds: ['hs_npc_clerk'] };
    expect(frameClues(snap, content.clues)).not.toContain('cl_veteran');
  });

  it('combo clue needs the report-wide 전교 frame', () => {
    const base = blankClues([F('cl_alive'), R('rec_alt_kim_ilson')], [], w);
    expect(base.ids).not.toContain('cl_when_pinned');
    expect(base.blocked.map((c) => c.id)).toEqual(['cl_when_pinned']);
    expect(blankClues([F('cl_alive'), R('rec_alt_kim_ilson')], ['cl_order'], w).ids).toContain('cl_when_pinned');
  });
});

describe('report blanks', () => {
  it('언제: partial by the 실록청 range; confirmed only with alive + death + 전교 somewhere', () => {
    const d = emptyDraft();
    d.when = { attachments: [R('rec_seongjong_sillok')], from: 1495, to: 1499 };
    expect(judgeWhen(spec, d, w).verdict).toBe('partial');
    d.when = { attachments: [R('rec_seongjong_sillok')], from: 1498, to: 1498 };
    expect(judgeWhen(spec, d, w).verdict).toBe('undetermined');
    d.when = { attachments: [F('cl_alive'), R('rec_alt_kim_ilson')], from: 1498, to: 1498 };
    expect(judgeWhen(spec, d, w).verdict).toBe('undetermined');
    d.what.attachments = [F('cl_order')];
    const ok = judgeWhen(spec, d, w);
    expect(ok.verdict).toBe('confirmed');
    expect(ok.implied).toEqual({ from: 1498, to: 1498 });
    d.when.from = 1497;
    d.when.to = 1497;
    expect(judgeWhen(spec, d, w).verdict).toBe('wrong');
  });

  it('누구: candidate = attached person record; facts only from frames', () => {
    const d = emptyDraft();
    d.who.attachments = [R('rec_alt_yi_geukdon')];
    expect(judgeWho(spec, d, w).verdict).toBe('undetermined'); // 기록만으로는 증명하지 않는다
    d.who.attachments = [R('rec_alt_yi_geukdon'), F('cl_dangsang')];
    const tip = judgeWho(spec, d, w);
    expect(tip.verdict).toBe('undetermined');
    expect(tip.feedback.map((f) => f.code)).toContain('missing_fact');
    d.who.attachments = [R('rec_alt_yi_geukdon'), F('cl_veteran')];
    expect(judgeWho(spec, d, w).verdict).toBe('confirmed');
    d.who.attachments = [R('rec_eo_segyeom'), F('cl_veteran')];
    expect(judgeWho(spec, d, w).verdict).toBe('wrong');
    d.who.attachments = [R('rec_alt_kim_ilson'), F('cl_veteran')];
    const contra = judgeWho(spec, d, w);
    expect(contra.verdict).toBe('wrong');
    expect(contra.feedback[0]!.code).toBe('fact_contradiction');
    d.who.attachments = [R('rec_alt_kim_ilson'), R('rec_alt_yi_geukdon')];
    expect(judgeWho(spec, d, w).feedback[0]!.message).toBe(spec.who.twoPersonsText);
  });

  it('무슨 일 / 그 결과: required, wrong and near facts', () => {
    const d = emptyDraft();
    d.what.attachments = [F('cl_bundles')];
    expect(judgeFacts('what', spec.what, d, w).verdict).toBe('wrong');
    d.what.attachments = [F('cl_objection')];
    expect(judgeFacts('what', spec.what, d, w).verdict).toBe('undetermined');
    d.what.attachments = [F('cl_order'), F('cl_bundles')];
    expect(judgeFacts('what', spec.what, d, w).verdict).toBe('confirmed');
    d.result.attachments = [R('rec_seongjong_sillok')];
    expect(judgeFacts('result', spec.result, d, w).verdict).toBe('wrong');
    d.result.attachments = [R('rec_alt_yi_geukdon')];
    expect(judgeFacts('result', spec.result, d, w).feedback[0]!.message).toContain('가장 큰 공백');
    d.result.attachments = [F('cl_order'), R('rec_alt_kwon_obok')];
    expect(judgeFacts('result', spec.result, d, w).verdict).toBe('confirmed');
  });

  it('whole report', () => {
    const d = emptyDraft();
    d.when = { attachments: [F('cl_alive'), R('rec_alt_kim_ilson')], from: 1498, to: 1498 };
    d.who.attachments = [F('cl_veteran'), R('rec_alt_yi_geukdon')];
    d.what.attachments = [F('cl_order')];
    d.result.attachments = [F('cl_order'), R('rec_alt_kim_ilson')];
    expect(judgeReport(spec, d, w).complete).toBe(true);
    expect(judgeReport(spec, emptyDraft(), w).complete).toBe(false);
  });
});

describe('judgePerson (engine)', () => {
  it('missing facts give the same answer for right and wrong candidates', () => {
    const d = { id: 'p', provenance: 'fictional' as const, kind: 'person' as const, ...spec.who };
    const ctx = { evidence: {}, persons: w.persons, owned: {} };
    for (const candidateId of ['per_yi_geukdon', 'per_eo_segyeom'])
      expect(judgePerson(d, { candidateId, evidenceIds: [] }, ctx).verdict).toBe('undetermined');
    expect(FACT.eventSejoSillok.kind).toBe('event');
  });
});
