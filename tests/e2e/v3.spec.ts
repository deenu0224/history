import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';

/**
 * 결록 v3 「대조」 전체 에피소드: 실제 UI 입력(탭 · 길게 누르기 · 끌기 · 핀치/확대 버튼 · 시각 막대/◀▶)만으로 끝까지.
 * __STORE__ / __VIEWER__ 는 단언과 핫스팟 화면 좌표 읽기에만 쓴다(진행을 위해 액션이나 setZoom/centerOn 을 부르지 않는다).
 * 비트: B0 부트 → 배정 → 관측 ①장소 → ②인물(F1) → ③시각(F2~F4) → ④판정 → 기각 → DB → 종결함(내 옛 보고서) → F5/F6 → 06:00 재계산
 *       → 보고서(오답 → 칸별 피드백 → 정답) → 도장 → 복원 → 에필로그/예고 → 새로고침 → 이어하기.
 */
const SHOT_DIR = process.env.E2E_SHOTS ?? '/tmp/claude-0/-home-user-history/fd8b313c-786f-59e9-875b-1190f9568f2b/scratchpad/v3e2e';
const YEAR = /(?<![\d:.#])(1[0-9]{3}|20[0-9]{2})(?![\d:.#])/;

type St = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Pt = { x: number; y: number };

test.describe.configure({ mode: 'serial' });

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) await page.screenshot({ path: `${SHOT_DIR}/FAIL-${info.project.name}.png` }).catch(() => undefined);
});

