/// <reference types="vite/client" />
import { indexContent } from '@/core/content';
import { inWindow, npcPoseAt } from '@/core/observation';
import { normalizeQuery, searchIndex } from '@/core/search';
import { checkState } from '@/core/terminal';
import type { DeductionSubmission } from '@/core/types';
import { allGrants, validateContent } from '@/core/validate';
import { content, modules } from '@/data';
import { EPISODE_1, NOTEBOOK_MARGINS } from '@/data/script';
import { MAPS, isWalkableTile } from '@/data/world/maps';
import {
  createGameStore,
  selectApps,
  selectCodexFields,
  selectInbox,
  selectMemos,
  selectNotebookDiffs,
  selectNpcRoute,
  selectRecord,
  selectRecordActs,
  selectRecordLedger,
  selectRestorations,
  selectRewrittenMessages,
  selectTimelineTicks,
  selectTutorial,
  selectYearCards,
  selectYearPreview,
  type GameStore,
} from '@/store/gameStore';

const idx = indexContent(content);
const tl = idx.timelines.tl_obs001!;

/** 스토어 플레이 도우미 */
function player(store: GameStore) {
  const s = () => store.getState();
  return {
    s,
    search(q: string) {
      const r = s().search(q);
      expect(r.status, q).toBe('ok');
      return r;
    },
    /** 칩만으로 검색(모바일 탭 전용) */
    chip(term: string) {
      expect(s().terms, `chip '${term}'`).toContain(term);
      return s().search(term);
    },
    at(minute: number, hotspotTarget: string) {
      s().scrubObservation(minute);
      const r = s().tapHotspot(`hs_${hotspotTarget}`);
      expect(r, `${hotspotTarget}@${minute}`).not.toBeNull();
      return r!;
    },
    phrase(sourceId: string, phraseId: string) {
      expect(s().openSource(sourceId), `source ${sourceId} in library`).toBe(true);
      return s().registerPhrase(sourceId, phraseId);
    },
    submit(sub: DeductionSubmission) {
      return s().submitDeduction(sub).verdict;
    },
  };
}

