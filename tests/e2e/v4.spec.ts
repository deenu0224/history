import { expect, test, type Locator, type TestInfo } from '@playwright/test';
import fs from 'node:fs';

/**
 * 결록 v4 「근무」 전체 에피소드(밤 셋): 실제 UI 입력(탭 · 길게 누르기 · 시간 막대 · 확대/셔터 · 검사 낱말 짚기)만으로 끝까지.
 * __STORE__ / __VIEWER__ 는 단언과 핫스팟 화면 좌표 읽기에만 쓴다(진행을 위해 액션을 부르지 않는다).
 * 비트: 부트 → 근무 1(확인 · 정정 · 함정 경고 · 정정 · #C-2217 서랍 불일치 → 회색 덮임 → 판정 이력 → 바랜 07) → 근무 보고
 *   → 근무 2(규정 4조 슬립 · 근거 프레임 · 관측기 로그 재생 → 필름 · DB · 나머지 건 · 06:00 재계산 · 근무 보고)
 *   → 근무 3(규정 5조 · 노이즈 자동 종결 · 보고서 4칸 → 도장 → 복원 · 에필로그/예고) → 새로고침 → 이어하기.
 */
const SHOT_DIR = process.env.E2E_SHOTS ?? '/tmp/claude-0/-home-user-history/fd8b313c-786f-59e9-875b-1190f9568f2b/scratchpad/v4ui/e2e';
const YEAR = /(?<![\d:.#])(1[0-9]{3}|20[0-9]{2})(?![\d:.#])/;

type St = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Pt = { x: number; y: number };

test.describe.configure({ mode: 'serial' });

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page.screenshot({ path: `${SHOT_DIR}/FAIL-${info.project.name}.png` }).catch(() => undefined);
  }
});

