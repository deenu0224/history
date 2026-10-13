import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';

/**
 * 에피소드 1 전체 플레이스루: 메인 메뉴 → 프롤로그 → 연구실 → 관측 #001 → 연도/인물/사건 추리
 * → 귀환 → 기록관 → 에필로그/티저 → 저장·이어하기.
 * 실제 UI(클릭/탭/키보드)로 진행하며, 월드 이동은 테스트 훅(__GAME__)을 보조로 쓴다.
 * 각 씬에서 최소 한 번은 진짜 입력(데스크톱 E 키, 모바일 탭)으로 상호작용한다.
 */

const SHOT_DIR = process.env.E2E_SHOTS ?? '/tmp/claude-0/-home-user-history/fd8b313c-786f-59e9-875b-1190f9568f2b/scratchpad/e2e';

type Game = {
  getPlayerTile(): { x: number; y: number };
  getSceneId(): string;
  teleport(x: number, y: number): void;
  interactWith(id: string): boolean;
  walkTo(x: number, y: number): boolean;
  listInteractives(): { id: string; kind: string; x: number; y: number }[];
  getTime(): number;
  objectTexture(id: string): string | null;
  cameraInfo(): { zoom: number; scrollX: number; scrollY: number; w: number; h: number; mapW: number; mapH: number };
};

const isMobile = (info: TestInfo) => info.project.name.startsWith('mobile');

/** 데스크톱은 클릭, 모바일은 실제 터치 탭 */
let cur: TestInfo;
async function press(l: Locator, info: TestInfo) {
  if (isMobile(info)) await l.tap();
  else await l.click();
}

/** 모바일 레이아웃 점검: 가로 스크롤 없음, 터치 타깃 ≥44px, 본문 글자 ≥14px */
async function checkLayout(page: Page, info: TestInfo, selectors: string[] = []) {
  const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1);
  expect(noScroll, 'no horizontal page scroll').toBe(true);
  if (!isMobile(info)) return;
  for (const sel of selectors) {
    for (const el of await page.locator(sel).all()) {
      if (!(await el.isVisible())) continue;
      const b = (await el.boundingBox())!;
      expect(Math.min(b.width, b.height), `touch target ${sel}`).toBeGreaterThanOrEqual(43.5);
    }
  }
}

async function shot(page: Page, info: TestInfo, name: string) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: `${SHOT_DIR}/${info.project.name}-${name}.png` });
}

const store = (page: Page) => ({
  flag: (f: string) => page.evaluate((k) => Boolean((window as any).__STORE__.getState().flags[k]), f),
  evidence: () => page.evaluate(() => ({ ...(window as any).__STORE__.getState().evidence }) as Record<string, number>),
  collection: () => page.evaluate(() => ({ ...(window as any).__STORE__.getState().collection }) as Record<string, number>),
  solved: () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).__STORE__.getState().solved))),
  scene: () => page.evaluate(() => (window as any).__STORE__.getState().currentScene as string),
});

async function gameScene(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__GAME__?.getSceneId() ?? '');
}
async function waitScene(page: Page, id: string) {
  await expect.poll(() => gameScene(page), { timeout: 25_000, message: `scene ${id}` }).toBe(id);
  // 전환 페이드가 끝날 때까지
  await page.waitForTimeout(900);
}

/** 대화/시퀀스를 끝까지 넘긴다. 데스크톱은 키보드(E), 모바일은 탭. */
async function advanceAll(page: Page, info: TestInfo, opts: { maxSteps?: number; dialogOnly?: boolean } = {}) {
  const mobile = isMobile(info);
  for (let i = 0; i < (opts.maxSteps ?? 80); i++) {
    const dlg = page.locator(opts.dialogOnly ? '.dialog.panel:not(.dialog-confirm)' : '.dialog.panel:not(.dialog-confirm), .seq');
    if (!(await dlg.first().isVisible().catch(() => false))) {
      await page.waitForTimeout(150);
      if (!(await dlg.first().isVisible().catch(() => false))) return;
    }
    if (mobile) {
      const box = await dlg.first().boundingBox();
      if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + Math.min(box.height / 2, 40));
    } else {
      await page.keyboard.press('e');
    }
    await page.waitForTimeout(130);
  }
  throw new Error('dialog never ended');
}

