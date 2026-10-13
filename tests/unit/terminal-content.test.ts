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
  selectInbox,
  selectMemos,
  selectRecord,
  selectTutorial,
  selectViewerFrame,
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

  it('the first message shows the first search term', () => {
    const first = content.messages.find((m) => m.id === 'm_c_01')!;
    for (const t of first.grants!.terms!) expect(first.text).toContain(t);
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
    expect(searchIndex(content.searchEntries, '조의제').matches[0]).toMatchObject({ match: 'prefix' });
    expect(searchIndex(content.searchEntries, '정합성 보정', (e) => !e.requires).status).toBe('unknown'); // 보정 전에는 색인에 없다
    expect(normalizeQuery(' 「김 일손」 ')).toBe('김일손');
  });
});

describe('terminal content — tutorial hints never solve puzzles', () => {
  const ANSWERS = [/\d{4}/, /이극돈|극돈|李克/, /무오/, /사화/, /연산/, /사초 문제/, /왕이 그 사초를 직접/, /1498/];
  const texts: [string, string][] = [
    ...content.tutorial.flatMap((t) => [[t.id, t.coach] as [string, string], ...t.hints.map((h): [string, string] => [t.id, h])]),
    ...content.help.flatMap((h) => h.lines.map((l): [string, string] => [h.id, l])),
    ...NOTEBOOK_MARGINS.map((m): [string, string] => [m.id, m.text]),
    ...EPISODE_1.quests.flatMap((q) => q.objectives).map((o): [string, string] => [o.id, `${o.text} ${o.hint ?? ''}`]),
  ];
  it.each(texts)('%s: %s', (_id, text) => {
    for (const re of ANSWERS) expect(text).not.toMatch(re);
  });
  it('answer statement text never appears in hints', () => {
    const ev = idx.deductions.ded_event_001!;
    if (ev.kind !== 'event') throw new Error();
    const answer = ev.statements.find((x) => x.id === ev.answer)!.text;
    for (const [, t] of texts) expect(t.includes(answer.slice(0, 12))).toBe(false);
  });
  it('every step has 3 tiers and a one-line coach mark', () => {
    for (const t of content.tutorial) {
      expect(t.hints).toHaveLength(3);
      expect(t.coach.length).toBeLessThanOrEqual(45);
    }
  });
});

