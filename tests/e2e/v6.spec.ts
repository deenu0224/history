/**
 * v6 「기록을 따라가 그날을 고정한다」 Ep0 e2e. 모든 조작은 실제 탭·길게 누르기.
 * 경로: 제목 → 프롤로그 건너뛰기 → 콜드 오픈 → 시작 기록(원문 보기, 오답 한 번) → 관측 1(쪽 넘기기) → 맞춰 보기 K1·K2·K3·K4·F
 *   → 역사 고정(길게 누르기) → 복원 3박자 → 끝 카드. 이미지 요청 0건.
 * 화면 캡처(모바일 390×844): mockups/out/v6-build/*.png
 */
import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const SHOTS = 'mockups/out/v6-build';
fs.mkdirSync(SHOTS, { recursive: true });

const tid = (page: Page, id: string) => page.getByTestId(id);

/** 이미지 요청·콘솔 오류·실패한 요청을 모은다. 앱 아이콘(/icons/)은 규칙 7의 예외다. */
function watch(page: Page) {
  const images: string[] = [];
  const errs: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'image' && !/\/icons\//.test(r.url())) images.push(r.url());
  });
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errs.push(`requestfailed: ${r.url()}`));
  page.on('response', (r) => {
    if (r.status() >= 400) errs.push(`http ${r.status()}: ${r.url()}`);
  });
  return { images, errs };
}

/** 주머니 시트에서 카드 둘을 골라 맞춰 본다(시트가 닫혀 있으면 연다) */
async function combine(page: Page, a: string, b: string) {
  if (!(await tid(page, 'bag-sheet').isVisible())) await tid(page, 'center-combine').click();
  await expect(tid(page, 'bag-sheet')).toBeVisible();
  // 고른 것은 시트를 닫아도 남는다 — 먼저 칸을 비운다
  while (await tid(page, 'slot-clear').count()) await tid(page, 'slot-clear').first().click();
  for (const id of [a, b]) {
    const card = tid(page, 'bag-sheet').locator(`[data-card="${id}"][data-testid="bag-card"]`);
    await card.click();
    await expect(card).toHaveAttribute('data-picked', 'true');
  }
  await tid(page, 'combine').click();
}
const closeBag = async (page: Page) => {
  await tid(page, 'nav-back').click();
  await expect(tid(page, 'bag-sheet')).toHaveCount(0);
};