/** 캔버스 위 타일 → 화면 좌표(CSS px) */
async function tileToScreen(page: Page, x: number, y: number) {
  const cam = await page.evaluate(() => (window as any).__GAME__.cameraInfo());
  const box = (await page.locator('.game-canvas canvas').boundingBox())!;
  const wx = x * 32 + 16;
  const wy = y * 32 + 16;
  // Phaser: 화면 = (월드 - scroll) * zoom, scroll 은 줌 중심 보정 포함 (displayWidth 기준)
  const px = (wx - (cam.scrollX + cam.w / 2)) * cam.zoom + cam.w / 2;
  const py = (wy - (cam.scrollY + cam.h / 2)) * cam.zoom + cam.h / 2;
  return { x: box.x + (px * box.width) / cam.w, y: box.y + (py * box.height) / cam.h };
}

/** 진짜 입력으로 상호작용: 데스크톱은 대상 옆으로 이동 후 E, 모바일은 대상을 탭(걸어가서 상호작용). */
async function realInteract(page: Page, info: TestInfo, id: string, dx = 0, dy = 1) {
  const list = await page.evaluate(() => (window as any).__GAME__.listInteractives());
  const t = list.find((i: { id: string }) => i.id === id);
  expect(t, `interactive ${id}`).toBeTruthy();
  if (isMobile(info)) {
    await page.evaluate(([x, y]) => (window as any).__GAME__.teleport(x, y), [t.x + dx, t.y + dy] as const);
    await page.waitForTimeout(500); // 카메라 추적
    const p = await tileToScreen(page, t.x, t.y);
    await page.touchscreen.tap(p.x, p.y - 8);
  } else {
    await page.evaluate(([x, y]) => (window as any).__GAME__.teleport(x, y), [t.x + dx, t.y + dy] as const);
    await page.waitForTimeout(400);
    await page.keyboard.press('e');
  }
  await expect(page.locator('.dialog.panel')).toBeVisible({ timeout: 12_000 });
}

/** 훅으로 상호작용(오브젝트 또는 NPC). NPC 는 현재 위치로 이동 후 대화. */
async function hookInteract(page: Page, id: string) {
  await expect
    .poll(async () => (await page.evaluate(() => (window as any).__GAME__.listInteractives())).some((i: { id: string }) => i.id === id), {
      timeout: 40_000,
      message: `${id} present`,
    })
    .toBe(true);
  const ok = await page.evaluate((i) => (window as any).__GAME__.interactWith(i), id);
  expect(ok).toBe(true);
  await expect(page.locator('.dialog.panel')).toBeVisible({ timeout: 8_000 });
}

async function interactAndRead(page: Page, info: TestInfo, id: string, real = false) {
  if (real) await realInteract(page, info, id);
  else await hookInteract(page, id);
  await advanceAll(page, info);
}

async function openPanel(page: Page, info: TestInfo, label: string) {
  const nav = page.locator('.tabbar, .hud-buttons').getByRole('button', { name: label });
  await expect(nav.first()).toBeVisible();
  await press(nav.first(), info);
}

async function closeModal(page: Page) {
  await press(page.locator('.modal-close').first(), cur);
  await expect(page.locator('.modal')).toHaveCount(0);
}

async function clickCard(page: Page, id: string) {
  const c = page.locator('.picker').getByTestId(`ev-${id}`);
  await c.scrollIntoViewIfNeeded();
  await press(c, cur);
  await expect(c).toHaveAttribute('aria-pressed', 'true');
}

async function setYear(page: Page, label: string, v: number) {
  const input = page.getByLabel(`${label} 연도 연도`, { exact: true });
  await input.fill(String(v));
  await input.blur();
  await expect(input).toHaveValue(String(v));
}