describe('terminal content — registry', () => {
  it('validates with zero errors and zero warnings', () => {
    const r = validateContent(content, { historical: modules.historical });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('every evidence card is obtainable from a viewer hotspot, search, phrase or message', () => {
    const got = new Set<string>();
    for (const { grants } of allGrants(content)) grants.evidence?.forEach((e) => got.add(e.id));
    for (const ev of content.evidence) expect(got.has(ev.id), ev.id).toBe(true);
    // 사라진 걷기 오브젝트가 남아 있지 않다
    expect(content.worldObjects.every((o) => o.sceneId === 'obs001')).toBe(true);
    expect(Object.keys(MAPS)).toEqual(['obs001']);
  });

  it('every collection entry is discoverable', () => {
    const granted = new Set<string>();
    for (const { grants } of allGrants(content)) grants.collect?.forEach((c) => granted.add(c.entryId));
    for (const d of content.deductions)
      for (const r of [...d.rewards.confirmed, ...(d.rewards.partial ?? [])]) if (r.type === 'collection') granted.add(r.entryId);
    for (const c of content.collection) expect(granted.has(c.id), c.id).toBe(true);
  });

  it('every hotspot is reachable in the timeline and every NPC stands on walkable tiles', () => {
    for (const h of tl.hotspots) {
      const minutes = Array.from({ length: tl.end - tl.start + 1 }, (_, i) => tl.start + i);
      expect(minutes.some((m) => inWindow(m, h.windows)), h.id).toBe(true);
      if (h.kind === 'npc') {
        const npc = idx.npcs[h.targetId]!;
        for (const w of npc.schedule) expect(isWalkableTile(MAPS.obs001, w.x, w.y), `${npc.id}@${w.time}`).toBe(true);
        // 증거를 주는 대사는 그 구간에 인물이 화면에 있다
        for (const l of npc.dialogue.filter((x) => x.grants?.evidence))
          expect(minutes.some((m) => inWindow(m, l.at) && npcPoseAt(npc, m)), `${npc.id}#${l.id}`).toBe(true);
      }
    }
  });

  it('the first viewer hotspot is in frame at the start time (World 1-1)', () => {
    const clerk = npcPoseAt(idx.npcs.npc_clerk!, tl.initial)!;
    expect(Math.abs(clerk.x - tl.camera.x)).toBeLessThanOrEqual(4);
    expect(Math.abs(clerk.y - tl.camera.y)).toBeLessThanOrEqual(3);
    expect(tl.meta.find((m) => m.label === '연도')!.value).toBe('####');
  });

  it('the first colleague message shows the first search term; the cold-open note shows its smudged word', () => {
    const first = content.messages.find((m) => m.id === 'm_c_01')!;
    for (const t of first.grants!.terms!) expect(first.text).toContain(t);
    const scan = content.messages.find((m) => m.id === 'm_sys_scan')!;
    expect(scan.grants!.notebook![0]!.text).toContain(scan.grants!.terms![0]!);
  });

  it('erased world: restored articles are verified, unreachable before their shift, and altered records stay fictional', () => {
    const restored = content.shifts.flatMap((sh) => sh.restores);
    expect(restored.filter((r) => r.kind !== 'record').map((r) => r.id).sort()).toEqual(
      ['evt_muo_sahwa', 'src_house_search', 'src_proclaim', 'src_sacho_order', 'src_verdict'].sort(),
    );
    for (const r of restored.filter((x) => x.kind === 'source')) {
      const src = idx.sources[r.id]!;
      expect(src.provenance).toBe('verified');
      expect(src.sources!.some((x) => x.url.startsWith('https://sillok.history.go.kr/'))).toBe(true);
    }
    for (const rec of content.records.filter((r) => r.altered)) {
      expect(rec.provenance).toBe('fictional');
      expect(Object.values(modules.historical).flat().some((x) => (x as { id: string }).id === rec.id)).toBe(false);
    }
    // 복원된 사람·사건 서술은 말소된 세계에서 보이는 인물 요약에 없다
    for (const per of content.persons) expect(per.summary).not.toMatch(/무오|사화|처형|능지|부관참시|파면/);
    // 모든 기록하기 문장은 검증된 문장
    for (const a of content.acts) expect(a.provenance).toBe('verified');
  });

  it('validator rejects broken reality data', () => {
    const codes = (c: typeof content) => validateContent(c).errors.map((e) => e.code);
    let c = structuredClone(content);
    c.shifts[0]!.messageRewrites.push({ messageId: 'ghost', newText: 'x' });
    expect(codes(c)).toContain('missing_ref');
    c = structuredClone(content);
    c.records.find((r) => r.altered)!.provenance = 'verified';
    expect(codes(c)).toContain('altered_not_fictional');
    c = structuredClone(content);
    c.searchEntries.find((e) => e.id === 'se_kim_ilson')!.results.push({ kind: 'source', id: 'src_verdict' });
    expect(codes(c)).toContain('erased_reachable');
    c = structuredClone(content);
    c.shifts = c.shifts.filter((x) => x.id !== 'shift_order');
    expect(codes(c)).toEqual(expect.arrayContaining(['no_article_unrestorable', 'missing_ref']));
    c = structuredClone(content);
    c.acts[0]!.provenance = 'fictional';
    expect(codes(c)).toContain('act_unverified');
  });

  it('message replies never set puzzle or unlock flags', () => {
    const forbidden = /^(ded_|f_|obs|app_|research_|prologue_|archive_)/;
    for (const m of content.messages) for (const c of m.choices ?? []) for (const f of c.setsFlags ?? []) expect(f).not.toMatch(forbidden);
  });

  it('phrases quote verified excerpts verbatim', () => {
    for (const p of content.phrases) {
      const src = idx.sources[p.sourceId]!;
      expect(src.provenance).toBe('verified');
      expect(src.excerpt!.includes(p.text), p.id).toBe(true);
    }
  });

  it('chip terms all hit the index; normalization handles spacing and brackets', () => {
    expect(searchIndex(content.searchEntries, '『성종 대왕』 실록').matches.map((m) => m.entry.id)).toEqual(
      expect.arrayContaining(['se_sillokcheong', 'se_myoho']),
    );
    expect(searchIndex(content.searchEntries, '經國大典').matches[0]!.entry.id).toBe('se_gyeongguk');
    expect(searchIndex(content.searchEntries, '김일손의 사초를 모두').matches[0]!.entry.id).toBe('se_sacho_order');
    expect(searchIndex(content.searchEntries, '무오█화').matches[0]!.entry.id).toBe('se_muo');
    expect(searchIndex(content.searchEntries, '조의제').matches[0]).toMatchObject({ match: 'prefix' });
    expect(searchIndex(content.searchEntries, '정합성 보정', (e) => !e.requires).status).toBe('unknown'); // 보정 전에는 색인에 없다
    expect(normalizeQuery(' 「김 일손」 ')).toBe('김일손');
  });
});

describe('terminal content — tutorial hints never solve puzzles', () => {
  const ANSWERS = [/\d{4}/, /이극돈|극돈|李克/, /무오/, /사화/, /연산/, /사초 문제/, /왕이 그 사초를 직접/, /1498/, /능지|처형|조의제문/];
  const texts: [string, string][] = [
    ...content.tutorial.flatMap((t) => [[t.id, t.coach] as [string, string], ...t.hints.map((h): [string, string] => [t.id, h])]),
    ...content.help.flatMap((h) => h.lines.map((l): [string, string] => [h.id, l])),
    ...NOTEBOOK_MARGINS.map((m): [string, string] => [m.id, m.text]),
    ...EPISODE_1.quests.flatMap((q) => q.objectives).map((o): [string, string] => [o.id, `${o.text} ${o.hint ?? ''}`]),
    ...content.links.map((l): [string, string] => [l.id, `${l.missText ?? ''} ${l.text}`]),
    ...content.evidence.flatMap((e) => e.levels.flatMap((lv) => (lv.time?.feedback ? [[e.id, lv.time.feedback] as [string, string]] : []))),
  ];
  it.each(texts)('%s: %s', (_id, text) => {
    for (const re of ANSWERS) expect(text).not.toMatch(re);
  });
  it('causal answer nodes never appear in hints', () => {
    const d = idx.deductions.ded_cause_001!;
    if (d.kind !== 'causal') throw new Error();
    for (const id of d.chain) {
      const node = d.nodes.find((n) => n.id === id)!.text;
      for (const [, t] of texts) expect(t.includes(node.slice(0, 10))).toBe(false);
    }
  });
  it('every step has 3 tiers and a one-line coach mark', () => {
    for (const t of content.tutorial) {
      expect(t.hints).toHaveLength(3);
      expect(t.coach.length).toBeLessThanOrEqual(45);
    }
  });
});

describe('terminal content — full episode through the store (tap-only, chips)', () => {
  it('cold open → search → messenger → viewer → board → erasure → year → link → record → shifts → cause → epilogue', () => {
    const store = createGameStore(content);
    const p = player(store);
    const { s } = p;

    // B0 콜드 오픈: 손 노트 하나뿐. 어젯밤 내가 쓴 단어.
    expect(selectApps(s())).toEqual(['notebook']);
    expect(selectTutorial(s())!.step.id).toBe('tut_cold');
    expect(s().notebook.question.find((n) => n.id === 'note_cold')!.text).toBe('무오█화 — 계속 조사');
    expect(s().openApp('search')).toBe(false);
    s().openApp('notebook');
    expect(selectApps(s())).toEqual(['notebook', 'search']); // 앱이 하나씩 설치된다
    const word = p.chip('무오█화');
    expect(word.status).toBe('no_article');
    expect(word.message).toBe('그런 단어 없음.');
    expect(s().search('무오').status).toBe('no_article');
    expect(s().search('무오사화').status).toBe('no_article');
    expect(selectApps(s())).toEqual(['notebook', 'search', 'messenger']);

    // B1 메신저
    s().openApp('messenger');
    expect(selectInbox(s(), content, 'colleague')[0]!.message.text).toContain('사인 없는 졸년 기록, 옛날엔 흔해');
    s().readMessage('m_c_01');

    // B2 원인 없는 죽음
    const first = p.chip('김일손');
    expect(first.status).toBe('ok');
    expect(first.hits[0]!.results).toEqual(expect.arrayContaining([{ kind: 'record', id: 'rec_alt_kim_ilson' }]));
    const alt = selectRecord(s(), 'rec_alt_kim_ilson')!;
    expect(alt.provenance).toBe('fictional');
    expect(alt.fields.find((f) => f.key === 'cause')!.value).toBe('기록 없음');
    expect(s().flags.prologue_anomaly).toBe(true);
    p.chip('권오복'); // 같은 달의 두 사람
    expect(s().evidence.ev_db_deaths).toBe(0);
    expect(s().search('타임머신').status).toBe('unknown'); // 장난스러운 실패, 벌점 없음

    // B3·B4 답장 → 탁영금 → 관측 지점 + 규칙 한 줄
    s().chooseReply('m_c_02', 'ch_three');
    expect(selectInbox(s(), content, 'colleague').map((i) => i.message.id)).toEqual(expect.arrayContaining(['m_c_03a', 'm_c_04']));
    p.chip('탁영금');
    expect(s().flags.obs_link_001).toBe(true);
    expect(s().inbox).toContain('m_dev_rule');
    expect(selectApps(s())).toContain('viewer');

    // B5~8 관측
    expect(s().openApp('viewer')).toBe(true);
    expect(s().startObservation()).toBe(true);
    expect(selectApps(s())).not.toContain('board');
    p.at(480, 'npc_clerk');
    p.at(480, 'obs_store_sacho');
    p.at(480, 'npc_red_official');
    expect(p.at(500, 'npc_messenger').gained).toEqual([]);
    expect(p.at(620, 'npc_young_official').lines.map((l) => l.text).join()).toContain('안쪽 방의 꾸러미');
    p.at(650, 'obs_hall_desk_scribe');
    p.at(750, 'npc_young_official');
    p.at(800, 'npc_clerk');
    const ticks = selectTimelineTicks(s());
    expect(ticks.some((t) => t.minute === 840 && t.kind === 'speech' && t.targetIds.includes('npc_messenger'))).toBe(true);
    expect(selectNpcRoute(s(), 'npc_messenger')!.points.map((x) => x.minute)).toEqual([480, 840, 960]);
    const order = p.at(845, 'npc_messenger');
    expect(order.lines[0]!.provenance).toBe('verified');
    p.at(850, 'obs_hall_desk_red');
    p.at(850, 'npc_blue_official');
    const sealing = p.at(930, 'npc_red_official');
    expect(s().flags.f_saw_sealing).toBe(true);
    expect(sealing.lines.map((l) => l.text).join()).not.toContain('앞장서');
    p.at(1000, 'npc_blue_official');
    expect(p.at(1000, 'npc_red_official').label).toBe('미확인 관료');
    s().endObservation();
    expect(selectApps(s())).toEqual(['notebook', 'search', 'messenger', 'viewer', 'board']);

    // B8 본 것이 실록에 없다
    const none = p.chip('김일손의 사초');
    expect(none.status).toBe('no_article');
    expect(none.message).toContain('해당 기사 없음');
    expect(none.hits.find((h) => h.entryId === 'se_sacho_order')!.results).toEqual([]);
    expect(s().evidence.ev_author_alive).toBe(1); // 그 사관의 졸년이 끝을 막는다
    expect(s().openSource('src_sacho_order')).toBe(false); // 말소된 기사
    expect(selectMemos(s()).map((m) => m.id)).toContain('memo_order');
    expect(s().notebook.observed.some((n) => n.id === 'note_no_article')).toBe(true);
    s().chooseReply('m_c_05', 'ch_saw');
    expect(s().inbox).toContain('m_c_06a');

    // B9 첫 판정(인물) — 실패해도 무료. 그 밤, 말소(보정)
    expect(p.submit({ kind: 'person', deductionId: 'ded_person_001', candidateId: 'per_kim_ilson', evidenceIds: ['ev_unknown_official', 'ev_veteran'] })).toBe('wrong');
    expect(s().corrections).toEqual(['corr_001']);
    expect(selectMemos(s()).map((m) => m.id)).not.toContain('memo_order'); // 메모가 사라졌다
    expect(s().notebook.observed.some((n) => n.id === 'note_no_article')).toBe(true); // 손 노트는 그대로
    expect(s().recentRewrites.some((r) => r.tone === 'erase' && r.kind === 'memo')).toBe(true);
    s().ackRewrites();
    expect(s().inbox).toContain('m_c_07');
    expect(p.submit({ kind: 'person', deductionId: 'ded_person_001', candidateId: 'per_yi_geukdon', evidenceIds: ['ev_unknown_official', 'ev_veteran'] })).toBe('confirmed');
    expect(s().inspectExhibit('ex_person_register')!.lines.join()).not.toMatch(/비행|사화/);
    expect(s().inspectExhibit('ex_red_desk')).not.toBeNull();
    expect(s().inspectExhibit('ex_shelf_sources')).toBeNull(); // 복원 전
    // 말소된 도감 필드는 단계와 상관없이 숨는다
    expect(selectCodexFields(s(), 'col_per_kim_ilson').map((f) => f.key)).not.toContain('sacho');

    // B11 원문 대조 권한
    expect(s().flags.source_access).toBeFalsy();
    s().readMessage('m_c_07');
    s().chooseReply('m_c_07', 'ch_insist');
    expect(s().flags.source_access).toBe(true);

    // B12 들은 말 → 원문 → 구절(검색 앱 안의 원문 보기)
    for (const t of ['성종대왕', '성종대왕 실록', '집에 둔 사초', '조의제문', '經國大典', '세조대왕 실록']) p.chip(t);
    expect(s().evidence.ev_sillokcheong).toBe(1);
    expect(s().evidence.ev_jouijemun).toBe(1);
    expect(p.phrase('src_compile_order', 'ph_compile').status).toBe('registered');
    expect(s().ui.app).toBe('search');
    expect(p.phrase('src_myoho', 'ph_myoho_seong').status).toBe('registered');
    expect(p.phrase('src_myoho', 'ph_myoho_daehaeng').status).toBe('registered');
    p.chip('대행왕');
    expect(s().inspectExhibit('ex_daehaengwang')).not.toBeNull();

    // B13 연도(짧은 중간 퍼즐): 부분 → 轉 성종 재위 함정 → 카드 겹치기 → 확정
    const Y = (from: number, to: number, evidenceIds: string[]) =>
      p.submit({ kind: 'year', deductionId: 'ded_year_001', from, to, evidenceIds });
    const cards = selectYearCards(s());
    expect(cards.find((c) => c.id === 'ev_myoho')).toMatchObject({ shape: 'lower', verified: true });
    expect(cards.find((c) => c.id === 'ev_author_alive')).toMatchObject({ shape: 'upper' });
    expect(cards.every((c) => !c.feedback || !/\d{4}/.test(c.feedback))).toBe(true);
    expect(selectYearPreview(s(), ['ev_myoho', 'ev_author_alive']).decisive).toEqual({ from: 1495, to: 1498 });
    expect(Y(1495, 1498, ['ev_myoho', 'ev_sillokcheong', 'ev_author_alive'])).toBe('partial');
    expect(Y(1469, 1494, ['ev_myoho'])).toBe('wrong');
    expect(s().linkEvidence(['ev_royal_order', 'ev_lawbook']).status).toBe('no_link');
    const link = s().linkEvidence(['ev_db_deaths', 'ev_royal_order']);
    expect(link.status).toBe('linked');
    expect(s().evidence.ev_same_month).toBe(0);
    expect(Y(1498, 1498, ['ev_same_month', 'ev_author_alive'])).toBe('confirmed');

    // 복원은 자동이 아니다: 손으로 기록해야 한다
    expect(s().shifts).toEqual([]);
    expect(selectRecordActs(s()).map((a) => a.act.id)).toEqual(['act_order']);
    expect(s().recordFact('act_person').status).toBe('not_ready');
    const before01 = selectInbox(s(), content, 'colleague').find((i) => i.message.id === 'm_c_06a')!.message.text;
    const rec = s().recordFact('act_order');
    expect(rec).toMatchObject({ status: 'recorded', shiftId: 'shift_order' });

    // 첫 현실 이동: 세계는 원래부터 알고 있었다
    expect(s().pendingDiffPageId).toBe('shift_order');
    expect(s().recentRewrites.some((r) => r.tone === 'restore' && r.kind === 'message' && r.targetId === 'm_c_06a')).toBe(true);
    const now01 = selectInbox(s(), content, 'colleague').find((i) => i.message.id === 'm_c_06a')!.message.text;
    expect(now01).toContain('실록에 그대로 있는 기사');
    expect(selectRewrittenMessages(s()).m_c_06a!.original).toBe(before01); // 연필 표시: 어제는 이렇게 말했었다
    expect(s().notebook.verified.find((n) => n.id === 'nd_order_search')!.before).toContain('해당 기사 없음');
    expect(selectNotebookDiffs(s())[0]!.shiftId).toBe('shift_order');
    const found = p.chip('김일손의 사초');
    expect(found.status).toBe('ok'); // 이제 평범한 결과(표식 없음)
    expect(found.hits[0]!.noArticle).toBe(false);
    expect(found.hits[0]!.results).toEqual(expect.arrayContaining([{ kind: 'source', id: 'src_sacho_order' }]));
    expect(s().inbox).toEqual(expect.arrayContaining(['m_sys_sync_order', 'm_c_10']));
    expect(selectInbox(s(), content, 'colleague').find((i) => i.message.id === 'm_c_10')!.message.text).toContain('다 아는 거잖아');
    expect(p.phrase('src_sacho_order', 'ph_order').status).toBe('registered');
    expect(p.phrase('src_sacho_order', 'ph_six').status).toBe('registered');
    expect(s().inspectExhibit('ex_shelf_sources')!.exhibit.restoredBy).toBe('shift_order');
    s().ackDiffPage();
    expect(s().pendingDiffPageId).toBeNull();

    // 두 번째 기록: 당상
    expect(s().recordFact('act_person').status).toBe('recorded');
    expect(selectRecord(s(), 'rec_alt_yi_geukdon')!.provenance).toBe('verified');
    expect(selectCodexFields(s(), 'col_per_kim_ilson').map((f) => f.key)).toContain('sacho');
    expect(s().inspectExhibit('ex_register_restored')).not.toBeNull();

    // B14 인과(봉우리): 틀린 화살표 → 빠진 고리 → 확정
    const C = (links: { from: string; to: string; evidenceIds: string[] }[]) =>
      p.submit({ kind: 'causal', deductionId: 'ded_cause_001', links });
    expect(C([{ from: 'n_plague', to: 'n_deaths', evidenceIds: ['ev_db_deaths'] }])).toBe('wrong');
    expect(C([{ from: 'n_jouijemun', to: 'n_order', evidenceIds: ['ev_jouijemun', 'ev_royal_order'] }])).toBe('undetermined');
    expect(
      C([
        { from: 'n_jouijemun', to: 'n_order', evidenceIds: ['ev_jouijemun', 'ev_royal_order'] },
        { from: 'n_order', to: 'n_deaths', evidenceIds: ['ev_same_month'] },
      ]),
    ).toBe('confirmed');
    expect(s().flags.restored_event).toBeFalsy();
    expect(s().recordFact('act_cause').status).toBe('recorded');

    // 세 번째 현실 이동: 무오사화
    const m01 = selectInbox(s(), content, 'colleague').find((i) => i.message.id === 'm_c_01')!.message.text;
    expect(m01).toContain('무오사화 때 화를 입은 사관이야. 그걸 왜 또 봐?');
    expect(selectRewrittenMessages(s()).m_c_01!.original).toContain('사인 없는 졸년 기록, 옛날엔 흔해');
    const kim = selectRecord(s(), 'rec_alt_kim_ilson')!;
    expect(kim.provenance).toBe('verified');
    expect(kim.fields.find((f) => f.key === 'cause')!.value).toContain('능지처사');
    const muo = s().search('무오사화');
    expect(muo.status).toBe('ok');
    expect(muo.hits[0]!.results[0]).toEqual({ kind: 'event', id: 'evt_muo_sahwa' });
    expect(s().notebook.verified.find((n) => n.id === 'nd_cold')).toMatchObject({ before: '무오█화 — 계속 조사' });
    expect(selectRestorations(s()).map((r) => [r.shiftId, r.stamp])).toEqual([
      ['shift_order', '복원'],
      ['shift_person', '복원'],
      ['shift_cause', '복원'],
    ]);
    const ledger = selectRecordLedger(s());
    const altRow = ledger.find((r) => r.id === 'rec_alt_kim_ilson')!;
    expect(altRow).toMatchObject({ originalBadge: '변조', currentBadge: '검증', restored: true });
    expect(selectCodexFields(s(), 'col_evt_muo_sahwa').length).toBeGreaterThan(0);

    // 에필로그
    expect(s().inbox).toEqual(expect.arrayContaining(['m_ep_01', 'm_ep_02', 'm_ep_03', 'm_ep_04', 'm_ep_05', 'm_ep_06', 'm_arc_01']));
    for (const id of ['m_ep_01', 'm_ep_02', 'm_ep_03', 'm_ep_04']) expect(idx.messages[id]!.provenance).toBe('verified');
    expect(idx.messages.m_ep_06!.text).toContain('그걸 모르는 사람이 어디 있어');
    expect(s().notebook.observed.find((n) => n.id === 'note_only_me')!.text).toBe('나만 기억한다. 바뀌기 전을.');

    // B15 기록관(손 노트 탭) → 예고
    for (const id of ['ex_center', 'ex_takyeong', 'ex_timeline']) expect(s().inspectExhibit(id), id).not.toBeNull();
    expect(s().inbox).toEqual(expect.arrayContaining(['m_teaser_01', 'm_teaser_02', 'm_teaser_03']));

    // 결과
    const discovered = Object.values(s().collection).filter((v) => v >= 1).length;
    expect(discovered).toBe(content.collection.length);
    for (const o of EPISODE_1.quests.flatMap((q) => q.objectives).filter((x) => !x.optional)) {
      const ok = checkState(s(), o.doneWhen.state) && discovered >= (o.doneWhen.minCollectionDiscovered ?? 0);
      expect(ok, o.id).toBe(true);
    }
    expect(s().notebook.question.every((q) => ['q_anomaly', 'q_next', 'q_correction', 'note_cold'].includes(q.id) || q.resolved)).toBe(true);
    expect(selectTutorial(s())).toBeNull();
  });

  it('missing the correction reply still opens source access after enough searching (no soft-lock)', () => {
    const store = createGameStore(content);
    const p = player(store);
    const { s } = p;
    s().openApp('notebook');
    p.chip('무오█화');
    p.chip('김일손');
    for (let i = 0; i < 3; i++) s().search('김일손'); // 답장을 고르지 않아도 거문고 이야기가 온다
    p.chip('탁영금');
    s().startObservation();
    p.at(480, 'npc_clerk');
    s().endObservation();
    expect(s().corrections).toEqual([]);
    while (s().stats.searches < 14) s().search('성종대왕');
    expect(s().inbox).toContain('m_c_05'); // 그 전교를 검색하지 않아도 대화는 온다
    expect(s().corrections).toEqual(['corr_001']);
    expect(s().flags.source_access).toBeFalsy();
    while (s().stats.searches < 20) s().search('김일손');
    expect(s().flags.source_access).toBe(true);
  });

  it('re-observation is allowed and grants nothing twice', () => {
    const store = createGameStore(content);
    const p = player(store);
    store.getState().openApp('notebook');
    p.chip('무오█화');
    p.chip('김일손');
    store.getState().chooseReply('m_c_02', 'ch_fine');
    p.chip('탁영금');
    store.getState().startObservation();
    expect(p.at(480, 'npc_clerk').gained.length).toBeGreaterThan(0);
    store.getState().endObservation();
    expect(store.getState().startObservation()).toBe(true);
    expect(store.getState().obsMinute.tl_obs001).toBe(480);
    expect(p.at(480, 'npc_clerk').gained).toEqual([]);
  });

  it('save → load keeps the shifted reality and the player-only memory', async () => {
    const { clear } = await import('idb-keyval');
    await clear();
    const store = createGameStore(content);
    const s = () => store.getState();
    s().openApp('notebook');
    s().search('무오█화');
    s().search('김일손');
    // 이야기 흐름과 무관하게 기록 조건만 세워 현실 이동을 일으킨다
    s().setFlag('ded_year_confirmed');
    expect(s().recordFact('act_order').status).toBe('recorded');
    await s().save('manual');
    s().reset();
    expect(s().shifts).toEqual([]);
    expect(await s().load('manual')).toBe(true);
    expect(s().shifts).toEqual(['shift_order']);
    expect(s().recentRewrites).toEqual([]);
    expect(s().notebook.verified.some((n) => n.id === 'nd_order_search')).toBe(true);
  });
});