describe('terminal content — full episode through the store (tap-only, chips)', () => {
  it('messenger → search → viewer → board → correction → reader → year → event → archive → teaser', () => {
    const store = createGameStore(content);
    const p = player(store);
    const { s } = p;

    // B1 메신저: 열린 앱은 메신저·검색뿐
    expect(selectApps(s())).toEqual(['messenger', 'search']);
    expect(selectTutorial(s())!.step.id).toBe('tut_msg');
    s().openApp('messenger');
    s().readMessage('m_c_01');

    // B2 검색 起: 메시지 속 칩
    expect(s().openApp('viewer')).toBe(false);
    const first = p.chip('김일손');
    expect(first.hits[0]!.entryId).toBe('se_kim_ilson');
    expect(s().flags.prologue_anomaly).toBe(true);
    expect(selectRecord(s(), 'rec_meta_kim_ilson')!.fields[0]!.value).toContain('0.998');
    expect(s().notebook.observed.find((n) => n.id === 'note_anomaly')!.text).toContain('0.998');
    expect(selectApps(s())).toContain('notebook');

    // 장난스러운 실패: 벌점 없음
    expect(s().search('타임머신').status).toBe('unknown');

    // B3 손 노트, B4 검색 承
    s().openApp('notebook');
    s().chooseReply('m_c_02', 'ch_smooth');
    expect(selectInbox(s(), content, 'colleague').map((i) => i.message.id)).toContain('m_c_03a');
    p.chip('탁영금');
    expect(s().flags.obs_link_001).toBe(true); // 관측 장치 메시지
    expect(selectApps(s())).toContain('viewer');

    // B5~8 관측 뷰어
    expect(s().openApp('viewer')).toBe(true);
    expect(s().startObservation()).toBe(true);
    expect(s().flags.obs001_entered).toBe(true);
    expect(selectApps(s())).not.toContain('board'); // 한 번에 하나
    p.at(480, 'npc_clerk'); // 첫 핫스팟 — 성종대왕
    expect(s().flags.f_heard_myoho).toBe(true);
    p.at(480, 'obs_store_sacho');
    p.at(480, 'npc_red_official'); // 붉은 관복 — 미확인 관료
    expect(s().flags.f_met_official).toBe(true);
    const waiting = p.at(500, 'npc_messenger');
    expect(waiting.gained).toEqual([]); // 아직 기다리는 중
    p.at(620, 'npc_young_official'); // 곳간의 젊은 관원 — 집에 둔 사초
    p.at(650, 'obs_hall_desk_scribe'); // 주인이 비운 서안 — 법전
    expect(s().flags.f_saw_lawbook).toBe(true);
    p.at(750, 'npc_young_official'); // 「조의제문」
    expect(s().flags.f_heard_jouijemun).toBe(true);
    p.at(800, 'npc_clerk'); // 세조대왕 실록
    expect(s().evidence.ev_veteran).toBe(0);
    const order = p.at(845, 'npc_messenger'); // 전교
    expect(order.lines[0]!.provenance).toBe('verified');
    expect(s().flags.f_saw_order).toBe(true);
    p.at(850, 'obs_hall_desk_red'); // 선택: 비운 서안
    p.at(850, 'npc_blue_official'); // 간언
    expect(s().evidence.ev_objection).toBe(0);
    p.at(930, 'npc_red_official'); // 봉함
    expect(s().flags.f_saw_sealing).toBe(true);
    p.at(1000, 'npc_blue_official'); // 아직 살아 있소
    expect(s().evidence.ev_author_alive).toBe(0);
    // 관측 중 이름 비공개
    expect(p.at(1000, 'npc_red_official').label).toBe('미확인 관료');
    expect(selectViewerFrame(s())!.clock).toBe('16:40');
    s().endObservation();
    expect(s().flags.obs001_returned).toBe(true);
    expect(s().ui.observation).toBeNull();

    // B9 증거 보드 起 — 인물 (사료 뷰어는 아직)
    expect(selectApps(s())).toEqual(expect.arrayContaining(['board']));
    expect(selectApps(s())).not.toContain('reader');
    expect(p.submit({ kind: 'year', deductionId: 'ded_year_001', from: 1495, to: 1498, evidenceIds: ['ev_myoho'] })).toBe(
      'undetermined',
    ); // 연도 문제는 아직 잠김
    expect(s().lastResult!.feedback[0]!.code).toBe('unknown_deduction');
    expect(
      p.submit({ kind: 'person', deductionId: 'ded_person_001', candidateId: 'per_kim_ilson', evidenceIds: ['ev_unknown_official', 'ev_veteran'] }),
    ).toBe('wrong');
    // B12 정합성 보정: 조용히
    expect(s().corrections).toEqual(['corr_001']);
    expect(selectRecord(s(), 'rec_meta_kim_ilson')!.fields[0]!.value).toContain('0.712');
    expect(selectMemos(s()).find((m) => m.id === 'memo_anomaly')!.text).toContain('0.712');
    expect(s().notebook.observed.find((n) => n.id === 'note_anomaly')!.text).toContain('0.998'); // 손 노트는 그대로
    expect(s().notebook.question.some((q) => q.id === 'q_correction')).toBe(true);
    expect(s().search('정합성 보정').hits[0]!.entryId).toBe('se_correction');

    expect(
      p.submit({ kind: 'person', deductionId: 'ded_person_001', candidateId: 'per_yi_geukdon', evidenceIds: ['ev_unknown_official', 'ev_veteran'] }),
    ).toBe('confirmed');
    expect(selectApps(s())).toContain('archive');
    expect(s().inspectExhibit('ex_person_register')).not.toBeNull();
    expect(s().inspectExhibit('ex_red_desk')).not.toBeNull(); // 선택 전시물

    // 사료 뷰어: 동료가 열어 준다(보정 메시지를 읽은 뒤)
    expect(s().flags.app_reader).toBeFalsy();
    s().readMessage('m_c_06');
    s().chooseReply('m_c_06', 'ch_insist');
    expect(s().flags.app_reader).toBe(true);
    expect(selectApps(s())).toContain('reader');

    // B13 검색 轉: 과거에서 들은 말 → 사료 → 구절
    for (const t of ['성종대왕', '성종대왕 실록', '집에 둔 사초', '조의제문', '김일손의 사초', '經國大典', '세조대왕 실록']) p.chip(t);
    expect(s().evidence.ev_sillokcheong).toBe(1);
    expect(s().evidence.ev_jouijemun).toBe(1);
    expect(s().evidence.ev_gajang).toBe(1);
    expect(s().evidence.ev_lawbook).toBe(1);
    expect(p.phrase('src_compile_order', 'ph_compile').status).toBe('registered');
    expect(p.phrase('src_myoho', 'ph_myoho_seong').status).toBe('registered');
    expect(s().evidence.ev_myoho).toBe(1);
    expect(p.phrase('src_sacho_order', 'ph_order').status).toBe('registered');
    expect(p.phrase('src_sacho_order', 'ph_six').status).toBe('registered');
    expect(p.phrase('src_sacho_order', 'ph_custom').status).toBe('registered');
    expect(p.phrase('src_verdict', 'ph_verdict').status).toBe('registered');
    expect(s().evidence.ev_author_alive).toBe(1);
    // 호기심: 대행왕
    expect(p.phrase('src_myoho', 'ph_myoho_daehaeng').status).toBe('registered');
    p.chip('대행왕');
    expect(s().inspectExhibit('ex_daehaengwang')).not.toBeNull();

    // B14 연도(주 봉우리): 承 부분 확정 → 轉 성종 재위 함정 → 結 확정
    const Y = (from: number, to: number, evidenceIds: string[]) =>
      p.submit({ kind: 'year', deductionId: 'ded_year_001', from, to, evidenceIds });
    expect(Y(1495, 1498, ['ev_myoho', 'ev_sillokcheong', 'ev_author_alive'])).toBe('partial');
    expect(Y(1469, 1494, ['ev_myoho'])).toBe('wrong');
    expect(s().lastResult!.feedback.some((f) => f.code === 'contradiction')).toBe(true);
    expect(Y(1498, 1498, ['ev_jouijemun', 'ev_author_alive', 'ev_myoho'])).toBe('confirmed');
    expect(s().inspectExhibit('ex_timeline')).not.toBeNull();

    // B15 사건(결합)
    expect(
      p.submit({ kind: 'event', deductionId: 'ded_event_001', statementId: 'st_crisis', evidenceIds: ['ev_royal_order', 'ev_six_articles'] }),
    ).toBe('confirmed');
    expect(s().inbox).toContain('m_ep_01');
    expect(s().inspectExhibit('ex_center')).not.toBeNull();
    expect(s().inspectExhibit('ex_takyeong')).not.toBeNull();
    expect(s().inspectExhibit('ex_shelf_sources')).not.toBeNull();
    expect(s().inbox).toEqual(expect.arrayContaining(['m_teaser_01', 'm_teaser_02', 'm_teaser_03']));

    // 결과
    expect(s().collection.col_art_takyeong).toBe(5);
    const discovered = Object.values(s().collection).filter((v) => v >= 1).length;
    expect(discovered).toBe(content.collection.length);
    expect(s().notebook.question.every((q) => ['q_anomaly', 'q_next', 'q_correction'].includes(q.id) || q.resolved)).toBe(true);
    for (const o of EPISODE_1.quests.flatMap((q) => q.objectives).filter((x) => !x.optional)) {
      const ok = checkState(s(), o.doneWhen.state) && discovered >= (o.doneWhen.minCollectionDiscovered ?? 0);
      expect(ok, o.id).toBe(true);
    }
    // 진행 튜토리얼은 모두 끝났다
    expect(selectTutorial(s())).toBeNull();
  });

  it('missing the correction reply still unlocks the reader after enough searching (no soft-lock)', () => {
    const store = createGameStore(content);
    const p = player(store);
    const { s } = p;
    p.chip('김일손');
    p.chip('탁영금');
    s().startObservation();
    p.at(480, 'npc_clerk');
    s().endObservation();
    expect(s().corrections).toEqual([]);
    for (let i = 0; i < 8; i++) s().search('성종대왕');
    expect(s().corrections).toEqual(['corr_001']);
    for (let i = 0; i < 4; i++) s().search('김일손');
    expect(s().flags.app_reader).toBe(true);
  });

  it('re-observation is allowed and grants nothing twice', () => {
    const store = createGameStore(content);
    const p = player(store);
    p.chip('김일손');
    p.chip('탁영금');
    store.getState().startObservation();
    expect(p.at(480, 'npc_clerk').gained.length).toBeGreaterThan(0);
    store.getState().endObservation();
    expect(store.getState().startObservation()).toBe(true);
    expect(store.getState().obsMinute.tl_obs001).toBe(480); // 마지막 시각 기억
    expect(p.at(480, 'npc_clerk').gained).toEqual([]);
  });
});