async function submit(page: Page) {
  const b = page.getByTestId('submit-deduction');
  await b.scrollIntoViewIfNeeded();
  await press(b, cur);
  const v = page.getByTestId('verdict');
  await expect(v).toBeVisible();
  await v.scrollIntoViewIfNeeded();
  return (await v.getAttribute('data-verdict'))!;
}

async function pickTab(page: Page, name: string) {
  await press(page.getByRole('tab', { name }), cur);
}

test('episode 1 is playable start to finish', async ({ page }, info) => {
  test.setTimeout(900_000);
  cur = info;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const S = store(page);

  // ── 메인 메뉴 ─────────────────────────────────────────────
  await page.goto('/?test=1');
  await expect(page.getByRole('button', { name: '새로 시작' })).toBeVisible();
  await expect(page.getByRole('button', { name: '이어하기' })).toHaveCount(0);
  await press(page.getByRole('button', { name: '새로 시작' }), info);

  // ── 프롤로그 ──────────────────────────────────────────────
  await expect(page.locator('.seq')).toBeVisible();
  await page.waitForTimeout(1200);
  await shot(page, info, '01-prologue');
  await advanceAll(page, info);
  await waitScene(page, 'lab');
  await shot(page, info, '02-lab');

  // ── 연구실: 진짜 입력(E / 탭)으로 DB 단말 조사 → DB 화면 ─────
  await realInteract(page, info, 'lab_db_console');
  await advanceAll(page, info);
  await expect(page.locator('.modal-db')).toBeVisible();
  await shot(page, info, '03-database');
  // 인물 추리 후보로 쓸 인물을 DB 에서 열람한다 (이극돈·유자광·어세겸·김일손)
  for (const name of ['김일손', '이극돈', '유자광', '어세겸']) {
    await page.getByLabel('검색').fill(name);
    const row = page.locator('.db-row', { hasText: name }).first();
    await expect(row, `DB entry ${name}`).toBeVisible();
    await press(row, info);
    await expect(page.getByRole('heading', { name: new RegExp(name) })).toBeVisible();
    // 모바일은 상세가 목록을 대체한다 → 목록으로
    const back = page.getByRole('button', { name: /목록/ });
    if (await back.isVisible().catch(() => false)) await press(back, info);
  }
  await page.getByLabel('검색').fill('');
  await press(page.locator('.modal-db .modal-close'), info);
  await expect(page.locator('.modal-db')).toHaveCount(0);
  expect(await S.flag('prologue_anomaly')).toBe(true);

  // 관측 장치는 연구가 끝나기 전엔 나타나지 않는다
  expect((await page.evaluate(() => (window as any).__GAME__.listInteractives())).some((i: { id: string }) => i.id === 'lab_observe_chair')).toBe(false);

  await interactAndRead(page, info, 'lab_case_takyeong');
  expect(await S.flag('research_takyeong')).toBe(true);
  await interactAndRead(page, info, 'lab_person_terminal'); // DB 화면이 뜬다
  await expect(page.locator('.modal-db')).toBeVisible();
  await press(page.locator('.modal-db .modal-close'), info);
  expect(await S.flag('research_kim_ilson')).toBe(true);

  // 현재 목표 표시
  await expect(page.locator('.hud-objective')).toContainText('관측 장치');

  // ── 관측 시작 ─────────────────────────────────────────────
  await hookInteract(page, 'lab_observe_chair');
  await expect(page.locator('.dialog-confirm')).toBeVisible();
  await shot(page, info, '04-observe-confirm');
  await press(page.locator('.dialog-confirm').getByRole('button', { name: '관측을 시작한다' }), info);
  await waitScene(page, 'obs001');
  expect(await S.flag('obs001_entered')).toBe(true);

  // HUD: 연도 미상, 화면 어디에도 네 자리 연도가 없다
  await expect(page.locator('.hud-fields')).toContainText('연도');
  await expect(page.locator('.hud-fields')).toContainText('미상');
  const visibleText = async () => page.evaluate(() => document.body.innerText);
  expect(await visibleText()).not.toMatch(/(?<!\d)1[3-9]\d\d(?!\d)/);
  await page.waitForTimeout(600);
  await shot(page, info, '05-obs001-arrival');
  await checkLayout(page, info, ['.tabbar-btn']);
  if (isMobile(info)) {
    // 휴대폰: 캐릭터가 충분히 크게 보인다(가로 ~8~10타일 세로 / 가로 모드는 더 넓게), 기기 픽셀 정수 배율
    const cam = await page.evaluate(() => (window as any).__GAME__.cameraInfo());
    const portrait = page.viewportSize()!.height > page.viewportSize()!.width;
    const tilesAcross = cam.w / cam.zoom / 32;
    if (portrait) expect(tilesAcross).toBeGreaterThanOrEqual(7.5), expect(tilesAcross).toBeLessThanOrEqual(10.5);
    else expect(cam.h / cam.zoom / 32).toBeLessThanOrEqual(8.5), expect(cam.h / cam.zoom / 32).toBeGreaterThanOrEqual(5);
    expect(Number.isInteger(cam.zoom)).toBe(true);
    // 탭 이동: 바닥을 탭하면 그 타일로 걸어간다
    const from = await page.evaluate(() => (window as any).__GAME__.getPlayerTile());
    const target = { x: from.x, y: from.y - 2 };
    const sp = await tileToScreen(page, target.x, target.y);
    await page.touchscreen.tap(sp.x, sp.y);
    await expect
      .poll(async () => (await page.evaluate(() => (window as any).__GAME__.getPlayerTile())).y, { timeout: 8000 })
      .toBeLessThan(from.y - 1);
  }

  // ── 관청 탐색: 증거 수집 ──────────────────────────────────
  await interactAndRead(page, info, 'obs_gate_signboard');
  await realInteract(page, info, 'npc_clerk'); // 진짜 입력으로 NPC 와 대화
  await page.waitForTimeout(900);
  await shot(page, info, '06-npc-dialogue');
  await advanceAll(page, info);
  expect(await S.flag('f_heard_myoho')).toBe(true);
  await interactAndRead(page, info, 'obs_store_sacho');
  expect(await S.flag('f_saw_bundles')).toBe(true);
  await interactAndRead(page, info, 'obs_hall_desk_scribe');
  await interactAndRead(page, info, 'obs_hall_manuscript');
  await interactAndRead(page, info, 'npc_messenger'); // 전교 전
  expect(await S.flag('f_saw_order')).toBe(false);
  await interactAndRead(page, info, 'npc_red_official');
  expect(await S.flag('f_met_official')).toBe(true);
  await interactAndRead(page, info, 'npc_clerk');
  await interactAndRead(page, info, 'npc_young_official');
  expect(await S.flag('f_heard_jouijemun')).toBe(true);
  await interactAndRead(page, info, 'npc_messenger');
  expect(await S.flag('f_saw_order')).toBe(true);
  await interactAndRead(page, info, 'npc_blue_official');
  expect(await S.flag('f_saw_sealing')).toBe(true);
  expect(await visibleText()).not.toMatch(/이극돈/);

  // 도감에는 아직 정체가 밝혀지지 않은 카드만
  await openPanel(page, info, isMobile(info) ? '도감' : '도감');
  await expect(page.locator('.modal')).toBeVisible();
  await shot(page, info, '07-codex');
  await closeModal(page);

  // ── 귀환 ──────────────────────────────────────────────────
  await hookInteract(page, 'obs_return_point');
  await expect(page.locator('.dialog-confirm')).toBeVisible();
  await press(page.locator('.dialog-confirm').getByRole('button', { name: '귀환한다' }), info);
  await waitScene(page, 'archive'); // 귀환 지점은 개인 기록관
  expect(await S.flag('obs001_returned')).toBe(true);
  // 귀환 직후 독백
  await expect(page.locator('.dialog.panel')).toBeVisible({ timeout: 8_000 });
  await advanceAll(page, info);
  // 진열대는 아직 비어 있다
  expect(await page.evaluate(() => (window as any).__GAME__.objectTexture('arc_center_case'))).toBe('obj_case_empty');
  // 분석실로 올라간다
  await page.evaluate(() => (window as any).__GAME__.interactWith('arc_door_lab'));
  await waitScene(page, 'lab');

  // ── 연구실 대조: 증거 단계 상승 ────────────────────────────
  for (const id of ['lab_st_title', 'lab_st_institution', 'lab_st_person2', 'lab_st_sillok', 'lab_st_law']) {
    if (id === 'lab_st_title') await interactAndRead(page, info, id, true);
    else await interactAndRead(page, info, id);
  }
  const ev = await S.evidence();
  for (const id of ['ev_myoho', 'ev_sillokcheong', 'ev_jouijemun', 'ev_author_alive']) expect(ev[id], id).toBe(1);

  // ── 연도 추리 ─────────────────────────────────────────────
  await openPanel(page, info, '추론');
  await expect(page.getByRole('tab', { name: /연대 추론/ })).toBeVisible();
  await checkLayout(page, info, ['.step']);
  // 1) 성종 재위만 주장: 확정이 아니며 정답을 알려 주지 않는다
  await setYear(page, '시작', 1469);
  await setYear(page, '종료', 1494);
  await clickCard(page, 'ev_myoho');
  const wrong = await submit(page);
  expect(wrong).not.toBe('confirmed');
  expect(wrong).toBe('wrong');
  await shot(page, info, '08-year-wrong');
  // 판정 패널은 정답을 알려 주지 않는다(증거 카드의 자기 연구 내용과 구분)
  expect(await page.getByTestId('verdict').innerText()).not.toMatch(/1498|1495/);
  await page.getByTestId('verdict').scrollIntoViewIfNeeded();

  // 2) 스테퍼(탭)가 실제로 동작하는지
  await setYear(page, '시작', 1495);
  await press(page.getByRole('button', { name: '시작 연도 +1', exact: true }), info);
  await expect(page.getByLabel('시작 연도 연도')).toHaveValue('1496');
  await press(page.getByRole('button', { name: '시작 연도 -1', exact: true }), info);
  await expect(page.getByLabel('시작 연도 연도')).toHaveValue('1495');
  await press(page.getByRole('button', { name: '종료 연도 +10', exact: true }), info);
  await press(page.getByRole('button', { name: '종료 연도 -10', exact: true }), info);

  // 3) 부분 확정: 묘호·실록청·살아 있는 작성자 → 1495~1498
  await setYear(page, '종료', 1498);
  await clickCard(page, 'ev_sillokcheong');
  await clickCard(page, 'ev_author_alive');
  const partial = await submit(page);
  expect(partial).toBe('partial');
  expect(await S.flag('ded_year_partial')).toBe(true);

  // 4) 확정: 조의제문 + 작성자 생존
  await setYear(page, '시작', 1498);
  await clickCard(page, 'ev_jouijemun');
  const confirmed = await submit(page);
  expect(confirmed).toBe('confirmed');
  expect(await S.flag('ded_year_confirmed')).toBe(true);
  await shot(page, info, '09-year-confirmed');

  // ── 인물 추리 ─────────────────────────────────────────────
  await pickTab(page, '인물 추리');
  await press(page.getByTestId('cand-per_yi_geukdon'), info);
  await clickCard(page, 'ev_unknown_official');
  // 근거가 부족하면 판정 보류(정답 후보도 오답 후보와 같은 취급)
  expect(await submit(page)).toBe('undetermined');
  await clickCard(page, 'ev_veteran');
  expect(await submit(page)).toBe('confirmed');
  expect(await S.flag('ded_person_confirmed')).toBe(true);
  await shot(page, info, '10-person-confirmed');

  // ── 사건 추리 ─────────────────────────────────────────────
  await pickTab(page, '사건 해결');
  await press(page.getByTestId('stmt-st_routine'), info);
  for (const id of ['ev_royal_order', 'ev_six_articles']) await clickCard(page, id);
  expect(await submit(page)).toBe('wrong');
  await press(page.getByTestId('stmt-st_crisis'), info);
  expect(await submit(page)).toBe('confirmed');
  expect(await S.flag('ded_event_confirmed')).toBe(true);
  await shot(page, info, '11-event-confirmed');
  await closeModal(page);

  // ── 에필로그(세 추리 확정 직후, 연구실에서) ───────────────────
  await expect(page.locator('.seq-epilogue')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1000);
  await shot(page, info, '13-epilogue');
  await advanceAll(page, info);
  await expect(page.locator('.seq')).toHaveCount(0);

  // ── 기록관 ────────────────────────────────────────────────
  await page.evaluate(() => (window as any).__GAME__.interactWith('lab_door_archive'));
  await waitScene(page, 'archive');
  expect(await page.evaluate(() => (window as any).__GAME__.objectTexture('arc_center_case'))).toBe('obj_case_empty');
  await interactAndRead(page, info, 'arc_case_takyeong');
  await interactAndRead(page, info, 'arc_person_register');
  await interactAndRead(page, info, 'arc_timeline');
  await interactAndRead(page, info, 'arc_shelf_sources');
  // 사료 열람(전체 화면 리더)
  await openPanel(page, info, '도감');
  await press(page.getByRole('tab', { name: /사료/ }), info);
  let opened = false;
  for (const tile of await page.locator('.codex-list .tile').all()) {
    await press(tile, info);
    const btn = page.getByRole('button', { name: '사료 열람' });
    if (await btn.isVisible().catch(() => false)) {
      await press(btn, info);
      opened = true;
      break;
    }
  }
  expect(opened, 'a readable source exists').toBe(true);
  await page.waitForTimeout(500);
  await shot(page, info, '12a-reader');
  await checkLayout(page, info);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (await page.locator('.modal').count()) await closeModal(page);
  await expect(page.locator('.modal')).toHaveCount(0);
  await realInteract(page, info, 'arc_center_case');
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.objectTexture('arc_center_case'))).toBe('obj_case_filled');
  await page.waitForTimeout(700);
  await shot(page, info, '12-archive-after-return'); // 진열대가 채워진 모습(대화 중)
  await advanceAll(page, info, { dialogOnly: true });
  expect(await S.flag('archive_center_seen')).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.objectTexture('arc_center_case'))).toBe('obj_case_filled');

  // ── 티저 ──────────────────────────────────────────────────
  await expect(page.locator('.seq-teaser')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(800);
  await shot(page, info, '14-teaser');
  await advanceAll(page, info);
  await expect(page.locator('.seq')).toHaveCount(0);

  const collected = Object.values(await S.collection()).filter((v) => v >= 1).length;
  expect(collected).toBeGreaterThanOrEqual(8);

  // ── 저장 → 새로고침 → 이어하기 ─────────────────────────────
  await openPanel(page, info, '설정');
  await press(page.getByRole('button', { name: '저장', exact: true }), info);
  await expect(page.getByText('저장했다.')).toBeVisible();
  await closeModal(page);
  await page.waitForTimeout(800); // 자동 저장 디바운스
  const before = { ev: await S.evidence(), solved: await S.solved(), col: await S.collection() };

  await page.reload();
  await page.waitForFunction(() => Boolean((window as any).__STORE__));
  await expect(page.getByRole('button', { name: '이어하기' })).toBeVisible();
  await press(page.getByRole('button', { name: '이어하기' }), info);
  await waitScene(page, 'archive');
  expect(await S.evidence()).toEqual(before.ev);
  expect(await S.solved()).toEqual(before.solved);
  expect(await S.collection()).toEqual(before.col);
  for (const f of ['ded_year_confirmed', 'ded_person_confirmed', 'ded_event_confirmed', 'archive_center_seen']) expect(await S.flag(f), f).toBe(true);
  expect(await page.evaluate(() => (window as any).__GAME__.objectTexture('arc_center_case'))).toBe('obj_case_filled');
  // 이미 본 에필로그/티저는 다시 나오지 않는다
  await page.waitForTimeout(1500);
  await expect(page.locator('.seq')).toHaveCount(0);

  expect(errors.filter((e) => !/favicon|AudioContext|autoplay/i.test(e))).toEqual([]);
});
