import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';

/**
 * 결록 단말 전체 에피소드: 실제 UI(탭/클릭/포인터 이동)만으로 끝까지. __STORE__ 는 단언에만 쓴다.
 * 부트 → 손 노트 → 검색 → 메신저 → 관측 → 보드 → 보정 → 원문 → 연도 → 인과 → 기록하기 → 현실 이동 → 에필로그 → 이어하기.
 */
const SHOT_DIR = process.env.E2E_SHOTS ?? '/tmp/claude-0/-home-user-history/fd8b313c-786f-59e9-875b-1190f9568f2b/scratchpad/e2e2';
const touch = (info: TestInfo) => info.project.name.startsWith('mobile');

type St = any; // eslint-disable-line @typescript-eslint/no-explicit-any

test.describe.configure({ mode: 'serial' });

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) await page.screenshot({ path: `${SHOT_DIR}/FAIL-${info.project.name}.png` }).catch(() => undefined);
});

test('결록 단말: 처음부터 끝까지 터치만으로', async ({ page, browser }, info) => {
  test.setTimeout(420_000);
  const mobile = touch(info);
  const proj = info.project.name;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => (errors.push(`pageerror: ${e}`), console.log(`pageerror: ${e}`)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  let n = 0;
  let steps = 0;
  const shot = async (name: string) => {
    n++;
    await page.screenshot({ path: `${SHOT_DIR}/${proj}-${String(n).padStart(2, '0')}-${name}.png` });
  };
  const store = <T,>(fn: (s: St) => T): Promise<T> =>
    page.evaluate((src) => {
      // eslint-disable-next-line no-new-func
      const f = new Function('s', `return (${src})(s)`);
      return f((window as unknown as { __STORE__: { getState(): unknown } }).__STORE__.getState());
    }, fn.toString()) as Promise<T>;
  /** 한 번의 탭/클릭(실제 포인터 이벤트) */
  const tap = async (l: Locator) => {
    steps++;
    await l.scrollIntoViewIfNeeded();
    if (mobile) await l.tap();
    else await l.click();
  };
  const T = (id: string) => page.getByTestId(id);
  const visibleT = async (id: string) => expect(T(id).first()).toBeVisible();
  /** 레이아웃 점검: 가로 스크롤 없음, 보이는 버튼 터치 타깃 ≥ 44px(모바일) */
  const layout = async (label: string) => {
    const r = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
      small: [...document.querySelectorAll('button, [role="tab"], [role="slider"]')]
        .filter((e) => {
          const b = e.getBoundingClientRect();
          const st = getComputedStyle(e);
          return b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && b.bottom > 0 && b.top < window.innerHeight && !e.classList.contains('term') && !(e as HTMLElement).closest('[hidden], .coach-layer, details:not([open]) > :not(summary)');
        })
        .map((e) => ({ t: (e.getAttribute('data-testid') || e.textContent || '').trim().slice(0, 24), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }))
        .filter((e) => Math.min(e.w, e.h) < 44),
    }));
    expect(r.sw, `${label}: no horizontal scroll`).toBeLessThanOrEqual(r.iw + 1);
    if (mobile) expect(r.small, `${label}: touch targets >= 44px`).toEqual([]);
  };
  const dock = async (app: string) => {
    // 데스크톱: 이미 앞에 있는 앱의 독 버튼은 최소화이므로 누르지 않는다
    if (!mobile && (await store((s) => s.ui.app)) === app && (await T(`win-${app}`).isVisible())) return;
    await tap(T(`dock-${app}`));
  };
  const toDb = async () => {
    await dock('search');
    const tabDb = T('tab-db');
    if ((await tabDb.count()) && (await tabDb.isVisible()) && (await tabDb.getAttribute('aria-selected')) !== 'true') await tap(tabDb);
  };
  const searchChip = async (term: string) => {
    await toDb();
    await tap(T('search-input').locator('xpath=ancestor::form/following-sibling::*[@data-testid="chips"]').getByTestId(`chip-${term}`));
  };
  /** 안 읽은 풍선을 끝까지 탭해서 읽는다(선택지에서 멈춘다) */
  const readThread = async (thread: string) => {
    await dock('messenger');
    if (!(await T(`conv-${thread}`).count())) {
      const back = page.getByRole('button', { name: '대화 목록' });
      if (!(await T(`thread-${thread}`).count()) && (await back.count())) await tap(back); // 다른 대화가 열려 있으면 목록으로
      if (!(await T(`thread-${thread}`).count())) return; // 아직 없는 대화
      await tap(T(`thread-${thread}`));
    }
    for (let i = 0; i < 12; i++) {
      const closed = T('msg-closed');
      if (!(await closed.count())) break;
      await tap(closed.first()).catch(() => undefined); // 연달아 읽히는 중이면 이미 사라졌다
      await page.waitForTimeout(1200);
    }
  };
  /** 근거 카드 고르기(이미 골라져 있으면 그대로 둔다 — 창이 열려 있는 데스크톱에서는 선택이 남아 있다) */
  const pickEv = async (id: string) => {
    const c = page.locator('.picker').getByTestId(`ev-${id}`);
    await c.scrollIntoViewIfNeeded();
    if ((await c.getAttribute('aria-pressed')) !== 'true') await tap(c);
  };
  const resultText = () => T('search-message').innerText();

  // ────────────────────────── B0 부트: 콜드 오픈 → 로그인 ──────────────────────────
  await page.goto('/?test=1&boot=1');
  await visibleT('cold-open');
  await expect(page.locator('.cold-note .smudge')).toBeVisible();
  await shot('boot-cold-open');
  await page.waitForTimeout(500);
  for (let i = 0; i < 8 && (await T('cold-open').count()); i++) {
    await tap(T('cold-open')); // 첫 탭 = 타이핑 즉시 완성, 다음 탭 = 다음 줄
    await page.waitForTimeout(250);
  }
  await visibleT('boot-login');
  await shot('boot-login');
  await tap(T('boot-login'));
  await visibleT('os');
  await expect(T('dock-notebook')).toBeVisible();
  expect(await store((s) => s.apps ?? null)).toBeNull();
  await layout('home');
  await shot('home');

  // ────────────────────────── B0 손 노트 → 번진 단어 검색 ──────────────────────────
  await dock('notebook');
  await visibleT('app-notebook');
  await expect(T('note-note_cold')).toContainText('무오█화 — 계속 조사');
  await layout('notebook');
  await shot('notebook-cold');
  await tap(T('term-무오█화'));
  await visibleT('app-db');
  await expect(T('search-message')).toContainText('그런 단어 없음');
  await visibleT('no-article');
  await shot('search-no-word');
  expect(await store((s) => s.searched.includes('se_muo'))).toBe(true);
  // 직접 입력도 된다
  await T('search-input').fill('무오사화');
  await tap(T('search-submit'));
  await expect(T('search-message')).toContainText('그런 단어 없음');

  // ────────────────────────── B1 메신저: 깜빡이는 메시지 → 밑줄 이름 ──────────────────────────
  await expect(T('dock-messenger')).toBeVisible({ timeout: 8000 });
  await dock('messenger');
  await visibleT('app-messenger');
  await shot('messenger-list');
  await tap(T('thread-colleague'));
  const blink = T('msg-closed').first();
  await expect(blink).toBeVisible();
  await expect(blink).toHaveClass(/blink/);
  await shot('messenger-blinking');
  await tap(blink);
  await expect(T('msg-m_c_01')).toBeVisible({ timeout: 6000 });
  await expect(T('msg-m_c_01')).toContainText('사인 없는 졸년 기록');
  await layout('messenger');
  await shot('messenger-read');
  await tap(T('term-김일손').first());
  await visibleT('hit-se_kim_ilson');
  await expect(T('record-rec_alt_kim_ilson')).toContainText('기록 없음');
  await shot('search-kim-ilson');
  expect(await store((s) => s.flags.prologue_anomaly)).toBe(true);


  // ────────────────────────── B2 원인 없는 죽음 → 답장 → 탁영금 ──────────────────────────
  await searchChip('권오복');
  await readThread('colleague');
  await expect(T('choice-ch_three')).toBeVisible();
  await shot('messenger-reply-choices');
  await tap(T('choice-ch_three'));
  await expect(T('reply-m_c_02')).toBeVisible();
  await readThread('colleague');
  await expect(T('msg-m_c_04')).toBeVisible();
  await searchChip('탁영금');
  await expect(T('hit-se_takyeong')).toBeVisible();
  await shot('search-takyeong');
  expect(await store((s) => s.flags.obs_link_001)).toBe(true);
  await expect(T('dock-viewer')).toBeVisible({ timeout: 8000 });
  await layout('search');

  // ────────────────────────── B5~8 관측 ──────────────────────────
  await dock('viewer');
  await visibleT('viewer-start');
  await expect(T('meta-panel')).toContainText('####');
  await shot('viewer-intro');
  await tap(T('viewer-start'));
  await visibleT('observing-pill');
  await expect(T('meta-panel')).toContainText('연도');
  await expect(T('meta-panel')).toContainText('####');
  await page.waitForFunction(() => (window as any).__VIEWER__?.listHotspots().length > 0, undefined, { timeout: 20000 }); // eslint-disable-line @typescript-eslint/no-explicit-any
  await page.waitForTimeout(800);
  await shot('viewer-start');
  const noYear = async (label: string) => {
    const bad = await page.evaluate(() => {
      const t = (document.querySelector('[data-testid="app-viewer"]') as HTMLElement).innerText;
      return t.match(/(?<![\d#])\d{4}(?![\d#])/g) ?? [];
    });
    expect(bad, `${label}: 4자리 연도가 보이면 안 된다`).toEqual([]);
  };
  await noYear('observation start');

  const scrubTo = async (minute: number) => {
    const track = T('scrub-track');
    const box = (await track.boundingBox())!;
    const frac = (minute - 480) / 660;
    steps++;
    const pos = { x: Math.max(2, Math.min(box.width - 2, box.width * frac)), y: box.height / 2 };
    if (mobile) await track.tap({ position: pos });
    else await track.click({ position: pos });
    const cur = Number(await T('scrubber').getAttribute('data-minute'));
    const diff = Math.round((minute - cur) / 5);
    for (let i = 0; i < Math.abs(diff); i++) await tap(T(diff > 0 ? 'scrub-fwd' : 'scrub-back'));
    await page.waitForTimeout(150);
    return Number(await T('scrubber').getAttribute('data-minute'));
  };
  let dragged = 0;
  let canvasTaps = 0;
  let listTaps = 0;
  /** 캔버스에서 실제 포인터로 탭. 화면 밖/겹침이면 '보이는 것' 목록으로 대신한다. */
  const hit = async (target: string, minute: number, opts: { forceList?: boolean } = {}) => {
    const m = await scrubTo(minute);
    expect(Math.abs(m - minute), `scrub ${target}@${minute}`).toBeLessThanOrEqual(4);
    const id = `hs_${target}`;
    const before = await store((s) => s.stats?.taps ?? s.lastTap?.minute ?? 0);
    void before;
    let ok = false;
    if (!opts.forceList) {
      const info = await page.evaluate((hid) => (window as any).__VIEWER__.listHotspots().find((h: any) => h.id === hid && h.available) ?? null, id); // eslint-disable-line @typescript-eslint/no-explicit-any
      const canvas = (await page.locator('.viewer-canvas canvas').first().boundingBox())!;
      if (info && info.x > canvas.x + 6 && info.x < canvas.x + canvas.width - 6 && info.y > canvas.y + 6 && info.y < canvas.y + canvas.height - 6) {
        steps++;
        if (mobile) await page.touchscreen.tap(info.x, info.y);
        else await page.mouse.click(info.x, info.y);
        await page.waitForTimeout(200);
        ok = await store((s) => s.lastTap?.hotspotId) .then((v) => v === id);
        if (ok) canvasTaps++;
      }
    }
    if (!ok) {
      const det = T('hotspot-list');
      if (!(await det.evaluate((d) => (d as HTMLDetailsElement).open))) await tap(det.locator('summary'));
      await tap(T(`hotspot-${id}`));
      listTaps++;
    }
    expect(await store((s) => s.lastTap?.hotspotId), `${target}@${minute}`).toBe(id);
    await noYear(`${target}@${minute}`);
  };

  await hit('npc_clerk', 480);
  await expect(T('tap-panel')).not.toContainText('지금은 보이지 않음');
  await shot('viewer-tap-clerk');
  await layout('viewer');
  await hit('obs_store_sacho', 480);
  await hit('npc_red_official', 480);
  await hit('npc_messenger', 500);
  await shot('viewer-scrubbed-500');
  await hit('npc_young_official', 620);
  await expect(T('tap-panel')).toContainText('안쪽 방의 꾸러미');
  await hit('obs_hall_desk_scribe', 650);
  await hit('npc_young_official', 750);
  await hit('npc_clerk', 800);
  await hit('npc_messenger', 845);
  await shot('viewer-order-845');
  expect(await store((s) => s.lastTap.lines[0].provenance)).toBe('verified');
  await hit('obs_hall_desk_red', 850);
  await hit('npc_blue_official', 850);
  await hit('npc_red_official', 930);
  expect(await store((s) => s.flags.f_saw_sealing)).toBe(true);
  await hit('npc_blue_official', 1000);
  await hit('npc_red_official', 1000);
  await expect(T('tap-panel')).toContainText('미확인 관료');
  await shot('viewer-end-scene');
  console.log(`canvas taps ${canvasTaps}, list taps ${listTaps}`);
  expect(canvasTaps, 'key hotspots tapped on the canvas with real pointer').toBeGreaterThanOrEqual(3);
  await noYear('observation end');
  await tap(T('viewer-end'));
  await expect(T('viewer-start')).toBeVisible();
  await expect(await store((s) => s.ui.observation)).toBeFalsy();
  await expect(T('dock-board')).toBeVisible({ timeout: 8000 });


  // ────────────────────────── B8 본 것이 실록에 없다 ──────────────────────────
  await searchChip('김일손의 사초');
  await expect(T('search-message')).toContainText('해당 기사 없음');
  await visibleT('no-article');
  await shot('search-no-article-card');
  expect(await store((s) => s.evidence.ev_author_alive)).toBe(1);
  await dock('notebook');
  await tap(T('nb-tab-memo'));
  await expect(T('memo-memo_order')).toBeVisible();
  await shot('notebook-memo-before-correction');
  await tap(T('nb-tab-hand'));
  await expect(T('note-note_no_article')).toBeVisible();
  await readThread('colleague');
  await expect(T('choice-ch_saw')).toBeVisible();
  await tap(T('choice-ch_saw'));
  await readThread('colleague');

  // ────────────────────────── B9 첫 판정(인물) → 그 밤의 보정(말소) ──────────────────────────
  await dock('board');
  await visibleT('app-board');
  await tap(T('board-tab-person'));
  await layout('board-person');
  await shot('board-person');
  await tap(T('cand-per_kim_ilson'));
  await pickEv('ev_unknown_official');
  await pickEv('ev_veteran');
  await tap(T('submit-deduction'));
  await expect(T('verdict')).toHaveAttribute('data-verdict', 'wrong');
  await shot('board-person-wrong');
  expect(await store((s) => s.corrections)).toEqual(['corr_001']);
  await expect(T('dip')).toBeVisible({ timeout: 3000 });
  await shot('correction-dip');
  await page.waitForTimeout(1800);
  await dock('notebook');
  await tap(T('nb-tab-memo'));
  await expect(T('memo-memo_order')).toHaveCount(0); // 단말 메모는 사라졌다
  await shot('notebook-memo-erased');
  await tap(T('nb-tab-hand'));
  await expect(T('note-note_no_article')).toBeVisible(); // 손 노트는 그대로
  await readThread('colleague');
  await expect(T('msg-m_c_07')).toBeVisible();
  await shot('messenger-after-correction');
  await dock('board');
  await expect(T('cand-more')).toBeVisible(); // 후보가 더 필요하다는 안내(정답 아님)
  await searchChip('성종대왕 실록'); // 관청과 관련된 말을 검색하면 새 후보가 생긴다
  await dock('board');
  await tap(T('cand-per_yi_geukdon'));
  await pickEv('ev_unknown_official');
  await pickEv('ev_veteran');
  await tap(T('submit-deduction'));
  await expect(T('verdict')).toHaveAttribute('data-verdict', 'confirmed');
  await shot('board-person-confirmed');

  // ────────────────────────── B11 원문 대조 권한 ──────────────────────────
  await readThread('colleague');
  await expect(T('choice-ch_insist')).toBeVisible();
  await tap(T('choice-ch_insist'));
  expect(await store((s) => s.flags.source_access)).toBe(true);

  // ────────────────────────── B12 들은 말 → 원문 → 구절 ──────────────────────────
  for (const t of ['성종대왕', '성종대왕 실록', '집에 둔 사초', '조의제문', '經國大典', '세조대왕 실록']) await searchChip(t);
  expect(await store((s) => s.evidence.ev_sillokcheong)).toBe(1);
  await dock('search');
  await tap(T('tab-library'));
  await visibleT('app-reader');
  const pickSource = async (id: string) => {
    const libs: string[] = await store((s) => s.sources);
    if (!(await T('shelf-list').count())) await tap(T('shelf-toggle'));
    await tap(T('shelf-list').locator('button').nth(libs.indexOf(id)));
  };
  const stampPhrase = async (id: string) => {
    await tap(T(`phrase-${id}`));
    await expect(T('phrase-result')).toContainText('');
    await expect(T(`phrase-${id}`)).toHaveClass(/stamped/);
  };
  await pickSource('src_compile_order');
  await shot('reader-compile-order');
  await stampPhrase('ph_compile');
  await pickSource('src_myoho');
  await stampPhrase('ph_myoho_seong');
  await stampPhrase('ph_myoho_daehaeng');
  await shot('reader-myoho-stamped');
  await layout('reader');
  await tap(T('tab-db'));
  await searchChip('대행왕');
  await dock('notebook');
  await tap(T('nb-tab-archive'));
  await tap(T('exhibit-ex_daehaengwang'));
  await visibleT('exhibit-panel');
  await shot('archive-daehaengwang');
  await tap(T('exhibit-panel').getByRole('button', { name: '닫기' }));


  // ────────────────────────── B13 연도(짧은 중간 퍼즐): 성종 재위 함정 ──────────────────────────
  const setYear = async (which: 'from' | 'to', y: number) => {
    const input = T(`year-${which}-input`);
    await input.fill(String(y));
    await input.press('Enter');
    await expect(input).toHaveValue(String(y));
  };
  /** 카드를 진짜 포인터로 끌어서 연표에 올린다. 한 화면에 카드와 연표가 함께 안 들어오는 낮은 화면은 탭 대체 경로. */
  const dragCard = async (id: string) => {
    const card = T(`year-card-${id}`);
    await card.scrollIntoViewIfNeeded();
    const vh = page.viewportSize()!.height;
    const b = (await card.boundingBox())!;
    const z = (await T('year-dropzone').boundingBox())!;
    const ty = z.y + 24;
    if (vh < 520 || ty > vh - 110 || ty < 120 || b.y < 100 || b.y > vh - 110) return tap(T(`year-add-${id}`));
    steps++;
    await page.mouse.move(b.x + 12, b.y + 12);
    await page.mouse.down();
    await page.mouse.move(b.x + 40, b.y + 30, { steps: 4 });
    await page.mouse.move(z.x + z.width / 2, ty, { steps: 8 });
    await page.mouse.up();
    dragged++;
  };
  await dock('board');
  await tap(T('board-tab-year'));
  await visibleT('year-panel');
  await expect(T('year-shape-ev_myoho')).toHaveText('이후');
  await expect(T('year-shape-ev_author_alive')).toHaveText('이전');
  for (const fb of await page.locator('[data-testid^="year-feedback-"]').allInnerTexts()) expect(fb).not.toMatch(/\d{4}/); // 카드 고유 피드백에 정답 연도 없음
  await expect(page.locator('[data-testid^="year-feedback-"]').first()).toBeVisible();
  await shot('year-panel-cards');
  await layout('year-panel');
  await tap(T('year-add-ev_myoho'));
  // 성종 재위만으로 범위를 적는다(함정): 확정되지 않고 정답도 드러나지 않는다
  await setYear('from', 1469);
  await setYear('to', 1494);
  await tap(T('submit-deduction'));
  await expect(T('verdict')).toHaveAttribute('data-verdict', 'wrong');
  expect(await T('verdict').innerText()).not.toMatch(/1498|1495/);
  expect(await store((s) => s.flags.ded_year_confirmed)).toBeFalsy();
  await shot('year-trap-wrong');
  // 카드를 진짜 끌어서 올린다(드래그) + 나머지는 버튼
  await dragCard('ev_sillokcheong');
  await expect(T('year-row-ev_sillokcheong')).toBeVisible();
  await tap(T('year-add-ev_author_alive'));
  await expect(T('year-bracket')).toHaveCount(0);
  await setYear('from', 1495);
  await setYear('to', 1498);
  await shot('year-three-cards');
  await tap(T('submit-deduction'));
  await expect(T('verdict')).toHaveAttribute('data-verdict', 'partial');
  await shot('year-partial');
  // 스테퍼 탭(드래그·타자 없이도 가능): +1 한 번, −1 한 번
  await tap(T('year-to-p1'));
  await expect(T('year-to-input')).toHaveValue('1499');
  await tap(T('year-to-m1'));
  await expect(T('year-to-input')).toHaveValue('1498');

  // 카드 겹치기: 틀린 짝 → 맞는 짝
  await tap(T('board-tab-combine'));
  await tap(T('csel-ev_royal_order'));
  await tap(T('csel-ev_lawbook'));
  await tap(T('combine-go'));
  await expect(T('combine-result')).toBeVisible();
  expect(await store((s) => s.evidence.ev_same_month)).toBeUndefined();
  await tap(T('csel-ev_lawbook'));
  await tap(T('csel-ev_royal_order')); // 해제
  await tap(T('csel-ev_db_deaths'));
  await tap(T('csel-ev_royal_order'));
  await tap(T('combine-go'));
  await expect(T('combine-result')).toHaveClass(/res-linked/);
  await shot('combine-linked');
  expect(await store((s) => s.evidence.ev_same_month)).toBe(0);

  await tap(T('board-tab-year'));
  await tap(T('year-add-ev_same_month'));
  await tap(T('year-add-ev_author_alive'));
  await setYear('from', 1498);
  await setYear('to', 1498);
  await tap(T('submit-deduction'));
  await expect(T('verdict')).toHaveAttribute('data-verdict', 'confirmed');
  await shot('year-confirmed');
  expect(await store((s) => s.flags.ded_year_confirmed)).toBe(true);

  // ────────────────────────── B13' 기록하기 1: 점선을 따라 쓴다 ──────────────────────────
  const traceIt = async () => {
    const area = T('trace-area');
    await area.scrollIntoViewIfNeeded();
    const box = (await area.boundingBox())!;
    steps++;
    await page.mouse.move(box.x + 6, box.y + 14);
    await page.mouse.down();
    for (let i = 0; i < 14; i++) {
      const y = box.y + 14 + ((i * 11) % Math.max(20, box.height - 24));
      await page.mouse.move(i % 2 ? box.x + 6 : box.x + box.width - 6, y, { steps: 10 });
    }
    await page.mouse.up();
  };
  await dock('notebook');
  await tap(T('nb-tab-hand'));
  await visibleT('record-trace');
  await shot('record-trace-ready');
  await layout('record');
  const dipSeen = T('dip').waitFor({ state: 'visible', timeout: 10_000 });
  await traceIt();
  await expect.poll(() => store((s) => s.shifts), { timeout: 5000 }).toEqual(['shift_order']);
  await dipSeen;
  await shot('reality-shift-1-dip');
  // 복원 쪽이 자동으로 열린다 + 복원 도장
  await expect(T('diff-page')).toBeVisible({ timeout: 6000 });
  await expect(T('diff-page')).toContainText('복원');
  await expect(T('diff-page')).toContainText('해당 기사 없음');
  await shot('reality-shift-1-diff');
  // 메신저: 말이 바뀌어 있고, 연필 표시가 옛 문장을 보여 준다
  await readThread('colleague');
  await expect(T('msg-m_c_06a')).toContainText('실록에 그대로 있는 기사');
  await tap(T('pencil-m_c_06a'));
  await expect(T('pencil-old-m_c_06a')).toContainText('어제는 이렇게 말했었다');
  await shot('messenger-rewritten-pencil');
  // 이제 평범한 결과
  await searchChip('김일손의 사초');
  await expect(T('search-message')).not.toContainText('해당 기사 없음');
  await expect(T('hit-se_sacho_order')).not.toContainText('해당 기사 없음');
  await shot('search-order-now-ordinary');
  await dock('search');
  await tap(T('open-source-src_sacho_order'));
  await visibleT('app-reader');
  await stampPhrase('ph_order');
  await stampPhrase('ph_six');
  await shot('reader-restored-source');

  // ────────────────────────── 기록하기 2: 길게 눌러 도장(대체 경로) ──────────────────────────
  await dock('notebook');
  await tap(T('nb-tab-hand'));
  await visibleT('record-stamp');
  const stamp = T('record-stamp');
  await stamp.scrollIntoViewIfNeeded();
  const sb = (await stamp.boundingBox())!;
  steps++;
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await shot('record-stamp-holding');
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await expect.poll(() => store((s) => s.shifts), { timeout: 5000 }).toContain('shift_person');
  await page.waitForTimeout(2200);
  expect(await store((s) => s.recorded)).toEqual(expect.arrayContaining(['act_order', 'act_person']));

  // ────────────────────────── B14 인과(봉우리): 틀린 화살표 → 구체 피드백 → 확정 ──────────────────────────
  await dock('board');
  await tap(T('board-tab-chain'));
  await visibleT('chain-panel');
  await layout('chain');
  await tap(T('node-n_plague'));
  await tap(T('node-n_deaths'));
  await tap(T('link-ev-0-ev_db_deaths'));
  await tap(T('submit-deduction'));
  await expect(T('verdict')).toHaveAttribute('data-verdict', 'wrong');
  await expect(T('link-0').locator('.link-fb').first()).toBeVisible(); // 그 화살표에 대한 구체 피드백
  const specific = await T('link-0').locator('.link-fb').first().innerText();
  expect(specific.length).toBeGreaterThan(8);
  await shot('chain-wrong-feedback');
  await tap(T('link-remove-0'));
  await tap(T('node-n_jouijemun'));
  await tap(T('node-n_order'));
  await tap(T('link-ev-0-ev_jouijemun'));
  await tap(T('link-ev-0-ev_royal_order'));
  await tap(T('submit-deduction'));
  await expect(T('verdict')).toHaveAttribute('data-verdict', 'undetermined');
  await shot('chain-missing-link');
  await tap(T('node-n_order'));
  await tap(T('node-n_deaths'));
  await tap(T('link-ev-1-ev_same_month'));
  await tap(T('submit-deduction'));
  await expect(T('verdict')).toHaveAttribute('data-verdict', 'confirmed');
  await shot('chain-confirmed');

  // ────────────────────────── 기록하기 3 → 세 번째 현실 이동(무오사화) ──────────────────────────
  await dock('notebook');
  await tap(T('nb-tab-hand'));
  await visibleT('record-trace');
  await traceIt();
  await expect.poll(() => store((s) => s.shifts), { timeout: 5000 }).toContain('shift_cause');
  await expect(T('diff-page')).toBeVisible({ timeout: 6000 });
  await expect(T('diff-nd_cold')).toContainText('무오█화 — 계속 조사');
  await shot('reality-shift-3-diff');
  await readThread('colleague');
  await expect(T('msg-m_c_01')).toContainText('무오사화 때 화를 입은 사관이야');
  await tap(T('pencil-m_c_01'));
  await expect(T('pencil-old-m_c_01')).toContainText('사인 없는 졸년 기록');
  await toDb();
  await T('search-input').fill('무오사화');
  await tap(T('search-submit'));
  await expect(T('search-message')).not.toContainText('그런 단어 없음');
  await shot('search-muo-sahwa-restored');

  // ────────────────────────── 에필로그: 동료는 원래 알고 있었다 ──────────────────────────
  for (const th of ['colleague', 'system', 'device', 'mail']) await readThread(th);
  await readThread('colleague');
  await expect(T('msg-m_ep_06')).toContainText('그걸 모르는 사람이 어디 있어');
  await shot('epilogue-colleague');
  await dock('notebook');
  await tap(T('nb-tab-hand'));
  await expect(T('note-note_only_me')).toContainText('나만 기억한다. 바뀌기 전을.');
  await shot('epilogue-only-me');

  // 기록관 → 예고
  await tap(T('nb-tab-archive'));
  for (const ex of ['ex_center', 'ex_takyeong', 'ex_timeline']) {
    await tap(T(`exhibit-${ex}`));
    await visibleT('exhibit-panel');
    await shot(`exhibit-${ex}`);
    await tap(T('exhibit-panel').getByRole('button', { name: '닫기' })); // 낮은 화면에선 패널이 진열장을 가린다
  }
  await shot('archive-center');
  await expect.poll(() => store((s) => s.inbox), { timeout: 5000 }).toEqual(expect.arrayContaining(['m_teaser_01', 'm_teaser_02', 'm_teaser_03']));
  for (const th of ['colleague', 'system', 'device', 'mail']) await readThread(th);
  await shot('teaser');

  // 기록 열람 모드(엔딩 뒤): 변조 → 검증
  await dock('notebook');
  await tap(T('nb-tab-archive'));
  await tap(T('arch-ledger'));
  await expect(T('ledger-orig-rec_alt_kim_ilson')).toHaveText('변조');
  await expect(T('ledger-now-rec_alt_kim_ilson')).toHaveText('검증');
  await shot('ledger');
  await layout('ledger');

  // ────────────────────────── 새로 고침 → 이어하기 ──────────────────────────
  await page.waitForTimeout(1500); // 자동 저장
  await page.goto('/?test=1&boot=1');
  await visibleT('boot-continue');
  await shot('reload-login-continue');
  await tap(T('boot-continue'));
  await visibleT('os');
  await expect.poll(() => store((s) => s.shifts.length), { timeout: 5000 }).toBe(3);
  expect(await store((s) => s.recorded.length)).toBe(3);
  await dock('messenger');
  await readThread('colleague');
  await expect(T('msg-m_c_01')).toContainText('무오사화 때 화를 입은 사관이야');
  await shot('reload-restored');

  console.log(`[${proj}] steps (taps/clicks/gestures): ${steps}, real drags: ${dragged}, canvas taps: ${canvasTaps}, list taps: ${listTaps}`);
  expect(errors).toEqual([]);
});