test('v6 Ep0 끝까지', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile';
  let n = 0;
  const shot = async (name: string) => {
    if (!mobile) return;
    n += 1;
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${SHOTS}/${String(n).padStart(2, '0')}-${name}.png` });
  };
  const { images, errs } = watch(page);

  await page.goto('/?test=1');
  await expect(tid(page, 'start')).toBeVisible();
  await shot('title');
  await tid(page, 'start').click();
  await expect(tid(page, 'boot-line')).toBeVisible();
  await shot('prologue');
  await tid(page, 'skip').click();
  await expect(tid(page, 'boot-line')).toContainText('22:31');
  await shot('cold-open');
  await tid(page, 'next').click();
  await tid(page, 'next').click();

  // ── 시작 기록 ──
  await expect(tid(page, 'record')).toHaveAttribute('data-node', 'N0');
  await page.evaluate(() => (window as unknown as { __STORE__: { getState(): { setSettings(p: object): void } } }).__STORE__.getState().setSettings({ fastMessages: true }));
  await expect(tid(page, 'goal-bar')).toContainText("이 문장의 '누가'를 밝혀라");
  const app = page.locator('.app');
  const text0 = await app.innerText();
  expect(text0).not.toContain('#C-2209');
  expect(text0).not.toContain('관측기 로그');
  expect(text0).not.toContain('허구');
  expect(text0).not.toContain('자동 탐지');
  // 기록을 열면 그 기록의 단서가 주머니에 들어가고 「+n 단서」를 알린다(밑줄마다 모으지 않는다)
  await expect(tid(page, 'clue-gain')).toHaveText('+6 단서');
  await expect(tid(page, 'clue-count')).toHaveAttribute('data-got', '6');
  expect(await page.locator('.v6-ul').count()).toBeGreaterThanOrEqual(6);
  // 연결 칩은 첫 화면에서 스크롤 없이 보인다
  const chip = tid(page, 'link-n0_n1');
  await expect(chip).toContainText('시간');
  await expect(chip).toContainText('같은 날 · 관측 1');
  const cb = (await chip.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(cb.y + cb.height).toBeLessThanOrEqual(vp.height - 56);
  await shot('start-record');

  // 원문 보기: 열고 닫는다. 복원 전에는 출처의 왕대·연도가 가려져 있다.
  await tid(page, 'wonmun-toggle-m_head').click();
  const panel = tid(page, 'wonmun-m_head');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('집현전 부제학(集賢殿副提學) 최만리(崔萬理) 등이 상소하기를,');
  await expect(tid(page, 'wonmun-source-m_head')).toHaveAttribute('data-hidden', 'true');
  await expect(tid(page, 'wonmun-source-m_head')).toContainText('출처는 복원 뒤에 보인다');
  const open0 = await app.innerText();
  expect(open0).not.toMatch(/세종 ?\d+년|세종실록|1444/);
  await shot('wonmun-open');
  await tid(page, 'wonmun-toggle-m_head').click();
  await expect(panel).toHaveCount(0);

  // 틀린 맞춰 보기 한 번: 「왜 아닌지」는 시트 안에 나온다
  await combine(page, 'c_tail', 'c_s_seol');
  const why = tid(page, 'bag-sheet').getByTestId('why-not');
  await expect(why).toBeVisible();
  await expect(why).toHaveText(/글 속 설총 줄/);
  expect(await page.getByTestId('why-not').count()).toBe(1);
  await shot('bag-why-not');
  await closeBag(page);
  await expect(page.getByTestId('why-not')).toHaveCount(0);

  // ── 관측 1 ──
  await tid(page, 'link-n0_n1').click();
  await expect(tid(page, 'record')).toHaveAttribute('data-node', 'N1');
  await expect(tid(page, 'record')).toContainText('하위지의 눈');
  await expect(tid(page, 'clue-gain')).toHaveText('+1 단서');
  await expect(tid(page, 'page-1')).toContainText('副提學(부제학)');
  await shot('observe-1');
  await tid(page, 'dot-2').click();
  await expect(tid(page, 'record')).toHaveAttribute('data-page', '1');
  await expect(tid(page, 'clue-gain')).toHaveText('+2 단서');
  await tid(page, 'next-page').click();
  await expect(tid(page, 'record')).toHaveAttribute('data-furthest', '2');
  await expect(tid(page, 'clue-count')).toHaveAttribute('data-got', '5');
  await expect(tid(page, 'page-3')).toBeVisible();
  await shot('observe-3');

  // ── 맞춰 보기: K1 → K2 → K3 → K4 → F ──
  await combine(page, 'c_title', 'c_r_choi');
  const res = tid(page, 'bag-sheet').getByTestId('result-conclusion');
  await expect(res).toHaveText(/부제학 최만리/);
  // 새 결론은 한 번만: 결과 상자에 문구, 주머니에서는 그 카드가 강조되고 문구를 되풀이하지 않는다
  const sheetText = await tid(page, 'bag-sheet').innerText();
  expect(sheetText.split('두루마리를 편 관원 = 부제학 최만리').length - 1).toBe(1);
  await expect(tid(page, 'bag-sheet').locator('[data-card="k_A"].fresh')).toHaveCount(1);
  await shot('bag-conclusion');
  await combine(page, 'k_A', 'c_eonmun');
  await expect(tid(page, 'bag-sheet').getByTestId('result-conclusion')).toContainText('높은 자리의 사람');
  await combine(page, 'c_tail', 'c_unseo');
  await expect(tid(page, 'bag-sheet').getByTestId('result-conclusion')).toContainText("'누가'");
  await combine(page, 'k_B', 'k_C');
  await expect(tid(page, 'bag-sheet').getByTestId('result-conclusion')).toContainText('언문을 만든');
  await combine(page, 'k_E', 'c_gunsang');
  await expect(tid(page, 'bag-sheet').getByTestId('result-goal')).toBeVisible();
  await shot('bag-goal');
  await closeBag(page);
  await expect(tid(page, 'goal-bar')).toHaveAttribute('data-status', 'solved');
  await tid(page, 'goal-bar').click();
  await expect(tid(page, 'record')).toHaveAttribute('data-node', 'N0');
  await expect(tid(page, 'found-lines')).toBeVisible();
  await shot('goal-solved');

  // 메신저(한 선임): 말이 도착한다
  await tid(page, 'nav-messenger').click();
  await expect(tid(page, 'their-msg').first()).toBeVisible({ timeout: 20_000 });
  await shot('messenger');
  await tid(page, 'nav-back').click();

  // ── 역사 고정(길게 누르기) ──
  await tid(page, 'center-fix').click();
  await expect(tid(page, 'pin')).toBeVisible();
  await expect(tid(page, 'pin-sentence')).toContainText('임금이');
  await expect(tid(page, 'pin-sentence')).toContainText(/\[ ─+ \]/);
  await expect(tid(page, 'citation')).toHaveCount(0);
  await shot('pin');
  const hold = tid(page, 'pin-hold');
  const hb = (await hold.boundingBox())!;
  // 짧게 누르면 손해 없이 「길게 누르세요」
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect(hold).toContainText('길게 누르세요');
  expect(await page.evaluate(() => (window as unknown as { __STORE__: { getState(): { s: { fixed: boolean } } } }).__STORE__.getState().s.fixed)).toBe(false);
  await page.waitForTimeout(1700);
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await shot('pin-holding');
  await page.waitForTimeout(800);
  await page.mouse.up();
  await expect(tid(page, 'pin')).toHaveAttribute('data-restored', 'true');

  // 복원 1박자: 단락이 돌아오고 출처가 처음 보인다
  await expect(tid(page, 'seal')).toBeVisible();
  await expect(tid(page, 'citation')).toContainText('『세종실록』 103권, 세종 26년 2월 20일 경자');
  await expect(tid(page, 'pin-sentence')).not.toContainText('[ ');
  await expect(tid(page, 'fix-rate')).toHaveAttribute('data-pct', '100');
  await shot('restored-paragraph');
  // 복원 2박자: 시작 기록이 고정됨으로, 이웃 기록이 돌아온다
  await page.waitForTimeout(500);
  await tid(page, 'restored-next').click();
  await expect(tid(page, 'record')).toHaveAttribute('data-node', 'N0');
  await expect(tid(page, 'seal')).toBeVisible();
  await expect(tid(page, 'link-n0_n11')).toBeVisible();
  await expect(tid(page, 'goal-bar')).toHaveAttribute('data-status', 'fixed');
  await shot('restored-record');
  // 복원 3박자: 07 독백
  await tid(page, 'next-beat').click();
  await expect(tid(page, 'mono')).toContainText('한글을 지은 임금, 세종');
  await shot('monologue');
  await tid(page, 'next-beat').click();
  await expect(tid(page, 'end-card')).toContainText('다음 기록 준비 중');
  await shot('end-card');
  expect(await page.evaluate(() => (window as unknown as { __STORE__: { getState(): { s: { epilogueDone: boolean } } } }).__STORE__.getState().s.epilogueDone)).toBe(true);

  expect(images, '그림 요청 없음').toEqual([]);
  expect(errs).toEqual([]);
});