test('결록 v3: 대조 — 처음부터 끝까지 실제 입력만으로', async ({ page }, info: TestInfo) => {
  test.setTimeout(600_000);
  const proj = info.project.name;
  const touch = proj.startsWith('mobile');
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  let n = 0;
  const t0 = Date.now();
  const shot = async (name: string) => {
    n++;
    console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${name}`);
    await page.screenshot({ path: `${SHOT_DIR}/${proj}-${String(n).padStart(2, '0')}-${name}.png` });
  };
  const T = (id: string) => page.getByTestId(id);
  const store = <R,>(fn: (s: St) => R): Promise<R> =>
    page.evaluate((src) => {
      // eslint-disable-next-line no-new-func
      const f = new Function('s', `return (${src})(s)`);
      return f((window as unknown as { __STORE__: { getState(): unknown } }).__STORE__.getState());
    }, fn.toString()) as Promise<R>;
  const viewer = <R,>(fn: (v: St) => R): Promise<R> =>
    page.evaluate((src) => {
      // eslint-disable-next-line no-new-func
      const f = new Function('v', `return (${src})(v)`);
      return f((window as unknown as { __VIEWER__: unknown }).__VIEWER__);
    }, fn.toString()) as Promise<R>;

  // ───────── 입력 프리미티브(전부 실제 포인터/터치 이벤트) ─────────
  const tx = (type: string, pts: Pt[]) =>
    cdp!.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
  const centerOf = async (l: Locator): Promise<Pt> => {
    await l.scrollIntoViewIfNeeded();
    const b = (await l.boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const tapPt = async (p: Pt) => (touch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));
  const tap = async (l: Locator) => {
    await l.scrollIntoViewIfNeeded();
    if (touch) await l.tap();
    else await l.click();
  };
  /** 길게 누르기: ms 동안 누르고 뗀다 */
  const hold = async (l: Locator, ms: number) => {
    const p = await centerOf(l);
    if (touch) {
      await tx('touchStart', [p]);
      await page.waitForTimeout(ms);
      await tx('touchEnd', []);
    } else {
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      await page.waitForTimeout(ms);
      await page.mouse.up();
    }
  };
  const drag = async (a: Pt, b: Pt) => {
    const steps = 5;
    const at = (i: number): Pt => ({ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps });
    if (touch) {
      await tx('touchStart', [a]);
      for (let i = 1; i <= steps; i++) await tx('touchMove', [at(i)]);
      await tx('touchEnd', []);
    } else {
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      for (let i = 1; i <= steps; i++) await page.mouse.move(at(i).x, at(i).y);
      await page.mouse.up();
    }
    await page.waitForTimeout(380);
  };
  const pinch = async (c: Pt, d0: number, d1: number) => {
    const at = (d: number): Pt[] => [
      { x: c.x - d / 2, y: c.y },
      { x: c.x + d / 2, y: c.y },
    ];
    await tx('touchStart', at(d0));
    for (let i = 1; i <= 8; i++) await tx('touchMove', at(d0 + ((d1 - d0) * i) / 8));
    await tx('touchEnd', []);
    await page.waitForTimeout(600);
  };

  // ───────── 관측 도우미 ─────────
  const viewRect = async () => (await T('app-observe').locator('.obs-view').boundingBox())!;
  const hs = (id: string) => viewer((v) => v.listHotspots()).then((l: { id: string; x: number; y: number }[]) => l.find((h) => h.id === id)!);
  const zoomNow = () => viewer((v) => v.snapshot().zoom) as Promise<number>;
  /** 대상(들)의 중점이 화면 가운데 오도록 끌어서 옮긴다 */
  const panTo = async (ids: string[], tol = 60) => {
    for (let i = 0; i < 14; i++) {
      const r = await viewRect();
      const c = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      const ps = await Promise.all(ids.map(hs));
      const t = { x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length };
      const dx = c.x - t.x;
      const dy = c.y - t.y;
      if (Math.abs(dx) < tol && Math.abs(dy) < tol) return;
      const cl = (v: number, m: number) => Math.max(-m, Math.min(m, v));
      const sx = cl(dx, r.width * 0.34);
      const sy = cl(dy, r.height * 0.34);
      await drag({ x: c.x - sx / 2, y: c.y - sy / 2 }, { x: c.x + sx / 2, y: c.y + sy / 2 });
    }
  };
  const zoomTo = async (z: number) => {
    for (let i = 0; i < 6 && (await zoomNow()) < z - 0.05; i++) {
      await tap(T('zoom-in'));
      await page.waitForTimeout(650);
    }
  };
  const minuteNow = () => viewer((v) => v.getMinute()) as Promise<number>;
  /** 시각 막대를 눌러 [lo,hi] 안으로 간다(막대 탭 → ◀▶ 로 다듬기) */
  const scrubTo = async (lo: number, hi: number) => {
    const b = (await T('scrubber').boundingBox())!;
    const m = (lo + hi) / 2;
    await tapPt({ x: b.x + (b.width * (m - 480)) / 660, y: b.y + b.height / 2 });
    await page.waitForTimeout(350);
    for (let i = 0; i < 12; i++) {
      const cur = await minuteNow();
      if (cur >= lo && cur <= hi) return;
      await tap(T(cur < lo ? 'scrub-next' : 'scrub-prev'));
      await page.waitForTimeout(250);
    }
    const cur = await minuteNow();
    expect(cur >= lo && cur <= hi, `scrub to ${lo}-${hi} (now ${cur})`).toBe(true);
  };
  const frameCount = () => store((s) => s.frames.length) as Promise<number>;
  /**
   * 한 장면을 사람이 하듯 찍는다: 시각 → 대상을 가운데로 → 확대 → (들릴 때까지) → 셔터.
   * 첫 시도에 단서가 잡혀야 한다(캡처가 자연스럽게 되는지가 이 테스트의 핵심).
   */
  const shoot = async (opts: { name: string; at: [number, number]; ids: string[]; zoom?: number; line: string; clue: string }) => {
    await scrubTo(opts.at[0], opts.at[1]);
    await panTo(opts.ids, 80);
    await zoomTo(opts.zoom ?? 1.9);
    await panTo(opts.ids, 60);
    await expect.poll(() => viewer((v) => v.snapshot().heardLineIds), { timeout: 9000, message: `${opts.name}: ${opts.line} 가 들려야 한다` }).toContain(opts.line);
    const before = await frameCount();
    await tap(T('shutter'));
    await expect.poll(frameCount).toBe(before + 1);
    const clues = (await store((s) => s.frames[s.frames.length - 1].clueIds)) as string[];
    expect(clues, `${opts.name}: 첫 시도에 ${opts.clue} 를 담아야 한다`).toContain(opts.clue);
    await expect(T('shot-card')).toBeVisible();
    return before;
  };
  /** 앱 앞으로 */
  const dock = async (app: string) => {
    if (!touch && (await store((s) => s.ui.app)) === app && (await T(`win-${app}`).isVisible())) return;
    await tap(T(`dock-${app}`));
    await page.waitForTimeout(250);
  };
  const noYearHere = async (label: string) => {
    // DB 는 현대 DB 라 연도를 보인다(설계) — 업무·관측·메신저 화면만 본다
    const txt = await page.evaluate(() => [...document.querySelectorAll('.app-host:not([data-app="db"])')].map((e) => (e as HTMLElement).innerText).join('\n'));
    expect(txt, `${label}: 복원 전 화면에 4자리 연도 없음`).not.toMatch(YEAR);
  };
  const noCoach = async () => {
    expect(await page.locator('.coach-layer, .coach, .coachmark, .tutorial').count()).toBe(0);
    expect(await page.getByText(/튜토리얼|여기를 누르|터치하세요/).count()).toBe(0);
  };
  const docks = async () => (await page.locator('[data-testid^="dock-"]').evaluateAll((es) => es.map((e) => (e as HTMLElement).dataset.testid!.replace('dock-', ''))));
  const layoutOk = async (label: string) => {
    const r = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
      small: [...document.querySelectorAll('button, [role="tab"], [role="slider"]')]
        .filter((e) => {
          const b = e.getBoundingClientRect();
          const st = getComputedStyle(e);
          return b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && b.bottom > 0 && b.top < window.innerHeight && !e.classList.contains('term') && !e.classList.contains('gloss') && !e.classList.contains('chip') && !(e as HTMLElement).closest('details:not([open])');
        })
        .map((e) => ({ t: (e.getAttribute('data-testid') || e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }))
        .filter((e) => Math.min(e.w, e.h) < 44),
    }));
    expect(r.sw, `${label}: 가로 스크롤 없음`).toBeLessThanOrEqual(r.iw + 1);
    if (touch) expect(r.small, `${label}: 터치 대상 ≥ 44px`).toEqual([]);
  };
  const stampHold = async (id: string, ms = 900) => hold(T(id), ms);

  // ════════ B0 부트 ════════
  await page.goto('/?test=1&boot=1');
  await expect(T('cold-open')).toBeVisible();
  await shot('boot-cold-open');
  for (let i = 0; i < 8 && (await T('cold-open').count()); i++) {
    await tapPt({ x: 40, y: 200 });
    await page.waitForTimeout(250);
  }
  await expect(T('os')).toBeVisible({ timeout: 8000 });
  expect(await docks()).toEqual(['work', 'messenger']);
  await noCoach();
  await shot('home');
  await layoutOk('home');

  // ════════ 배정 ════════
  await dock('work');
  await expect(T('assignment-open')).toBeVisible();
  await shot('assignment-inbox');
  await tap(T('assignment-open'));
  await expect(T('assignment')).toBeVisible();
  await expect(T('assign-when')).toContainText('####');
  await noYearHere('배정');
  await noCoach();
  await layoutOk('assignment');
  await shot('assignment-open');
  // 아직 안 본 채로 ① 일치 → 실패해도 손해 없음(안내만)
  await stampHold('check-ck_place-match');
  await expect(T('check-msg-ck_place')).toBeVisible();
  expect(await store((s) => Object.keys(s.checklist).length)).toBe(0);
  // 짧게 누르면 도장이 찍히지 않는다(길게 눌러야 한다)
  await hold(T('check-ck_place-match'), 120);
  expect(await store((s) => Object.keys(s.checklist).length)).toBe(0);

  // ════════ 관측 ① 장소 ════════
  await tap(T('observe-start'));
  await expect(T('app-observe')).toBeVisible();
  await expect.poll(() => viewer((v) => (v ? v.listHotspots().length : 0))).toBeGreaterThan(5);
  expect(await docks()).toEqual(['work', 'viewer', 'messenger']);
  await page.waitForTimeout(800);
  await noCoach();
  await noYearHere('관측 시작');
  await shot('observe-start');
  await layoutOk('observe');
  expect(await minuteNow()).toBe(480);
  // 곳간의 사초 묶음을 가운데로 끌어 와 핀치(또는 ＋)로 확대
  await panTo(['hs_obs_store_sacho'], 90);
  if (touch) {
    const r = await viewRect();
    await pinch({ x: r.x + r.width / 2, y: r.y + r.height / 2 }, 70, 220);
  }
  await zoomTo(1.7);
  await panTo(['hs_obs_store_sacho'], 80);
  await expect.poll(() => store((s) => s.seen.includes('hs_obs_store_sacho') || s.seen.includes('hs_obs_hall_manuscript')), { timeout: 6000 }).toBe(true);
  await shot('observe-zoom-store');
  await dock('work');
  await stampHold('check-ck_place-match');
  await expect(T('stamp-ck_place')).toBeVisible();
  await shot('check1-stamped');

  // ════════ ② 인물: 붉은 관복 엿듣기 + 캡처(F1) ════════
  await dock('viewer');
  await expect.poll(() => viewer((v) => (v ? v.listHotspots().length : 0))).toBeGreaterThan(5);
  // 쓸모없는 프레임은 부드럽게 알려 준다(빈 마당) — 필름은 아낀다: 찍고 바로 비운다
  await panTo(['hs_obs_yard_well'], 100);
  await tap(T('shutter'));
  await expect(T('shot-empty')).toBeVisible();
  await shot('capture-empty');
  const emptyIdx = (await frameCount()) - 1;
  await tap(T(`frame-${emptyIdx}`));
  await tap(T('frame-remove'));
  await expect.poll(frameCount).toBe(0);
  // 말하는 사람이 없는 때(08:00~08:40)는 「…」 도 안 뜬다. 조금 훑어 08:40 뒤로.
  await shoot({ name: 'F1', at: [525, 600], ids: ['hs_npc_red_official'], line: 'r2', clue: 'cl_dangsang' });
  await expect(T('shot-card')).toContainText('필름 1/6');
  await expect(T('shot-card')).toContainText('그대로 넘길 수 없소');
  await shot('F1-captured');
  await expect(T('frame-0')).toBeVisible();
  // 말풍선만으로 충분하다: 자막 중복 없음, 들은 말 목록만
  expect(await T('heard-line').count()).toBe(0);
  await tap(T('heard-log-open'));
  await expect(T('heard-log')).toContainText('그대로 넘길 수 없소');
  await shot('heard-log');
  await tap(page.locator('[data-testid="heard-log"] .sheet-x'));
  await expect(T('heard-log')).toHaveCount(0);
  await dock('work');
  await stampHold('check-ck_person-match');
  await expect(T('stamp-ck_person')).toBeVisible();

  // ════════ ③ 시각: 하루를 훑는다(F2 조의제문 · F3 전교 · F4 간언) ════════
  await dock('viewer');
  await shoot({ name: 'F2', at: [740, 800], ids: ['hs_npc_young_official'], line: 'y3', clue: 'cl_jouijemun' });
  await shot('F2-captured');
  // 13:56 미세 지직 → 14:00 전교
  await scrubTo(838, 842);
  await shot('scrub-1400');
  await dock('work');
  await expect(T('check-msg-ck_time')).toHaveCount(0);
  await stampHold('check-ck_time-match');
  await expect(T('check-msg-ck_time')).toBeVisible(); // 아직 전교를 못 들었다(또는 일치로 찍어 보니 어긋난다) — 어느 쪽이든 손해 없음
  await dock('viewer');
  await shoot({ name: 'F3', at: [848, 880], ids: ['hs_npc_messenger'], line: 'm2', clue: 'cl_order' });
  await shot('F3-captured');
  await shoot({ name: 'F4', at: [850, 890], ids: ['hs_npc_blue_official'], line: 'b2', clue: 'cl_objection' });
  expect(await frameCount()).toBe(4);
  await shot('F4-captured');
  await expect.poll(() => store((s) => s.heard.includes('m2'))).toBe(true);
  await noYearHere('관측 오후');
  await dock('work');
  await stampHold('check-ck_time-mismatch');
  await expect(T('stamp-ck_time')).toBeVisible();

  // ════════ ④ 판정: 권장(일치·노이즈)을 거슬러 [불일치] ════════
  await expect(T('check-ck_verdict-match')).toContainText('일치(노이즈)');
  await shot('verdict-recommended');
  await stampHold('check-ck_verdict-mismatch');
  await expect(T('stamp-ck_verdict')).toBeVisible();
  await expect(T('stamp-auto')).toBeVisible({ timeout: 4000 });
  await expect(T('queue')).toBeVisible();
  await shot('auto-closed');
  expect(await store((s) => Object.keys(s.closures).length)).toBe(1);
  await expect(T('dock-db')).toBeVisible();
  expect(await docks()).toEqual(['work', 'viewer', 'db', 'messenger']);
  await layoutOk('closed');

  // ════════ 메신저(오 실장) → DB ════════
  await dock('messenger');
  await tap(T('msg-thread-chief'));
  await expect(T('msg-m_chief_02')).toContainText('장비 문제');
  await shot('messenger-chief');
  await dock('db');
  // 들은 전교를 그대로 입력해 검색한다
  await T('db-input').fill('대내로 들여오라');
  await tap(T('db-submit'));
  await expect(T('no-article')).toContainText('해당 기사 없음');
  await shot('db-no-article');
  await tap(T('chips').getByTestId('term-김일손'));
  await tap(T('record-rec_alt_kim_ilson'));
  await expect(T('record-view-rec_alt_kim_ilson')).toContainText('1498');
  await expect(T('record-view-rec_alt_kim_ilson')).toContainText('권오복');
  await shot('db-kim-ilson');
  await tap(T('record-back'));
  await tap(T('chips').getByTestId('term-당상'));
  await tap(T('record-rec_alt_yi_geukdon'));
  await expect(T('record-view-rec_alt_yi_geukdon')).toContainText('이극돈');
  await shot('db-yi-geukdon');
  await tap(T('record-back'));

  // ════════ 종결된 보고서: 1년 전 내 보고서 ════════
  await dock('work');
  await tap(T('closed-tab'));
  await expect(T('closed-list')).toBeVisible();
  await noYearHere('종결함');
  await shot('closed-list');
  await tap(T('closed-cr_c2217_prev'));
  await expect(T('closed-detail-cr_c2217_prev')).toContainText('쓴 기억이 없다', { timeout: 8000 });
  await noYearHere('내 옛 보고서');
  await shot('closed-own-report');
  await tap(T('closed-back'));

  // ════════ F5 · F6 (남은 두 장) ════════
  await dock('viewer');
  await shoot({ name: 'F5', at: [806, 830], ids: ['hs_npc_clerk', 'hs_npc_red_official'], line: 'c3', clue: 'cl_veteran' });
  await shot('F5-captured');
  expect(await frameCount()).toBe(5);
  // 06:00 재계산 전에 마지막 한 장
  await shoot({ name: 'F6', at: [965, 1000], ids: ['hs_npc_blue_official'], line: 'b5', clue: 'cl_alive' });
  expect(await frameCount()).toBe(6);
  await shot('F6-captured');

  // ════════ 06:00 좌표 재계산 ════════
  await expect.poll(() => store((s) => s.degraded.length), { timeout: 8000 }).toBeGreaterThan(0);
  await dock('messenger');
  if (touch || (await T('msg-thread-system').count())) {
    if (await T('msg-back').count()) await tap(T('msg-back'));
  }
  await tap(T('msg-thread-system'));
  await expect(T('msg-m_sys_corr')).toContainText('고정 실패');
  await shot('recalc-system');
  if (await T('msg-back').count()) await tap(T('msg-back'));
  await tap(T('msg-thread-senior'));
  await expect(T('choices')).toBeVisible();
  await shot('recalc-senior-choices');
  await tap(T('choice-ch_insist'));
  await expect(T('msg-m_senior_03')).toBeVisible();
  await shot('recalc-senior-reply');
  // 흐린 구간은 장면이 깨지고, 보호된 프레임은 버릴 수 없다
  await dock('viewer');
  await scrubTo(870, 900);
  await expect(page.locator('[data-slot="viewer.degraded"]')).toBeVisible({ timeout: 4000 });
  await shot('degraded-view');
  await tap(T('shutter'));
  await expect(page.getByText('이 구간은 훼손되어 찍히지 않는다.')).toBeVisible();
  const prot = (await store((s) => s.frames.map((f: St) => f.id + ':' + f.minute))) as string[];
  expect(prot.length).toBe(6);
  const aliveIdx = (await store((s) => s.frames.findIndex((f: St) => f.clueIds.includes('cl_alive')))) as number;
  await tap(T(`frame-${aliveIdx}`));
  await tap(T('frame-remove'));
  await expect(T('frame-sheet')).toContainText('다시 찍을 수 없다');
  await shot('frame-protected');
  await tap(page.locator('[data-testid="frame-sheet"] .sheet-x'));
  expect(await frameCount()).toBe(6);
  // 흐린 구간 밖에서는 장면이 멀쩡하다
  await scrubTo(560, 600);
  await expect(page.locator('[data-slot="viewer.degraded"]')).toHaveCount(0);

  // ════════ 보고서 ════════
  await dock('work');
  await expect(T('report-tab')).toBeVisible();
  await tap(T('report-tab'));
  await expect(T('report')).toBeVisible();
  await shot('report-empty');
  await layoutOk('report');
  const fid = async (clue: string) => (await store((s) => s.frames.find((f: St) => f.clueIds.includes('PLACEHOLDER'))?.id)) as string | undefined;
  void fid;
  const frameWith = (clue: string) =>
    page.evaluate((c) => (window as unknown as { __STORE__: { getState(): { frames: { id: string; clueIds: string[] }[] } } }).__STORE__.getState().frames.find((f) => f.clueIds.includes(c))!.id, clue);
  const attach = async (blank: string, kind: 'frame' | 'record', id: string) => {
    await tap(T(`attach-open-${blank}`));
    await tap(T(`attach-${kind}-${id}`));
    await tap(page.locator('[data-testid="attach-sheet"] .sheet-done'));
    await expect(T('attach-sheet')).toHaveCount(0);
  };
  const fAlive = await frameWith('cl_alive');
  const fOrder = await frameWith('cl_order');
  const fVet = await frameWith('cl_veteran');
  const fJoui = await frameWith('cl_jouijemun');
  // 첫 시도: 일부러 어긋나게
  await attach('who', 'record', 'rec_alt_kim_ilson');
  await attach('who', 'frame', fOrder);
  await attach('when', 'frame', fAlive);
  await attach('what', 'frame', fJoui);
  await attach('result', 'record', 'rec_alt_kim_ilson');
  await T('year-from').fill('1498');
  await T('year-to').fill('1498');
  await tap(T('report-submit'));
  for (const k of ['when', 'who', 'what', 'result']) await expect(T(`feedback-${k}`)).toBeVisible();
  const verdicts = await Promise.all(['when', 'who', 'what', 'result'].map((k) => T(`verdict-${k}`).getAttribute('data-verdict')));
  expect(verdicts.filter((v) => v === 'confirmed').length).toBeLessThan(4);
  expect(await T('report-ready').count()).toBe(0);
  const fbText = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="feedback-"]')].map((e) => (e as HTMLElement).innerText).join('\n'));
  expect(fbText, '피드백에 연도 정답이 없다').not.toMatch(YEAR);
  expect(fbText, '피드백에 정답 이름이 없다').not.toMatch(/이극돈|무오사화/);
  await shot('report-wrong-feedback');
  // 바로잡기: 떼고 붙인다
  const detach = async (blank: string, kind: string, id: string) => {
    await tap(T(`detach-${kind}-${id}-${blank}`));
  };
  await detach('who', 'record', 'rec_alt_kim_ilson');
  await detach('who', 'frame', fOrder);
  await attach('who', 'frame', fVet);
  await attach('who', 'record', 'rec_alt_yi_geukdon');
  await detach('when', 'frame', fAlive);
  await attach('when', 'frame', fAlive);
  await attach('when', 'record', 'rec_alt_kim_ilson');
  await detach('what', 'frame', fJoui);
  await attach('what', 'frame', fOrder);
  await detach('result', 'record', 'rec_alt_kim_ilson');
  await attach('result', 'frame', fOrder);
  await attach('result', 'record', 'rec_alt_kim_ilson');
  await tap(T('report-submit'));
  await expect(T('report-ready')).toBeVisible({ timeout: 6000 });
  for (const k of ['when', 'who', 'what', 'result']) expect(await T(`verdict-${k}`).getAttribute('data-verdict')).toBe('confirmed');
  await shot('report-confirmed');

  // ════════ 도장(길게 누르기) → 복원 ════════
  const sBefore = await store((s) => s.shifts.length);
  expect(sBefore).toBe(0);
  await hold(T('report-stamp'), 500); // 중간에 떼면 아무 일도 없다
  expect(await store((s) => s.shifts.length)).toBe(0);
  await hold(T('report-stamp'), 1700);
  await expect(T('report-approved')).toBeVisible();
  await expect.poll(() => store((s) => s.shifts.length)).toBeGreaterThan(0);
  await shot('report-approved');
  // 배정 카드: 일시가 채워진다
  await expect(T('assign-when')).not.toContainText('####', { timeout: 9000 });
  await expect(T('assign-when')).toContainText('연산군');
  await shot('assignment-restored');
  // 메신저: 지난 문장이 다시 쓰이고 연필 흔적이 남는다
  await dock('messenger');
  await expect(page.locator('[data-testid="app-messenger"]')).toBeVisible();
  if (await T('msg-back').count()) await tap(T('msg-back'));
  await tap(T('msg-thread-chief'));
  await expect(T('msg-m_chief_02')).toContainText('무오사화', { timeout: 12000 });
  await expect(T('msg-pencil-m_chief_02')).toBeVisible();
  await tap(T('msg-pencil-m_chief_02'));
  await expect(T('msg-orig-m_chief_02')).toContainText('장비 문제');
  await shot('messenger-rewritten-pencil');
  if (await T('msg-back').count()) await tap(T('msg-back'));
  await tap(T('msg-thread-senior'));
  await expect(T('msg-m_senior_04')).toContainText('모르는 사람이 어디 있어', { timeout: 8000 });
  await shot('epilogue-senior');
  if (await T('msg-back').count()) await tap(T('msg-back'));
  await tap(T('msg-thread-system'));
  await expect(T('msg-m_sys_obslog')).toContainText('해당 기사 없음');
  await expect(T('msg-m_sys_teaser')).toContainText('2건');
  await shot('epilogue-system-teaser');

  // ════════ DB 재검색: 복원된 기사 ════════
  await dock('db');
  if (await T('record-back').count()) await tap(T('record-back'));
  await T('db-input').fill('대내로 들여오라');
  await tap(T('db-submit'));
  await expect(T('no-article')).toHaveCount(0);
  await shot('db-restored');

  // ════════ 예고: 종결함에 관측 오류 2건 더 ════════
  await dock('work');
  await tap(T('closed-tab'));
  await expect(T('closed-cr_c0408')).toBeVisible();
  await expect(T('closed-cr_c3391')).toBeVisible();
  await expect(T('closed-cr_c2217_prev')).toBeVisible();
  await shot('closed-teaser');
  await tap(T('closed-cr_c2217_prev'));
  await expect(T('closed-detail-cr_c2217_prev')).toContainText('해당 기사 없음'); // 관측기 로그는 그대로
  await tap(T('closed-back'));

  // ════════ 새로고침 → 이어하기 ════════
  await page.waitForTimeout(1500); // 자동 저장
  await page.reload();
  await page.goto('/?test=1&boot=1');
  await expect(T('boot-continue')).toBeVisible({ timeout: 10000 });
  await shot('reload-login');
  await tap(T('boot-continue'));
  await expect(T('os')).toBeVisible({ timeout: 8000 });
  expect(await store((s) => s.frames.length)).toBe(6);
  expect(await store((s) => s.shifts.length)).toBeGreaterThan(0);
  expect(await store((s) => s.filed.length)).toBe(1);
  await dock('work');
  await expect(T('closed-tab')).toBeVisible();
  await shot('after-reload');
  await dock('viewer');
  await expect.poll(() => viewer((v) => (v ? v.listHotspots().length : 0))).toBeGreaterThan(5);
  await page.waitForTimeout(800);
  // 복원 뒤에는 흐린 구간이 없다
  await scrubTo(870, 900);
  await expect(page.locator('[data-slot="viewer.degraded"]')).toHaveCount(0);
  await shot('observe-after-restore');

  expect(errors, '콘솔 오류 없음').toEqual([]);
});