test('결록 v4: 근무 3밤 — 처음부터 끝까지 실제 입력만으로', async ({ page }, info: TestInfo) => {
  test.setTimeout(900_000);
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
  let fallbacks = 0;
  const shot = async (name: string) => {
    n++;
    console.log(`[${proj} ${Math.round((Date.now() - t0) / 1000)}s] ${name}`);
    await page.waitForTimeout(1100); // 연출(인쇄·먹 번짐·도장)이 가라앉은 뒤의 화면을 남긴다
    await page.screenshot({ path: `${SHOT_DIR}/${proj}-${String(n).padStart(2, '0')}-${name}.png` });
  };
  const T = (id: string) => page.getByTestId(id);
  const store = <R,>(fn: (s: St, a: St) => R, arg?: unknown): Promise<R> =>
    page.evaluate(
      ({ src, arg }) => {
        // eslint-disable-next-line no-new-func
        const f = new Function('s', 'a', `return (${src})(s, a)`);
        return f((window as unknown as { __STORE__: { getState(): unknown } }).__STORE__.getState(), arg);
      },
      { src: fn.toString(), arg },
    ) as Promise<R>;
  const viewer = <R,>(fn: (v: St, a: St) => R, arg?: unknown): Promise<R> =>
    page.evaluate(
      ({ src, arg }) => {
        // eslint-disable-next-line no-new-func
        const f = new Function('v', 'a', `return (${src})(v, a)`);
        return f((window as unknown as { __VIEWER__: unknown }).__VIEWER__, arg);
      },
      { src: fn.toString(), arg },
    ) as Promise<R>;

  // ───────── 입력 프리미티브(전부 실제 포인터/터치 이벤트) ─────────
  const tx = (type: string, pts: Pt[]) => cdp!.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
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

  // ───────── 관측 도우미 ─────────
  const screenRect = async () => (await page.locator('[data-testid="observe-view"] .obsv-screen').first().boundingBox())!;
  const zoomNow = () => viewer((v) => v.snapshot().zoom) as Promise<number>;
  const heard = (id: string) => store((s, a) => s.heard.includes(a), id) as Promise<boolean>;
  const minuteNow = () => viewer((v) => v.getMinute()) as Promise<number>;
  /** 시간 막대를 눌러 [lo,hi] 안으로 간다(막대 탭 → ◀▶ 로 다듬기) */
  const scrubTo = async (lo: number, hi: number) => {
    const sc = T('scrubber');
    const vmin = Number(await sc.getAttribute('aria-valuemin'));
    const vmax = Number(await sc.getAttribute('aria-valuemax'));
    const b = (await sc.boundingBox())!;
    const m = (lo + hi) / 2;
    await tapPt({ x: b.x + (b.width * (m - vmin)) / (vmax - vmin), y: b.y + b.height / 2 });
    await page.waitForTimeout(350);
    for (let i = 0; i < 40; i++) {
      const cur = await minuteNow();
      if (cur >= lo && cur <= hi) return;
      await tap(T(cur < lo ? 'scrub-next' : 'scrub-prev'));
      await page.waitForTimeout(160);
    }
    const cur = await minuteNow();
    expect(cur >= lo && cur <= hi, `scrub to ${lo}-${hi} (now ${cur})`).toBe(true);
  };
  const hotspot = async (id?: string) => {
    const list = (await viewer((v) => v.listHotspots())) as { id: string; x: number; y: number; available: boolean }[];
    return id ? list.find((h) => h.id === id) : (list.find((h) => h.available) ?? list[0]);
  };
  /** 말하는 사람을 눌러 다가가고, 필요하면 확대 버튼으로 엿듣는다. 안 들리면 마지막에만 테스트 API 로 가운데에 맞춘다. */
  const hear = async (lineId: string, hsId?: string) => {
    for (let i = 0; i < 7; i++) {
      if (await heard(lineId)) return;
      const h = await hotspot(hsId);
      const r = await screenRect();
      if (h && h.x > r.x + 70 && h.x < r.x + r.width - 70 && h.y > r.y + 60 && h.y < r.y + r.height - 70 && i % 2 === 0) {
        await tapPt({ x: h.x, y: h.y });
        await page.waitForTimeout(1100);
      } else {
        await tap(T('zoom-in'));
        await page.waitForTimeout(800);
      }
    }
    if (!(await heard(lineId))) {
      fallbacks++;
      const id = hsId ?? ((await hotspot())?.id as string);
      await viewer((v, a) => v.centerOn(a), id);
      await viewer((v) => v.setZoom(2.4));
      await page.waitForTimeout(1200);
    }
    await expect.poll(() => heard(lineId), { timeout: 8000, message: `${lineId} 가 들려야 한다` }).toBe(true);
  };
  const panTo = async (ids: string[], tol = 60) => {
    for (let i = 0; i < 14; i++) {
      const r = await screenRect();
      const c = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      const ps = await Promise.all(ids.map((id) => hotspot(id)));
      const ok = ps.filter(Boolean) as Pt[];
      if (!ok.length) return;
      const t = { x: ok.reduce((a, p) => a + p.x, 0) / ok.length, y: ok.reduce((a, p) => a + p.y, 0) / ok.length };
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

  const noYearHere = async (label: string) => {
    // DB 는 현대 DB 라 연도를 보인다(설계) — 책상·관측·메신저 화면만 본다
    const txt = await page.evaluate(() => [...document.querySelectorAll('[data-testid="os"]')].map((e) => (e as HTMLElement).innerText).join('\n'));
    expect(txt, `${label}: 복원 전 화면에 4자리 연도 없음`).not.toMatch(YEAR);
  };
  const noCoach = async () => {
    expect(await page.locator('.coach-layer, .coach, .coachmark, .tutorial').count()).toBe(0);
    expect(await page.getByText(/튜토리얼|여기를 누르|터치하세요/).count()).toBe(0);
  };
  const layoutOk = async (label: string) => {
    const r = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
      small: [...document.querySelectorAll('button, [role="tab"], [role="slider"], [role="switch"]')]
        .filter((e) => {
          const b = e.getBoundingClientRect();
          const st = getComputedStyle(e);
          const el = e as HTMLElement;
          return (
            b.width > 0 &&
            b.height > 0 &&
            st.visibility !== 'hidden' &&
            b.bottom > 0 &&
            b.top < window.innerHeight &&
            !/\b(dseg|dchip|gloss|term)\b/.test(el.className) &&
            !el.closest('.thr-layer')
          );
        })
        .map((e) => ({ t: (e.getAttribute('data-testid') || e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }))
        .filter((e) => Math.min(e.w, e.h) < 44),
    }));
    expect(r.sw, `${label}: 가로 스크롤 없음`).toBeLessThanOrEqual(r.iw + 1);
    if (touch) expect(r.small, `${label}: 터치 대상 ≥ 44px`).toEqual([]);
  };
  const stampHold = (id: string, ms = 900) => hold(T(id), ms);
  const warns = () => store((s) => s.duty.warnings.length) as Promise<number>;
  const slipOk = async () => {
    await expect(T('slip')).toBeVisible({ timeout: 6000 });
    await tap(T('slip-ok'));
    await expect(T('slip')).toHaveCount(0);
  };
  const openMenuItem = async (id: string) => {
    await tap(T('open-menu'));
    await tap(T(`menu-${id}`));
  };
  const closePanel = async () => {
    await tap(T('panel-close'));
    await expect(page.locator('.panel')).toHaveCount(0);
  };
  const msgOpen = async (thread: string) => {
    await tap(T('open-messenger'));
    if (await T('msg-back').count()) await tap(T('msg-back'));
    await tap(T(`msg-thread-${thread}`));
  };
  const nextCase = async (code: string) => {
    await tap(T('next-case'));
    await expect(T('case-code')).toHaveText(code, { timeout: 6000 });
    await page.waitForTimeout(300);
  };
  const waitScene = async () => {
    await expect.poll(() => viewer((v) => (v ? v.listHotspots().length : 0)), { timeout: 15000 }).toBeGreaterThan(0);
    await page.waitForTimeout(500);
  };
  /** 말하는 인물이 없는 노이즈 장면: 관측 창만 뜬다 */
  const waitView = async () => {
    await expect(T('observe-view')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);
  };
  /** 일상 건 하나: 올리고 → (시각) → 엿듣고 → (짚기) → (근거 프레임) → 도장 */
  const routine = async (o: { code: string; line: string; at?: [number, number]; hs?: string; inspect?: [string, string][]; frame?: boolean; stamp: 'confirm' | 'correct' }) => {
    await nextCase(o.code);
    await waitScene();
    if (o.at) await scrubTo(o.at[0], o.at[1]);
    await hear(o.line, o.hs);
    await expect(T('heard-strip')).toBeVisible();
    if (o.inspect) {
      await tap(T('inspect-toggle'));
      await expect(T('os')).toHaveAttribute('data-inspect', 'true');
      for (const [a, b] of o.inspect) {
        await tap(T(`seg-${a}`));
        await tap(T(`obs-${b}`));
        await page.waitForTimeout(300);
      }
    }
    if (o.frame) {
      await tap(T('shutter'));
      await expect(T('case-frame')).toHaveAttribute('data-has', '1');
    }
    if (o.inspect) await tap(T('inspect-toggle'));
    const before = await store((s) => s.stats.stamps);
    await stampHold(`stamp-${o.stamp}`);
    await expect.poll(() => store((s) => s.stats.stamps)).toBe(before + 1);
    await expect(T('impression')).toBeVisible();
  };

  // ════════ 부트 ════════
  await page.goto('/?test=1&boot=1');
  await expect(T('prologue')).toBeVisible();
  await shot('boot-prologue');
  await tap(T('boot-skip'));
  await expect(T('cold-open')).toBeVisible();
  for (let i = 0; i < 8 && (await T('cold-open').count()); i++) {
    await tapPt({ x: 40, y: 200 });
    await page.waitForTimeout(250);
  }
  await expect(T('os')).toBeVisible({ timeout: 8000 });
  await expect(T('duty-login')).toBeVisible();
  await noCoach();
  await shot('desk-login');
  await layoutOk('login');

  // ════════ 근무 1 ════════
  await tap(T('duty-start'));
  await expect(T('duty-briefing')).toBeVisible();
  await expect(T('processed')).toContainText('0');
  await shot('s1-briefing');
  await noCoach();
  // 규정집: 1~3조(근무 1)
  await tap(T('open-rules'));
  await expect(T('rule-1')).toBeVisible();
  await expect(T('rule-3')).toBeVisible();
  await expect(T('rule-4')).toHaveCount(0);
  await shot('s1-rulebook');
  await tap(T('rulebook-close'));

  // ── #A-0412 확인: 보지 않고는 안 찍힌다 ──
  await nextCase('#A-0412');
  await waitScene();
  await expect(T('shutter')).toHaveCount(0); // 규정 4조 전에는 셔터가 없다
  await shot('s1-a0412-open');
  await layoutOk('case-1');
  await hold(T('stamp-confirm'), 120); // 짧게 누르면 찍히지 않는다
  expect(await store((s) => s.stats.stamps)).toBe(0);
  if (!(await heard('a0412_l1'))) {
    // 좁은 세로 화면은 처음부터 말하는 이 쪽이라 이미 들렸을 수 있다. 아직이면: 보지 않고는 안 찍힌다.
    await stampHold('stamp-confirm');
    await expect(T('card-msg')).toBeVisible();
    expect(await store((s) => s.stats.stamps)).toBe(0);
    expect(await warns()).toBe(0);
    await shot('s1-a0412-not-ready');
  }
  await hear('a0412_l1');
  await shot('s1-a0412-heard');
  await stampHold('stamp-confirm');
  await expect(T('impression')).toHaveAttribute('data-stamp', 'confirm');
  await expect(T('impression')).toContainText('07');
  await shot('s1-a0412-stamped');
  expect(await warns()).toBe(0);

  // ── #A-0419 정정: 검사 모드 → 빨간 실 → 원문 복원 ──
  await nextCase('#A-0419');
  await waitScene();
  await hear('a0419_l1');
  await tap(T('inspect-toggle'));
  await tap(T('seg-a0419_yi'));
  await tap(T('obs-a0419o_yi'));
  await expect(T('thread-differs')).toBeVisible();
  await shot('s1-a0419-thread');
  await tap(T('inspect-toggle'));
  await stampHold('stamp-correct');
  await expect(T('restored-badge')).toContainText('검증');
  await expect(T('case-text')).toContainText('이극돈');
  await shot('s1-a0419-restored');
  expect(await warns()).toBe(0);

  // ── #A-0423 함정: 노란 깜빡임 → 그래도 정정 → 경고장 ──
  await nextCase('#A-0423');
  await waitScene();
  await hear('a0423_l1');
  await tap(T('inspect-toggle'));
  await tap(T('seg-a0423_seong'));
  await tap(T('obs-a0423o_seong'));
  await expect(T('thread-notation')).toBeVisible();
  await expect(T('card-msg')).toContainText('표기 차이');
  await shot('s1-a0423-yellow');
  await tap(T('inspect-toggle'));
  await stampHold('stamp-correct');
  await slipOk();
  expect(await warns()).toBe(1);
  await expect(T('warnings')).toHaveAttribute('data-live', '1');
  await shot('s1-a0423-warning');

  // ── #A-0431 정정(날짜 낱말) ──
  await routine({ code: '#A-0431', line: 'a0431_l1', inspect: [['a0431d_month', 'a0431o_month']], stamp: 'correct' });
  await expect(T('case-citation')).toContainText('3월');
  await shot('s1-a0431-restored');

  // ── #C-2217: 하루를 끝까지 → 서랍의 불일치 → 회색 덮임 → 판정 이력 ──
  await nextCase('#C-2217');
  await waitScene();
  await expect(T('stamp-auto_close')).toBeVisible();
  await stampHold('stamp-auto_close'); // 아직 하루를 다 보지 않았다
  await expect(T('card-msg')).toBeVisible();
  expect(await store((s) => s.duty.cases.case_c2217?.stamp)).toBeUndefined();
  await shot('s1-c2217-open');
  await scrubTo(1020, 1140);
  await shot('s1-c2217-day-end');
  await tap(T('drawer'));
  await expect(T('drawer-face')).toBeVisible();
  await page.waitForTimeout(900);
  await shot('s1-drawer');
  await stampHold('stamp-mismatch', 1100);
  await expect(T('impression')).toHaveAttribute('data-stamp', 'mismatch', { timeout: 6000 });
  await expect(T('system-overlay')).toBeVisible({ timeout: 4000 });
  await shot('s1-c2217-stamped');
  await slipOk();
  expect(await warns()).toBe(2);
  await expect(T('card-flip')).toBeVisible();
  await expect.poll(() => T('case-card').getAttribute('data-flipped'), { timeout: 6000 }).toBe('true');
  await shot('s1-verdict-history');
  await tap(T('history-aged'));
  await expect(T('aged-zoom')).toBeVisible();
  await expect(T('aged-eng')).toHaveText('07');
  await expect(T('aged-line')).toContainText('나는 이 도장을 찍은 기억이 없다.');
  await shot('s1-aged-07');
  await tap(T('aged-close'));
  await expect(T('aged-zoom')).toHaveCount(0);
  await expect.poll(() => store((s) => s.flags.closed_mismatch)).toBe(true);
  await expect(T('processed')).toContainText('5');

  // 메신저: 오 실장
  await msgOpen('chief');
  await expect(T('msg-m_chief_drawer')).toBeVisible({ timeout: 12000 });
  await shot('s1-messenger');
  await closePanel();

  // 근무 종료 → 근무 보고
  await expect(T('duty-end')).toBeVisible();
  await tap(T('duty-end'));
  await expect(T('shift-report')).toBeVisible();
  await expect(T('rp-warnings')).toContainText('2');
  await shot('s1-shift-report');
  await tap(T('shift-next'));
  await expect(T('duty-login')).toBeVisible();
  // DB 가 열렸다
  await tap(T('open-menu'));
  await expect(T('menu-db')).toBeVisible();
  await tap(T('open-menu'));

  // ════════ 근무 2 ════════
  await tap(T('duty-start'));
  await expect(T('slip')).toHaveAttribute('data-kind', 'rule', { timeout: 8000 });
  await expect(T('slip-reason')).toContainText('근거 프레임');
  await shot('s2-rule-slip');
  await tap(T('slip-ok'));
  await expect(T('open-rules')).toHaveClass(/news/);
  await tap(T('open-rules'));
  await expect(T('rule-4')).toHaveAttribute('data-new', 'true');
  await shot('s2-rulebook-new');
  await tap(T('rulebook-close'));
  await expect(T('open-rules')).not.toHaveClass(/news/);
  await layoutOk('s2-briefing');

  // ── #A-0501: 근거 프레임 없이는 정정이 안 된다 → 시간 막대 → 셔터 ──
  await nextCase('#A-0501');
  await waitScene();
  await expect(T('shutter')).toBeVisible();
  await expect(T('case-frame')).toHaveAttribute('data-has', '0');
  await shot('s2-a0501-open');
  await scrubTo(860, 865); // 말 시작 눈금 근처
  await hear('a0501_l1');
  await tap(T('inspect-toggle'));
  await tap(T('seg-a0501_sagwan'));
  await tap(T('obs-a0501o_sagwan'));
  await expect(T('thread-differs')).toBeVisible();
  await tap(T('inspect-toggle'));
  await stampHold('stamp-correct');
  await expect(T('card-msg')).toContainText('프레임');
  expect(await store((s) => s.duty.cases.case_a0501?.stamp)).toBeUndefined();
  await shot('s2-a0501-needs-frame');
  // 방금 들은 말은 10초만 프레임에 같이 담긴다 — 넓은 화면(장면 전체)이면 말하는 이를 다시 크게 잡고 찍는다
  {
    const hs = (await hotspot())!.id;
    await panTo([hs], 80);
    await zoomTo(1.9);
    await panTo([hs], 60);
  }
  await tap(T('shutter'));
  await expect(T('case-frame')).toHaveAttribute('data-has', '1');
  await shot('s2-a0501-frame-pinned');
  await stampHold('stamp-correct');
  await expect(T('restored-badge')).toBeVisible();
  await expect(T('case-text')).toContainText('사관');
  await shot('s2-a0501-restored');
  await expect(T('warnings')).toHaveAttribute('data-live', '0');

  // ── 관측기 로그: 1년 전 소견 → 재생(값을 치른다) → 필름 ──
  await openMenuItem('viewer');
  await expect(T('app-log')).toBeVisible();
  await expect(T('log-mine')).toContainText('14시경');
  await shot('s2-log');
  const clock0 = (await store((s) => s.duty.clock.duty_2)) as number;
  await tap(T('replay-rw_14'));
  await expect(T('replay-cost')).toContainText('1시간');
  await shot('s2-replay-confirm');
  await tap(T('replay-cancel'));
  expect(await store((s) => s.duty.clock.duty_2)).toBe(clock0);
  await tap(T('replay-rw_14'));
  await tap(T('replay-confirm'));
  await expect(T('app-replay')).toBeVisible();
  expect(await store((s) => s.duty.clock.duty_2)).toBe(clock0 + 60);
  await waitScene();
  await shot('s2-replay-open');
  await layoutOk('replay');
  // 구간 밖으로는 스크럽되지 않는다
  await scrubTo(840, 850);
  await tap(T('scrub-prev'));
  expect(await minuteNow()).toBeGreaterThanOrEqual(840);
  const shootFilm = async (name: string, at: [number, number], ids: string[], line: string, clue: string) => {
    await scrubTo(at[0], at[1]);
    await panTo(ids, 80);
    await zoomTo(1.9);
    await panTo(ids, 60);
    await hear(line, ids[0]);
    await page.waitForTimeout(10500); // 방금 들은 다른 말은 10초 동안 프레임에 같이 담긴다 — 다 가라앉은 뒤에 찍는다
    await hear(line, ids[0]);
    const before = (await store((s) => s.frames.length)) as number;
    await tap(T('shutter'));
    await expect.poll(() => store((s) => s.frames.length)).toBe(before + 1);
    const clues = (await store((s) => s.frames[s.frames.length - 1].clueIds)) as string[];
    console.log(`[${proj}] frame ${name}: ${clues.join(',')}`);
    expect(clues, `${name}: 첫 시도에 ${clue} 를 담아야 한다`).toContain(clue);
    await expect(T('shot-card')).toBeVisible();
  };
  await shootFilm('전교', [848, 880], ['hs_npc_messenger'], 'm2', 'cl_order');
  await shot('s2-film-order');
  await shootFilm('귓속말', [846, 880], ['hs_npc_clerk', 'hs_npc_red_official'], 'c3', 'cl_veteran');
  await shootFilm('살아 있소', [965, 1000], ['hs_npc_blue_official'], 'b5', 'cl_alive');
  expect(await store((s) => s.frames.length)).toBe(3);
  await shot('s2-film-3');
  await tap(T('replay-exit'));
  await expect(T('app-log')).toBeVisible();
  await closePanel();

  // ── DB: 들은 말 그대로 → 해당 기사 없음 ──
  await openMenuItem('db');
  await T('db-input').fill('대내로 들여오라');
  await tap(T('db-submit'));
  await expect(T('no-article')).toContainText('해당 기사 없음');
  await tap(T('chips').getByTestId('term-김일손'));
  await tap(T('record-rec_alt_kim_ilson'));
  await expect(T('record-view-rec_alt_kim_ilson')).toContainText('1498');
  await shot('s2-db-kim');
  await tap(T('record-back'));
  await T('db-input').fill('이극돈');
  await tap(T('db-submit'));
  await tap(T('record-rec_alt_yi_geukdon'));
  await expect(T('record-view-rec_alt_yi_geukdon')).toContainText('이극돈');
  await tap(T('record-back'));
  await closePanel();

  // ── 나머지 건(한 구간 재생까지는 목표를 채운다) ──
  await routine({ code: '#A-0502', line: 'a0502_l1', stamp: 'confirm' });
  await routine({ code: '#A-0503', line: 'a0503_l1', at: [629, 636], hs: 'hs_v_a0503_reader', inspect: [['a0503_heads', 'a0503o_heads']], frame: true, stamp: 'correct' });
  await routine({ code: '#A-0504', line: 'a0504_l1', stamp: 'confirm' });
  await shot('s2-a0504-done');
  await routine({ code: '#A-0505', line: 'a0505_l1', at: [557, 563], inspect: [['a0505_hong', 'a0505o_hong']], frame: true, stamp: 'correct' });
  await expect(T('processed')).toContainText('5');
  await expect(T('duty-end')).toBeVisible();
  await tap(T('duty-end'));
  await expect(T('shift-report')).toBeVisible();
  await expect(T('rp-replays')).toContainText('1');
  await shot('s2-shift-report');
  await tap(T('shift-next'));
  // 06:00 좌표 재계산: 찍어 둔 오후 구간이 흐려졌다
  await expect.poll(() => store((s) => s.degraded.length), { timeout: 8000 }).toBeGreaterThan(0);
  await msgOpen('senior');
  await expect(T('choices')).toBeVisible({ timeout: 12000 });
  await shot('s2-recalc-senior');
  await closePanel();

  // ════════ 근무 3 ════════
  await tap(T('duty-start'));
  await expect(T('slip')).toHaveAttribute('data-kind', 'rule', { timeout: 8000 });
  await expect(T('slip-reason')).toContainText('재관측');
  await shot('s3-rule-slip');
  await tap(T('slip-ok'));
  // 관측기 로그: 규정 5조 경고 대상 표시
  await openMenuItem('viewer');
  await expect(T('log-violation')).toBeVisible();
  await shot('s3-log-violation');
  await closePanel();

  // ── #C-4410 노이즈: 끝까지 → 자동 종결(정답) ──
  await nextCase('#C-4410');
  await waitView();
  await stampHold('stamp-auto_close');
  await expect(T('card-msg')).toBeVisible(); // 끝까지 보기 전
  await shot('s3-c4410-open');
  await scrubTo(1335, 1440);
  await stampHold('stamp-auto_close');
  await expect(T('impression')).toHaveAttribute('data-stamp', 'auto_close');
  await expect(T('warnings')).toHaveAttribute('data-live', '0');
  await shot('s3-c4410-closed');
  await routine({ code: '#A-0601', line: 'a0601_l1', at: [739, 745], inspect: [['a0601_verb', 'a0601o_verb']], frame: true, stamp: 'correct' });
  await nextCase('#C-0951');
  await waitView();
  await scrubTo(135, 600);
  await stampHold('stamp-auto_close');
  await expect(T('impression')).toHaveAttribute('data-stamp', 'auto_close');
  await routine({ code: '#A-0602', line: 'a0602_l1', inspect: [['a0602_count', 'a0602o_count']], stamp: 'confirm' });
  await shot('s3-a0602-done');

  // ── #C-2217 재탐지(기록 2건): 관측 생략 ──
  await nextCase('#C-2217');
  await expect(T('obs-dead')).toBeVisible();
  await expect(T('case-detection')).toContainText('2건');
  await shot('s3-c2217-redetect');
  await expect(T('duty-end')).toHaveCount(0);

  // ── 불일치 보고서(위원회 직송) ──
  await openMenuItem('work');
  await expect(T('report-tab')).toBeVisible();
  await tap(T('report-tab'));
  await expect(T('report')).toBeVisible();
  await shot('s3-report-empty');
  const frameWith = (clue: string) =>
    page.evaluate((c) => (window as unknown as { __STORE__: { getState(): { frames: { id: string; clueIds: string[] }[] } } }).__STORE__.getState().frames.find((f) => f.clueIds.includes(c))!.id, clue);
  const attach = async (blank: string, kind: 'frame' | 'record', id: string) => {
    await tap(T(`attach-open-${blank}`));
    await tap(T(`attach-${kind}-${id}`));
    await tap(page.locator('[data-testid="attach-sheet"] .sheet-done'));
    await expect(T('attach-sheet')).toHaveCount(0);
  };
  const detach = (blank: string, kind: string, id: string) => tap(T(`detach-${kind}-${id}-${blank}`));
  const fAlive = await frameWith('cl_alive');
  const fOrder = await frameWith('cl_order');
  const fVet = await frameWith('cl_veteran');
  // 첫 시도: 일부러 어긋나게
  await attach('who', 'record', 'rec_alt_kim_ilson');
  await attach('who', 'frame', fOrder);
  await attach('when', 'frame', fOrder);
  await attach('what', 'frame', fVet);
  await attach('result', 'record', 'rec_alt_kim_ilson');
  await T('year-from').fill('1498');
  await T('year-to').fill('1498');
  await tap(T('report-submit'));
  for (const k of ['when', 'who', 'what', 'result']) await expect(T(`feedback-${k}`)).toBeVisible();
  const verdicts = await Promise.all(['when', 'who', 'what', 'result'].map((k) => T(`verdict-${k}`).getAttribute('data-verdict')));
  expect(verdicts.filter((v) => v === 'confirmed').length).toBeLessThan(4);
  const fbText = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="feedback-"]')].map((e) => (e as HTMLElement).innerText).join('\n'));
  expect(fbText, '피드백에 연도 정답이 없다').not.toMatch(YEAR);
  expect(fbText, '피드백에 정답 이름이 없다').not.toMatch(/이극돈|무오사화/);
  await shot('s3-report-wrong');
  await detach('who', 'record', 'rec_alt_kim_ilson');
  await detach('who', 'frame', fOrder);
  await attach('who', 'frame', fVet);
  await attach('who', 'record', 'rec_alt_yi_geukdon');
  await detach('when', 'frame', fOrder);
  await attach('when', 'frame', fAlive);
  await attach('when', 'record', 'rec_alt_kim_ilson');
  await detach('what', 'frame', fVet);
  await attach('what', 'frame', fOrder);
  await detach('result', 'record', 'rec_alt_kim_ilson');
  await attach('result', 'frame', fOrder);
  await attach('result', 'record', 'rec_alt_kim_ilson');
  await tap(T('report-submit'));
  await expect(T('report-ready')).toBeVisible({ timeout: 6000 });
  for (const k of ['when', 'who', 'what', 'result']) expect(await T(`verdict-${k}`).getAttribute('data-verdict')).toBe('confirmed');
  await shot('s3-report-confirmed');
  // 도장(길게 누르기): 중간에 떼면 아무 일도 없다
  await hold(T('report-stamp'), 500);
  expect(await store((s) => s.filed.length)).toBe(0);
  await hold(T('report-stamp'), 1700);
  await expect(T('report-approved')).toBeVisible();
  await expect.poll(() => store((s) => s.shifts.length)).toBeGreaterThan(0);
  await shot('s3-report-approved');

  // ── 복원: 책상으로 돌아오면 일시가 채워지고, 경고장이 '해당 없음'으로 다시 쓰인다 ──
  await expect(page.locator('.panel')).toHaveCount(0, { timeout: 6000 });
  await expect(T('assign-when')).not.toContainText('####', { timeout: 9000 });
  await expect(T('assign-when')).toContainText('연산군');
  await shot('s3-restored-card');
  // 프린터가 규정 5조 경고장을 뱉는다 → 복원이 그 글자를 '해당 없음'으로 다시 쓴다
  await expect(T('slip')).toBeVisible({ timeout: 8000 });
  await expect(T('slip-reason')).toContainText('해당 없음', { timeout: 8000 });
  await shot('s3-slip-void');
  await tap(T('slip-ok'));
  await expect(T('warnings')).toHaveAttribute('data-live', '0');
  await tap(T('printer'));
  await expect(T('slip-list')).toContainText('해당 없음');
  await tap(page.locator('[data-testid="slip-list"] .sheet-x'));
  // 메신저: 지난 문장이 다시 쓰인다
  await msgOpen('chief');
  await expect(T('msg-m_chief_drawer')).toContainText('무오사화', { timeout: 15000 });
  await expect(T('msg-pencil-m_chief_drawer')).toBeVisible();
  await tap(T('msg-pencil-m_chief_drawer'));
  await expect(T('msg-orig-m_chief_drawer')).toContainText('서랍에 다시 넣어');
  await shot('s3-messenger-rewritten');
  if (await T('msg-back').count()) await tap(T('msg-back'));
  await tap(T('msg-thread-senior'));
  await expect(T('msg-m_senior_04')).toContainText('모르는 사람이 어디 있어', { timeout: 8000 });
  await shot('s3-epilogue-senior');
  await closePanel();

  // ── 근무 종료 → 보고 → 에피소드 끝 · 예고 ──
  await expect(T('duty-end')).toBeVisible();
  await tap(T('duty-end'));
  await expect(T('shift-report')).toBeVisible();
  await expect(T('rp-line')).toContainText('경고는 빠졌어');
  await shot('s3-shift-report');
  await tap(T('shift-next'));
  await expect(T('episode-end')).toBeVisible();
  await shot('s3-episode-end');
  await tap(T('open-teaser'));
  await expect(T('closed-cr_c0408')).toBeVisible();
  await expect(T('closed-cr_c3391')).toBeVisible();
  await tap(T('closed-cr_c0408'));
  await shot('s3-teaser');
  await closePanel();
  // 설정: 기록 열람 모드(검증/변조/재구성)
  await openMenuItem('settings');
  await tap(T('ledger-toggle'));
  await expect(T('case-ledger')).toContainText('변조');
  await expect(T('case-ledger')).toContainText('재구성');
  await shot('s3-ledger');
  await closePanel();

  // ════════ 새로고침 → 이어하기 ════════
  await page.waitForTimeout(1800); // 자동 저장
  await page.goto('/?test=1&boot=1');
  await expect(T('boot-continue')).toBeVisible({ timeout: 10000 });
  await shot('reload-login');
  await tap(T('boot-continue'));
  await expect(T('os')).toBeVisible({ timeout: 8000 });
  expect(await store((s) => s.frames.length)).toBe(3);
  expect(await store((s) => s.filed.length)).toBe(1);
  expect(await store((s) => s.duty.ended.length)).toBe(3);
  await expect(T('episode-end')).toBeVisible();
  await shot('after-reload');

  console.log(`[${proj}] 테스트 API 대체 입력 횟수: ${fallbacks}`);
  expect(errors, '콘솔 오류 없음').toEqual([]);
});
