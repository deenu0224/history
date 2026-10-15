/**
 * v5 「눈을 빌려 다시 쓰기」 e2e. 모든 조작은 실제 탭(클릭·길게 누르기·드래그)이다.
 * 새 게임 정답 경로: 프롤로그 → 에피소드 0 「하룻밤」(컷 3장 넘기기 → 두루마리 세부 탭 → T0a → 최만리 카드 → 「세종」 링크 → T0b →
 *   기록 다시 쓰기 → 복원 → 다리) → 에피소드 1(콜드 오픈 23:04 → T1~T4 이름 붙이기 → 눈 닫힘 → 모순 X1·X2 → 다시 쓰기 → 복원 → 예고).
 * 화면 캡처: mockups/out/v5-ui/*.png (390×844) — 에피소드 0 은 ep0-NN-*.png, 에피소드 1 은 NN-*.png
 */
import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { bareHanja } from '../../src/ui/lib/text';

const SHOTS = 'mockups/out/v5-ui';
let shotNo = 0;
let ep0No = 0;
fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (page: Page, name: string) => {
  shotNo += 1;
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/${String(shotNo).padStart(2, '0')}-${name}.png` });
};
const shot0 = async (page: Page, name: string) => {
  ep0No += 1;
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/ep0-${String(ep0No).padStart(2, '0')}-${name}.png` });
};

/** 화면에 한글 읽기 없는 한자가 없다(DEDUCTION_RULES 7) — 화면마다 훑는다 */
const expectReadings = async (page: Page, where: string) => {
  const text = await page.locator('.app').innerText();
  expect(bareHanja(text), `한글 읽기 없는 한자 (${where})`).toEqual([]);
};

/** 콘솔 오류·페이지 오류를 모은다(글꼴·이미지 404 포함) */
function watchErrors(page: Page) {
  const errs: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errs.push(`requestfailed: ${r.url()}`));
  page.on('response', (r) => {
    if (r.status() >= 400) errs.push(`http ${r.status()}: ${r.url()}`);
  });
  return errs;
}

const tid = (page: Page, id: string) => page.getByTestId(id);

/** 뷰어: 컷 n(1부터)으로 — 점을 탭 */
const toCut = async (page: Page, eye: number, n: number) => {
  await tid(page, `dot-${eye}-${n}`).click();
  await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-index', String(n - 1));
};
const viewAll = async (page: Page, eye: number, count = 5) => {
  for (let n = 1; n <= count; n++) await toCut(page, eye, n);
};
const figure = (page: Page, cut: string, fig: string) => page.locator(`[data-cut="${cut}"] [data-figure="${fig}"]`);

/** 이름 붙이기: 사람 탭 → 카드 탭 → 근거 탭 → 확인 */
async function tagWith(page: Page, cut: string, fig: string, card: string, ev: string) {
  await figure(page, cut, fig).click();
  await expect(tid(page, 'tag-sheet')).toBeVisible();
  await tid(page, `card-${card}`).click();
  await tid(page, `ev-${ev}`).click();
  await tid(page, 'tag-confirm').click();
}

/** 메신저를 열어 밀린 말을 다 읽는다(답장은 늘 첫 선택지). 실제 플레이어가 하듯이. back=false 면 메신저에 머문다 */
async function readChat(page: Page, back = true) {
  await tid(page, 'dock-messenger').click();
  let stable = 0;
  let last = -1;
  for (let i = 0; i < 90 && stable < 4; i++) {
    const reply = tid(page, 'replies').locator('button').first();
    if (await reply.isVisible()) {
      await reply.click();
      stable = 0;
    }
    const n = await page.locator('.msg, .sysline').count();
    const typing = await tid(page, 'typing').isVisible();
    stable = n === last && !typing ? stable + 1 : 0;
    last = n;
    await page.waitForTimeout(1000);
  }
  if (back) await tid(page, 'messenger-back').click();
}

const holdSubmit = async (page: Page) => {
  const b = tid(page, 'btn-submit');
  await b.scrollIntoViewIfNeeded();
  const box = (await b.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
};

/** 왼쪽 가장자리에서 오른쪽으로 밀기(iOS 식 뒤로) */
const edgeBack = async (page: Page) => {
  const ab = (await page.locator('.app').boundingBox())!;
  const y = ab.y + ab.height * 0.45;
  await page.mouse.move(ab.x + 6, y);
  await page.mouse.down();
  await page.mouse.move(ab.x + 160, y + 6, { steps: 10 });
  await page.mouse.up();
};

/** 아래 막대 3칸: 높이 ≤56, 칸마다 ≥44px, 뒤로는 왼쪽 아래 엄지 영역 */
const expectNavBar = async (page: Page, where: string) => {
  const bar = page.locator('nav.navbar').last();
  await expect(bar, where).toBeVisible();
  const bb = (await bar.boundingBox())!;
  expect(bb.height, `${where}: 막대 높이`).toBeLessThanOrEqual(57);
  expect(bb.y + bb.height, `${where}: 맨 아래`).toBeGreaterThan(844 - 4);
  for (const b of await bar.locator('button').all()) {
    const r = (await b.boundingBox())!;
    expect(r.height, `${where}: 버튼 높이`).toBeGreaterThanOrEqual(44);
    expect(r.width, `${where}: 버튼 폭`).toBeGreaterThanOrEqual(44);
  }
  // 위쪽에 뒤로 버튼이 없다
  expect(await page.locator('nav.navbar button[aria-label="뒤로"]').count(), `${where}: 뒤로는 아래 막대에만`).toBe(await page.locator('button[aria-label="뒤로"]').count());
};

/** 컷을 실제로 밀어 넘긴다(오른쪽 → 왼쪽 드래그) */
const swipeLeft = async (page: Page) => {
  const sb = (await tid(page, 'stage').boundingBox())!;
  await page.mouse.move(sb.x + sb.width * 0.85, sb.y + sb.height * 0.62);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width * 0.3, sb.y + sb.height * 0.62, { steps: 8 });
  await page.mouse.up();
};

test.describe('v5 전체 플레이', () => {
  test.setTimeout(600_000);
  test.beforeEach(({ page: _p }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', '휴대폰 세로(390×844)에서만 전체 경로를 돈다');
  });

  test('새 게임: 에피소드 0 「하룻밤」에서 에피소드 1 까지 — 실제 탭으로', async ({ page }) => {
    const errs = watchErrors(page);
    shotNo = 0;
    ep0No = 0;
    // 이전 전체 경로 캡처(00~89, ep0-)를 비운다 — 번호가 섞이지 않게(90번대는 따로 찍는 화면)
    for (const f of fs.readdirSync(SHOTS)) if (/^[0-8]\d-.*\.png$/.test(f) || /^ep0-.*\.png$/.test(f)) fs.unlinkSync(`${SHOTS}/${f}`);
    await page.goto('/?test=1&boot=1');

    // ═══ 에피소드 0 「하룻밤」 ═══
    // ── 부트 → 프롤로그(건너뛰기) → 콜드 오픈 22:31 → 홈
    await expect(tid(page, 'start')).toBeVisible();
    await shot0(page, 'title');
    await tid(page, 'start').click();
    await expect(tid(page, 'boot-line')).toContainText('언제부터인지');
    await shot0(page, 'prologue');
    await expectReadings(page, '프롤로그');
    await tid(page, 'next').click();
    await tid(page, 'next').click();
    await tid(page, 'skip').click();
    await expect(tid(page, 'boot-line')).toContainText('22:31');
    await shot0(page, 'cold-open');
    await tid(page, 'next').click();
    await tid(page, 'next').click();
    await expect(tid(page, 'assign-card')).toContainText('#C-2209');
    await expect(tid(page, 'home-date')).toHaveText('####');
    await expect(tid(page, 'home-place')).toHaveText('미확인');
    // 에피소드 0 에는 찾기·그날의 방이 없다 — 버튼도 없다
    await expect(tid(page, 'dock-search')).toHaveCount(0);
    await expect(tid(page, 'btn-rewrite')).toHaveCount(0);
    // Ep0 엔 찾기가 없다 — 무너진 실록 단락이 홈 카드에 그대로 뜬다(국역 조각만 남고 나머지는 청록 빈자리 밑줄 — 한 가지 모양)
    await expect(tid(page, 'home-record')).toContainText('그날 실록');
    await expect(tid(page, 'home-record-0')).toContainText(/\[ \? \] 소\(疏\)를 보고, \[ ─+ \] 설총\(薛聰\)의 \[ ─+ \] 운서\(韻書\)를 아느냐\. \[ ─+ \] 누가 이를 바로잡을 것이냐\./);
    await expect(tid(page, 'home-record-0')).not.toContainText('만리(萬理) 등에게');
    await expect(tid(page, 'home-record-1')).toContainText('똑같이 무너진 옆 기록');
    // 그날 고정률(하루 전체 하나)
    await expect(tid(page, 'fix-rate')).toHaveAttribute('data-pct', '0');
    await expect(tid(page, 'fix-rate-pct')).toHaveText('0%');
    await expect(tid(page, 'home-record-1')).toContainText(/이달에 \[ \? \] 친히 \[ ─+ \] 그 글자가 \[ ─+ \]/);
    // 구멍은 글자([ ── ])가 아니라 길이가 다른 짧은 밑줄로 보인다(읽기 도구용 글만 숨어 있다)
    await expect(tid(page, 'home-record-0').locator('.hr-hole')).toHaveCount(4);
    await expect(tid(page, 'home-record-0').locator('.hr-hole.who')).toHaveCount(1);
    {
      const ws = await tid(page, 'home-record-0').locator('.hr-hole').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
      expect(new Set(ws).size).toBeGreaterThan(2); // 길이가 다른 밑줄
      expect(Math.max(...ws)).toBeLessThan(200);
    }
    await shot0(page, 'home');
    // 설정에서 「메시지 빠르게」(시험을 짧게) — 이것도 실제 탭
    await tid(page, 'open-settings').click();
    await tid(page, 'sw-fast').click();
    await expect(tid(page, 'sw-fast')).toHaveAttribute('aria-checked', 'true');
    await tid(page, 'settings-back').click();

    // ── 넘기기: 하위지의 기억 세 장(한 사람의 기억 = 고정 컷)
    await tid(page, 'btn-memories').click();
    await expect(tid(page, 'viewer-title')).toHaveText('하위지가 본 것');
    await expect(tid(page, 'cut-time')).toHaveText('10:00');
    await expect(page.locator('[data-cut="e0-1"] [data-testid="bubble"]')).toBeVisible();
    await expect(tid(page, 'btn-room')).toHaveCount(0);
    // 눈이 하나뿐이면 눈 줄을 두지 않는다 — 컷이 머리글 바로 밑에 붙는다
    await expect(page.locator('.vtop .l2')).toHaveCount(0);
    await expect(tid(page, 'btn-log')).toHaveText('지금까지 본 것');
    // 진행: 꼭 붙여야 할 이름 수(목표 수일 뿐 — 누구인지는 없다)
    await expect(tid(page, 'tag-progress')).toHaveText('이름 붙이기 0/2');
    await expectNavBar(page, '뷰어');
    {
      const top = (await page.locator('.vtop').boundingBox())!;
      const cutb = (await page.locator('[data-cut="e0-1"] .cutbox').boundingBox())!;
      expect(cutb.y - (top.y + top.height)).toBeLessThan(8);
    }
    await shot0(page, 'viewer-first-cut');
    // 두루마리 세부를 탭하면 본 것이 한글 읽기와 함께 뜬다(사람 상자보다 먼저 눌린다)
    await page.locator('[data-cut="e0-1"] [data-detail="d_scroll_head"]').click();
    await expect(tid(page, 'detail-note')).toContainText('부제학 최만리(副提學 崔萬理)');
    await expectReadings(page, '컷 세부');
    await shot0(page, 'viewer-detail');
    await tid(page, 'detail-note').click();
    await expect(tid(page, 'detail-note')).toHaveCount(0);
    await swipeLeft(page);
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-index', '1');
    await expect(tid(page, 'cut-time')).toHaveText('10:10');
    await expect(page.locator('[data-cut="e0-2"] [data-testid="bubble"]').first()).toBeVisible({ timeout: 8000 });
    // 말풍선은 사람을 가리지 않는다(컷 아래 남는 자리에 놓이거나, 탭을 통과시킨다) — 높은 자리의 사람이 눌린다
    await expect(page.locator('[data-cut="e0-2"] [data-testid="bubble"]')).toHaveCount(1);
    await shot0(page, 'viewer-second-cut');
    await figure(page, 'e0-2', 'fig_king').click();
    await expect(tid(page, 'tag-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tid(page, 'tag-sheet')).toBeHidden();
    await swipeLeft(page);
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-index', '2');
    await expect(page.locator('[data-cut="e0-3"] [data-testid="bubble"]').first()).toContainText('운서', { timeout: 8000 });
    await shot0(page, 'viewer-third-cut');
    // 어려운 말은 점선 — 탭하면 짧은 풀이만(Ep0 엔 찾기가 없다: 찾기 밑줄 없음)
    await expect(page.locator('[data-cut="e0-3"] .term')).toHaveCount(0);
    await page.locator('[data-cut="e0-3"] [data-testid="bubble"] .gloss', { hasText: '운서' }).click();
    await expect(page.locator('[data-cut="e0-3"] [data-testid="bubble"] .gl')).toContainText('한자의 소리를 모아 정리한 책');
    await expect(page.locator('[data-cut="e0-3"] [data-testid="bubble"] .gl')).not.toContainText('찾기');

    // ── 메신저: 한 선임 — 내가 먼저 묻기(「어디부터 볼까요?」)
    await tid(page, 'viewer-back').click();
    await readChat(page, false);
    // 소실 세계: 07 자신도 「기록이 없다」를 당연하게 여긴다(첫 선택지)
    await expect(tid(page, 'my-msg').filter({ hasText: '그건 원래 기록이 없잖아요.' })).toHaveCount(1);
    await expect(tid(page, 'chat')).toContainText('응, 한글은 쓰는데 만든 사람은 기록에 없지.');
    await expect(tid(page, 'ask-hint')).toBeVisible();
    await tid(page, 'ask-hint').click();
    // 한 번 물으면 버튼이 사라져 연달아 누를 수 없다
    await expect(tid(page, 'ask-hint')).toHaveCount(0);
    await expect(tid(page, 'my-msg').last()).toContainText('어디부터 볼까요?');
    await expect(tid(page, 'their-msg').last()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2500);
    await shot0(page, 'messenger-ask-hint');
    await tid(page, 'messenger-back').click();

    // ── 이름 붙이기 T0a: 두루마리 → 최만리 (미끼 정창손 → 실패는 공짜)
    await tid(page, 'btn-memories').click();
    await toCut(page, 0, 1);
    await figure(page, 'e0-1', 'fig_choi').click();
    await expect(tid(page, 'tag-sheet')).toBeVisible();
    await expect(tid(page, 'tag-room-link')).toHaveCount(0);
    await expect(tid(page, 'tag-search-more')).toHaveCount(0);
    await expect(tid(page, 'ev-d_scroll_head')).toBeVisible(); // 들은 말·본 것만(카드 줄 없음)
    await shot0(page, 'tag-sheet');
    await tid(page, 'card-jeong_changson').click();
    await tid(page, 'ev-d_scroll_head').click();
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-feedback')).toContainText('근거가 이 사람을 가리키지 않는다');
    await shot0(page, 'tag-not-pointing');
    await tid(page, 'card-choi_manri').click();
    await tid(page, 'ev-d_scroll_head').click();
    await tid(page, 'tag-confirm').click();
    // 맞았다: 시트는 도장과 함께 내려가고, 컷의 그 사람 위에 이름표가 붙는다
    await expect(tid(page, 'tag-ok-stamp')).toContainText('최만리');
    await expect(figure(page, 'e0-1', 'fig_choi')).toHaveAttribute('data-named', 'true');
    await expect(figure(page, 'e0-1', 'fig_choi').getByTestId('name-label')).toHaveText('최만리');
    await shot0(page, 'tag-ok');
    await expect(tid(page, 'tag-sheet')).toBeHidden();
    await expect(tid(page, 'tag-progress')).toHaveText('이름 붙이기 1/2');

    // ── 최만리 카드: 먹선이 그어졌고, 줄 안의 「세종」을 탭하면 인물 카드 +1
    await figure(page, 'e0-1', 'fig_choi').click();
    await expect(tid(page, 'card-name')).toHaveText('최만리');
    await expectNavBar(page, '인물 카드');
    await expect(page.locator('[data-fact="f_choi_list"] [data-testid="ink-line"]')).toContainText('두루마리');
    await expectReadings(page, '인물 카드');
    // 빽빽한 인용 위엔 쉬운 한 줄, 인용 속 어려운 말은 탭하면 풀이
    await expect(page.locator('[data-fact="f_choi_exam"] [data-testid="fact-plain"]')).toHaveText('과거에 붙고, 이듬해 집현전 학자가 됐다');
    await page.locator('[data-fact="f_choi_exam"] [data-testid="gloss-word"]', { hasText: '증광문과' }).click();
    await expect(page.locator('[data-fact="f_choi_exam"] [data-testid="gloss-tip"]')).toHaveText('나라 경사 때 연 과거 시험');
    await shot0(page, 'card-ink-line');
    await tid(page, 'flink-sejong').click();
    await expect(tid(page, 'toast')).toContainText('인물 카드 +1');
    // 알림이 카드 머리글(이름)을 가리지 않는다
    {
      const tb = (await tid(page, 'toast').boundingBox())!;
      const nb = (await tid(page, 'card-name').boundingBox())!;
      expect(tb.y > nb.y + nb.height + 40 || tb.y + tb.height < nb.y).toBe(true);
    }
    await expect(tid(page, 'flink-sejong')).toHaveClass(/found/);
    await shot0(page, 'card-link-gained');
    await tid(page, 'card-close').click();

    // ── 이름 붙이기 T0b: 높은 자리 → 세종. 근거 = 그 사람이 자기를 「군상(君上, 임금)」이라 부르며 상소한 「너희들」을 꾸짖는 말
    await toCut(page, 0, 2);
    await expect(page.locator('[data-cut="e0-2"] [data-testid="bubble"]').last()).toContainText('군상(君上, 임금)', { timeout: 8000 });
    // 같은 기억 속 같은 사람 — 몸을 기울인 세 번째 컷에서 이름 붙인다(말풍선이 가리지 않는다)
    await toCut(page, 0, 3);
    await figure(page, 'e0-3', 'fig_king').click();
    await expect(tid(page, 'tag-sheet')).toBeVisible();
    await tid(page, 'card-sejong').click();
    await tid(page, 'ev-l_e0_unseo').click(); // 운서 말은 사실을 담지 않는다
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-feedback')).toBeVisible();
    await tid(page, 'card-sejong').click();
    // 근거 목록을 끝까지 내려도 카드 줄은 위에 붙어 있다
    await page.locator('[data-testid="tag-sheet"] .sbody').evaluate((el) => (el.scrollTop = el.scrollHeight));
    await page.waitForTimeout(200);
    await expect(tid(page, 'card-sejong')).toBeInViewport();
    await expect(tid(page, 'ev-l_e0_gunsang')).toContainText('군상(君上, 임금)');
    await tid(page, 'ev-l_e0_gunsang').click();
    await shot0(page, 'tag-sheet-king');
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-sheet')).toBeHidden();
    await expect(figure(page, 'e0-3', 'fig_king')).toHaveAttribute('data-named', 'true');
    // 마지막 이름: 「모두 밝혀졌다」 + 아래 가운데 칸이 「기록 다시 쓰기 ›」 로
    await expect(tid(page, 'toast')).toHaveText('모두 밝혀졌다', { timeout: 6000 });
    await expect(tid(page, 'tag-progress')).toHaveText('이름 붙이기 2/2');
    await expect(tid(page, 'btn-to-rewrite')).toHaveText('역사 고정 ›');
    await expect(tid(page, 'btn-log')).toBeVisible(); // 지금까지 본 것은 작은 아이콘으로
    await shot0(page, 'tags-all-done');

    // ── 왼쪽 가장자리에서 밀면 뒤로(홈). 홈도 다음 할 일이 「기록 다시 쓰기」
    await edgeBack(page);
    await expect(page.locator('[data-screen=home]')).toBeVisible();
    await expect(tid(page, 'btn-rewrite')).toBeVisible();
    await expect(tid(page, 'btn-rewrite')).toHaveClass(/primary/);
    await expect(tid(page, 'btn-memories')).toHaveClass(/secondary/);
    await expect(tid(page, 'home-tag-progress')).toContainText('이름 붙이기 2/2 · 모두 밝혀졌다');
    // 관측 중에는 구멍이 하나도 채워지지 않는다
    await expect(tid(page, 'home-record-0')).not.toContainText('만리(萬理) 등에게');
    await expect(tid(page, 'home-record-0')).toContainText('[ ? ]');
    await shot0(page, 'home-rewrite-ready');

    // ── 기록 다시 쓰기: 뷰어 아래 칸에서 바로(미리 놓인 한 줄, 칸 하나)
    await tid(page, 'btn-memories').click();
    await tid(page, 'btn-to-rewrite').click();
    await expect(tid(page, 'line-pc_R0')).toBeVisible();
    await expect(tid(page, 'btn-add-line')).toHaveCount(0);
    await expect(tid(page, 'fix-rate-pct')).toHaveText('0%');
    await expectNavBar(page, '다시 쓰기');
    await shot0(page, 'rewrite-preplaced');
    await tid(page, 'slot-pc_R0-who').click();
    await expect(tid(page, 'slot-sheet')).toBeVisible();
    await expect(tid(page, 'slot-sheet')).not.toContainText('컷 0-');
    await shot0(page, 'rewrite-slot-sheet');
    await tid(page, 'opt-상소를 올린 사람들').click();
    await holdSubmit(page);
    await expect(tid(page, 'line-pc_R0')).toHaveAttribute('data-result', 'not_recorded');
    await expect(tid(page, 'line-pc_R0')).toContainText('흐릿함 — 그날에 붙지 않았다');
    await expect(tid(page, 'fix-rate')).toHaveAttribute('data-pct', '0'); // 붙지 않은 문장은 세지 않는다
    await shot0(page, 'rewrite-miss');
    await tid(page, 'slot-pc_R0-who').click();
    await tid(page, 'opt-세종').click();
    await holdSubmit(page);
    // ① 복원의 순간은 이 화면 안에서: 빈칸이 그 자리에서 채워지고, 출처 한 줄, 버튼 하나
    await expect(tid(page, 'line-pc_R0')).toHaveAttribute('data-result', 'restored');
    await expect(tid(page, 'filled-slot')).toHaveText('임금');
    await expect(tid(page, 'line-source')).toBeVisible();
    await expect(tid(page, 'btn-restore')).toHaveText('기록이 돌아왔다 ›');
    await expect(tid(page, 'btn-submit')).toHaveCount(0);
    await expect(tid(page, 'fix-rate')).toHaveAttribute('data-pct', '100');
    await expect(tid(page, 'fix-rate-pct')).toHaveText('100%', { timeout: 4000 }); // 차오른다
    await expectReadings(page, '다시 쓴 줄');
    await page.waitForTimeout(1600); // 빈칸이 먹으로 채워지는 시간
    await shot0(page, 'rewrite-restored');
    await tid(page, 'btn-restore').click();

    // ── ② 홈 카드가 뒤집힌다: 빈자리 → 복원됨. 돌아온 줄은 짧게, 이웃 기록은 같은 카드 안 한 줄. 전문은 「전문 펼치기」
    await expect(page.locator('[data-screen=restore]')).toHaveAttribute('data-step', 'home');
    await expect(tid(page, 'restore-date')).toContainText('세종 26년 2월 20일', { timeout: 6000 });
    // 확정하는 순간 무너진 단락 전체가 한꺼번에 돌아온다
    await expect(tid(page, 'restore-home').getByTestId('home-record-0')).toContainText('임금이 소(疏)를 보고, 만리(萬理) 등에게 이르기를', { timeout: 8000 });
    await expect(tid(page, 'restore-home').getByTestId('home-record-0')).toContainText('군상(君上)의 하는 일은 그르다', { timeout: 8000 });
    await expect(tid(page, 'restore-home').getByTestId('home-record-1')).toContainText('이달에 임금이 친히 언문(諺文) 28자(字)를 지었는데', { timeout: 8000 });
    await expect(tid(page, 'restore-home').getByTestId('home-record-1')).toContainText('이웃 기록도 함께 돌아왔다');
    await expect(tid(page, 'restore-home')).not.toContainText('[ ? ]', { timeout: 8000 });
    await expect(tid(page, 'aside-tag')).toContainText('세종 카드에 이 줄이 돌아왔다');
    // 밝은 건 내가 채운 「임금」 칸뿐(단락 전체를 칠하지 않는다)
    await expect(tid(page, 'restore-home').locator('.hr-gap.who').first()).toHaveText('임금이');
    await expect(tid(page, 'restore-home').locator('.hr-gap.who')).toHaveCount(2);
    // 돌아온 줄은 두 줄, 이웃 기록은 한 줄로 접혀 있다
    {
      const lh = async (i: number) => page.evaluate((n) => {
        const el = document.querySelector(`[data-testid="restore-home"] [data-testid="home-record-${n}"] .hr-text`) as HTMLElement;
        return Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
      }, i);
      expect(await lh(0)).toBeLessThanOrEqual(2);
      expect(await lh(1)).toBe(1);
    }
    await expect(tid(page, 'article-full')).toHaveCount(0);
    await page.waitForTimeout(2600);
    await shot0(page, 'restore-home');
    await tid(page, 'article-full-toggle').click();
    await expect(tid(page, 'article-full')).toContainText('번독하나이다');
    await expectReadings(page, '복원 전문');
    await tid(page, 'article-full-toggle').scrollIntoViewIfNeeded();
    await shot0(page, 'restore-home-full');
    await tid(page, 'article-full-toggle').click();
    // 대화가 다시 쓰인 것은 따로 보여 주지 않는다(바뀐 말 목록·표시·효과 없음)
    await expect(page.locator('[data-testid="rewritten-msg"]')).toHaveCount(0);
    // 따로 있던 「기사」·「이웃 기록」 단계는 없다
    await tid(page, 'restore-next').click();
    // ── ③ 짧은 독백 → 다리
    await expect(page.locator('[data-screen=restore]')).toHaveAttribute('data-step', 'monologue');
    await expect(tid(page, 'restore-monologue')).toContainText('모두가 아는 이름이');
    await page.waitForTimeout(4500);
    await shot0(page, 'restore-monologue');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'bridge-clock')).toHaveText('23:04');
    // 복원 뒤 대화는 보통 대화창 그대로 — 한 선임은 이미 바뀐 세상에서 말한다
    await expect(tid(page, 'restore-bridge')).toContainText('기록 확인: 바뀐 것 없음.', { timeout: 30_000 });
    await tid(page, 'reply-hangul').click({ timeout: 60_000 });
    await expect(tid(page, 'restore-bridge')).toContainText('세종대왕이 만든 거 모르는 사람이 어디 있어', { timeout: 30_000 });
    await expect(tid(page, 'restore-bridge')).toContainText('관측기: 같은 손상 흔적 1건 더', { timeout: 30_000 });
    await expect(page.locator('.app')).not.toContainText('좌표');
    await expect(tid(page, 'restore-bridge')).toContainText('어, 하나 더 떴다.', { timeout: 30_000 });
    await page.waitForTimeout(3000);
    await shot0(page, 'restore-bridge');
    await expect(tid(page, 'restore-next')).toHaveText('다음 빈자리 ▸');

    // ═══ 에피소드 1 「한 사관의 흔적」 — 다리 뒤 콜드 오픈 23:04 ═══
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'boot-line')).toContainText('23:04');
    await shot(page, 'cold-open');
    await tid(page, 'next').click();
    await tid(page, 'next').click();
    await expect(tid(page, 'assign-card')).toContainText('#C-2217');
    await expect(tid(page, 'home-date')).toHaveText('####');
    await expect(tid(page, 'home-place')).toHaveText('미확인');
    await expect(tid(page, 'dock-search')).toBeVisible(); // 이제 찾기가 생겼다
    await shot(page, 'home');

    // ── 현실 재기록은 대화 기록 전체를 덮는다: 거슬러 올라가 보면 Ep0 의 말(내 답까지)이 이미 다른 말이다. 표시도 원문 보기도 없다
    await tid(page, 'dock-messenger').click();
    const chat = tid(page, 'chat');
    await chat.evaluate((el) => (el.scrollTop = 0));
    await page.waitForTimeout(300);
    const mineNow = tid(page, 'my-msg').filter({ hasText: '그건 세종대왕이 만든 거잖아요.' });
    await mineNow.scrollIntoViewIfNeeded();
    await expect(mineNow).toHaveCount(1);
    await expect(mineNow).toHaveAttribute('data-rewritten', 'true');
    await expect(chat).toContainText('세종대왕이 한글 지은 그 기록.');
    await expect(chat).toContainText('응, 그러니까 더 이상하지.');
    await expect(chat).not.toContainText('그건 원래 기록이 없잖아요.');
    await expect(chat).not.toContainText('만든 사람은 기록에 없지');
    await expect(chat).not.toContainText('한글 누가 만들었는지 적힌 데야.');
    // 길게 눌러도 아무것도 뜨지 않는다(원래 글은 화면 어디에도 없다)
    const hb = (await mineNow.boundingBox())!;
    await page.mouse.move(hb.x + hb.width - 20, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(900);
    await page.mouse.up();
    await expect(page.locator('.app')).not.toContainText('그건 원래 기록이 없잖아요.');
    await expect(page.locator('.app')).not.toContainText('원래 문장');
    await page.waitForTimeout(800); // 먹 번짐이 지나간 뒤
    await mineNow.scrollIntoViewIfNeeded();
    await shot0(page, 'messenger-rewritten-log');
    await tid(page, 'messenger-back').click();

    // ── 起: 첫 번째 기억 — 넘기기. 이름 붙이기 전엔 연도·장소·인물을 알려주지 않는다
    await tid(page, 'btn-memories').click();
    await expect(tid(page, 'viewer-title')).toHaveText('첫 번째 관측');
    await expect(tid(page, 'cut-time')).toHaveText('09:10');
    await expect(page.locator('[data-cut="e1-1"] [data-testid="bubble"]')).toBeVisible();
    await shot(page, 'viewer-first-cut');
    await swipeLeft(page);
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-index', '1');
    await expect(tid(page, 'cut-time')).toHaveText('11:40');
    for (let n = 3; n <= 5; n++) await toCut(page, 1, n);
    await toCut(page, 1, 4);
    await expect(page.locator('[data-cut="e1-4"] [data-testid="bubble"]').first()).toContainText('사초', { timeout: 8000 });
    await expectReadings(page, '에피소드 1 컷');
    await shot(page, 'viewer-order-line');
    await toCut(page, 1, 2);

    // ── T1: 이름 붙이기 — 실패(공짜) 한 번, 그다음 정답
    await figure(page, 'e1-2', 'fig_yi').click();
    await expect(tid(page, 'tag-sheet')).toBeVisible();
    await expect(tid(page, 'tag-room-link')).toHaveCount(0); // 방은 아직
    await shot(page, 'tag-cards');
    await tid(page, 'card-eo_segyeom').click();
    await tid(page, 'ev-l_e1_2a').click();
    await shot(page, 'tag-evidence');
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-feedback')).toContainText('근거가 이 사람을 가리키지 않는다');
    await shot(page, 'tag-not-pointing');
    await tid(page, 'card-yi_geukdon').click();
    await tid(page, 'ev-l_e1_2a').click();
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-sheet')).toBeHidden();
    await expect(page.locator('[data-cut="e1-2"] [data-figure="fig_yi"]')).toHaveAttribute('data-named', 'true');
    await expect(tid(page, 'toast')).toContainText('관측이 하나 열렸다');
    await shot(page, 'tag-ok-eye-opens');
    await expect(page.locator('[data-eye="E2"]')).toHaveAttribute('data-state', 'open');

    // ── 인물 카드(이름 붙인 사람을 탭) — 맞는 줄에 먹선
    await figure(page, 'e1-2', 'fig_yi').click();
    await expect(tid(page, 'card-name')).toHaveText('이극돈');
    await expect(page.locator('[data-testid="ink-line"]').first()).toBeVisible();
    await shot(page, 'person-card');
    await tid(page, 'card-close').click();

    // ── 承: 두 번째 기억. 그날의 방은 아직(찾기가 먼저) → T2: 찾기로 더 → 돌아와 이름 붙이기
    await page.locator('[data-eye="E2"]').click();
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-eye', 'E2');
    await expect(tid(page, 'btn-room')).toHaveCount(0);
    await toCut(page, 2, 1);
    await expect(figure(page, 'e2-1', 'fig_yun')).toBeVisible();
    await figure(page, 'e2-1', 'fig_yun').click();
    await tid(page, 'tag-search-more').click();
    await expect(tid(page, 'search-input')).toHaveValue('윤'); // 들은 말에서 미리 채운다
    await expect(tid(page, 'hit-person-yun_hyoson')).toBeVisible();
    await expect(tid(page, 'hit-person-yun_pilsang')).toBeVisible();
    await shot(page, 'search-yun');
    await tid(page, 'hit-person-yun_hyoson').click();
    await expect(tid(page, 'card-name')).toHaveText('윤효손');
    await tid(page, 'card-close').click();
    await tid(page, 'search-back').click(); // 시트로 돌아간다 — 방금 본 카드를 고른 채
    await expect(tid(page, 'tag-sheet')).toBeVisible();
    await expect(tid(page, 'card-yun_hyoson')).toHaveAttribute('aria-pressed', 'true');
    await shot(page, 'tag-after-search');
    // 미끼(윤필상) → 정답(윤효손)
    await tid(page, 'card-yun_pilsang').click();
    await tid(page, 'ev-l_e2_1').click();
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-feedback')).toBeVisible();
    await tid(page, 'card-yun_hyoson').click();
    await tid(page, 'ev-l_e2_1').click();
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-sheet')).toBeHidden();
    await expect(page.locator('[data-eye="E1"]')).toHaveAttribute('data-state', 'open');
    // 첫 번째 눈의 주인이 밝혀졌다
    await page.locator('[data-eye="E1"]').click();
    await expect(tid(page, 'viewer-title')).toHaveText('윤효손이 본 것');
    await viewAll(page, 1);
    await page.locator('[data-eye="E2"]').click();
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-eye', 'E2');

    // ── 그날의 방이 열렸다 · 겹침
    await expect(tid(page, 'btn-room')).toBeVisible();
    await toCut(page, 2, 1);
    await tid(page, 'btn-room').click();
    await expect(tid(page, 'room-sheet')).toBeVisible();
    await expect(tid(page, 'same-person')).toBeVisible();
    await shot(page, 'room-plan-merge');
    await tid(page, 'marker-Y').click();
    await expect(tid(page, 'room-go-cut')).toBeVisible();
    await shot(page, 'room-marker');
    await page.getByRole('button', { name: '닫기' }).last().click();
    await expect(tid(page, 'room-sheet')).toBeHidden();

    // 찾기(홈 → 찾기): 「대내로 들여오라」는 기사가 없다
    await tid(page, 'viewer-back').click();
    await tid(page, 'dock-search').click();
    await tid(page, 'search-input').fill('대내로 들여오라');
    await tid(page, 'search-go').click();
    await expect(tid(page, 'search-message')).toContainText('실록에 없음.');
    await shot(page, 'search-no-article');
    await tid(page, 'search-back').click();
    await page.locator('[data-eye="E2"]').click();
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-eye', 'E2');

    // ── T3: 그 말이 누구 얘기인지 아직 모른다 → 「이 시각, 그날의 방」 → 겹침 → 다시 이름 붙이기
    await toCut(page, 2, 2);
    await figure(page, 'e2-2', 'fig_eo').click();
    await expect(tid(page, 'tag-room-link')).toBeVisible();
    await tid(page, 'card-eo_segyeom').click();
    await tid(page, 'ev-l_e1_3').click();
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-feedback')).toContainText('그 말이 이 사람 얘기인지 아직 모른다');
    await shot(page, 'tag-not-linked');
    await tid(page, 'tag-room-link').click();
    await expect(tid(page, 'room-sheet')).toBeVisible();
    await expect(tid(page, 'room-plan')).toBeVisible();
    await shot(page, 'room-1320');
    await page.getByRole('button', { name: '닫기' }).last().click();
    await tagWith(page, 'e2-2', 'fig_eo', 'eo_segyeom', 'l_e1_3');
    await expect(tid(page, 'tag-sheet')).toBeHidden();
    await expect(page.locator('[data-eye="E3"]')).toHaveAttribute('data-state', 'open');
    await viewAll(page, 2);

    // ── 轉: T4 — 「국장 도감」을 찾아 카드를 얻고 홍귀달에 이름을 붙인다
    await page.locator('[data-eye="E3"]').click();
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-eye', 'E3');
    await figure(page, 'e3-1', 'fig_hong').click();
    await expect(tid(page, 'tag-sheet')).toBeVisible();
    await expect(tid(page, 'card-hong_gwidal')).toHaveCount(0); // 아직 카드가 없다
    await tid(page, 'tag-search-more').click();
    await tid(page, 'search-input').fill('국장 도감');
    await tid(page, 'search-go').click();
    await tid(page, 'hit-record-rec_r02').click();
    await expect(tid(page, 'toast')).toContainText('인물 카드 +4');
    await shot(page, 'search-record');
    await tid(page, 'search-back').click();
    await expect(tid(page, 'tag-sheet')).toBeVisible();
    await tid(page, 'card-hong_gwidal').click();
    await tid(page, 'ev-l_e3_1').click();
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-sheet')).toBeHidden();
    await expect(page.locator('[data-eye="E4"]')).toHaveAttribute('data-state', 'open');
    // 마지막 이름(T4): 진행 4/4 · 「모두 밝혀졌다」(눈이 열린 알림 뒤에)
    await expect(tid(page, 'tag-progress')).toHaveText('이름 붙이기 4/4');
    await expect(tid(page, 'toast')).toHaveText('모두 밝혀졌다', { timeout: 6000 });
    // Ep1 은 아직 다시 쓸 수 없다(닫힘·모순이 남았다) — 아래 가운데는 그대로 그날의 방
    await expect(tid(page, 'btn-to-rewrite')).toHaveCount(0);
    await shot(page, 'four-eyes');
    // 닫히기 전에 다 본다
    await viewAll(page, 3);
    await page.locator('[data-eye="E4"]').click();
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-eye', 'E4');
    await toCut(page, 4, 1);
    await toCut(page, 4, 2);
    await expect(page.locator('[data-cut="e4-2"] [data-testid="bubble"]').first()).toContainText('흐릿하게', { timeout: 8000 });
    await shot(page, 'viewer-garbled');
    for (let n = 3; n <= 5; n++) await toCut(page, 4, n);
    await expect(tid(page, 'alert-chip')).toBeVisible();
    await shot(page, 'viewer-contradiction-chip');

    // ── 모순 X1: 그날의 방에서 풀기(틀린 쪽 → 다시 → 정답)
    await tid(page, 'alert-chip').click();
    await expect(tid(page, 'conflict-plan')).toBeVisible();
    // 근거 2칸: ① 판단 + ② 근거(자리 사실). 두 칸이 차야 확인할 수 있다
    await expect(tid(page, 'contra-slots')).toContainText('근거 2칸');
    await expect(tid(page, 'resolve-confirm')).toBeDisabled();
    await expect(tid(page, 'cev-X1:E4')).toContainText('홍귀달 자리 — 문 앞에서 9.21칸, 들림 반경 8칸');
    await shot(page, 'room-contradiction');
    // 틀린 판단 + 맞는 자리 → 어느 칸이 틀렸는지는 말하지 않는다
    await tid(page, 'claim-c_scope_six').click();
    await expect(tid(page, 'resolve-confirm')).toBeDisabled();
    await tid(page, 'cev-X1:E4').click();
    await tid(page, 'resolve-confirm').click();
    await expect(tid(page, 'retry-text')).toBeVisible();
    await shot(page, 'room-contradiction-retry');
    await tid(page, 'claim-c_scope_all').click();
    await tid(page, 'cev-X1:E4').click();
    await tid(page, 'resolve-confirm').click();
    await expect(tid(page, 'resolved-text')).toBeVisible();
    await shot(page, 'room-contradiction-resolved');
    await tid(page, 'room-back').click();
    await page.getByRole('button', { name: '닫기' }).last().click();

    // 06:00 — 뷰어를 떠나는 순간 눈이 닫힌다
    await tid(page, 'viewer-back').click();
    await expect(page.locator('[data-eye="E3"]')).toHaveAttribute('data-state', 'closed');
    await expect(tid(page, 'btn-rewrite')).toBeVisible();
    await shot(page, 'home-eye-closed');

    // ── 메신저: 한 선임
    await expect(tid(page, 'unread-dot')).toBeVisible();
    await tid(page, 'dock-messenger').click();
    await expect(tid(page, 'their-msg').first()).toBeVisible();
    await shot(page, 'messenger');
    await tid(page, 'messenger-back').click();
    await readChat(page);

    // ── 結: 기록 다시 쓰기
    await tid(page, 'btn-rewrite').click();
    await shot(page, 'rewrite-empty');
    const add = async (piece: string) => {
      await tid(page, 'btn-add-line').click();
      await tid(page, `piece-${piece}`).click();
    };
    const fill = async (piece: string, kind: string, value: string) => {
      await tid(page, `slot-${piece}-${kind}`).click();
      await tid(page, `opt-${value}`).click();
    };
    await add('pc_L1');
    await fill('pc_L1', 'whose', '김일손');
    await fill('pc_L1', 'scope', '모두');
    await add('pc_L2');
    await fill('pc_L2', 'speaker', '당상(이극돈 등)');
    await add('pc_L3');
    await fill('pc_L3', 'speaker', '당상(이극돈 등)');
    // 세 문장만 먼저 고정 → 그날 고정률 75%(필수 L1~L4 중 셋). 줄마다의 수치는 없다
    await expect(tid(page, 'fix-rate-pct')).toHaveText('0%');
    await holdSubmit(page);
    await expect(tid(page, 'line-pc_L1')).toHaveAttribute('data-result', 'restored');
    await expect(tid(page, 'fix-rate')).toHaveAttribute('data-pct', '75');
    await expect(tid(page, 'fix-rate-pct')).toHaveText('75%', { timeout: 4000 });
    await shot(page, 'rewrite-fix-75');
    await add('pc_L4');
    await fill('pc_L4', 'who', '이극돈');
    await fill('pc_L4', 'whose', '김일손');
    // 「몇」 칸을 열면 X2 — 값을 고르면 그날의 방 모순 보기로
    await tid(page, 'slot-pc_L4-count').click();
    await expect(tid(page, 'slot-sheet')).toBeVisible();
    await shot(page, 'rewrite-slot-sheet-contested');
    await tid(page, 'opt-6').click();
    await expect(tid(page, 'conflict-plan')).toBeVisible();
    await shot(page, 'room-contradiction-x2');
    await expect(tid(page, 'cev-X2:E1')).toContainText('기록 더미에 가림');
    await tid(page, 'claim-c_count_6').click();
    await tid(page, 'cev-X2:E1').click();
    await tid(page, 'resolve-confirm').click();
    await expect(tid(page, 'resolved-text')).toBeVisible();
    await tid(page, 'room-back').click();
    await page.getByRole('button', { name: '닫기' }).last().click();
    await fill('pc_L4', 'count', '6');
    await add('pc_S3');
    await add('w_alive');
    await shot(page, 'rewrite-compose');
    await holdSubmit(page);
    await expect(tid(page, 'line-pc_L4')).toHaveAttribute('data-result', 'restored');
    await expect(tid(page, 'line-pc_S3')).toHaveAttribute('data-result', 'restored');
    await expect(tid(page, 'line-w_alive')).toHaveAttribute('data-result', 'witness');
    await expect(tid(page, 'line-witness').first()).toContainText('실록이 적지 않은 일');
    await expect(tid(page, 'fix-rate-pct')).toHaveText('100%', { timeout: 4000 });
    await shot(page, 'rewrite-verdict');

    // ── 복원: 다시 쓰기 화면 안에서 → 홈 카드(뒤집힘) → 바뀐 것(카드 줄·방의 짝 이름·로그 한 줄) → 독백 → 예고
    await expect(tid(page, 'btn-restore')).toHaveText('기록이 돌아왔다 ›');
    await expect(tid(page, 'filled-slot').first()).toBeVisible();
    await tid(page, 'btn-restore').click();
    await expect(page.locator('[data-screen=restore]')).toHaveAttribute('data-step', 'home');
    await expect(tid(page, 'restore-date')).toContainText('연산군 4년 7월 11일', { timeout: 6000 });
    await expect(tid(page, 'restored-keyline')).toContainText('김일손');
    await page.waitForTimeout(2200);
    await shot(page, 'restore-home');
    await tid(page, 'article-full-toggle').click();
    await expect(tid(page, 'article-full')).toContainText('김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로');
    await tid(page, 'article-full-toggle').click();
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'restore-cards')).toBeVisible();
    await expect(tid(page, 'restore-room')).toContainText('유순·안침');
    // 같은 실록 문장으로 바뀐 카드 줄은 한 번만(이름을 모아)
    expect(await tid(page, 'restore-card-change').count()).toBeLessThan(5);
    await expect(tid(page, 'restore-card-change').filter({ hasText: '파직하고' })).toHaveCount(1);
    await expect(tid(page, 'restore-log')).toContainText('실록에 없음');
    await page.waitForTimeout(2600); // 먹 번짐(글자가 굳는 시간)
    await shot(page, 'restore-cards');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'restore-monologue')).toContainText('그의 관측은 끝내 이뤄지지 않았다');
    await page.waitForTimeout(4500);
    await shot(page, 'restore-monologue');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'restore-teaser')).toBeVisible();
    await shot(page, 'restore-teaser');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'home-date')).toHaveText('연산군 4년 7월 11일');
    await expect(tid(page, 'btn-restored')).toBeVisible();
    await expect(tid(page, 'article-full-toggle')).toBeVisible(); // 홈 카드에서도 전문을 펼칠 수 있다
    await shot(page, 'home-restored');
    // 복원 뒤 대화는 메신저에서 그대로 이어진다(표시·효과 없이)
    await tid(page, 'dock-messenger').click();
    await tid(page, 'reply-muo').click({ timeout: 60_000 });
    await expect(tid(page, 'chat')).toContainText('그걸 모르는 사람이 어디 있어', { timeout: 30_000 });
    await expect(page.locator('.inkbleed')).toHaveCount(0);
    await page.waitForTimeout(1500);
    await shot(page, 'messenger-after-restore');
    await tid(page, 'messenger-back').click();

    // 설정: 이 장면에 대해
    await tid(page, 'open-settings').click();
    await tid(page, 'about-scene').click();
    await expect(tid(page, 'about-text')).toBeVisible();

    expect(errs, errs.join('\n')).toEqual([]);
  });
});

test.describe('v5 눈 닫힘과 잃은 컷', () => {
  test.beforeEach(({ page: _p }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', '휴대폰 세로에서만');
  });

  test('06:00 — 지워진 기억(청록)은 남고, 안 본 컷은 「볼 수 없다」', async ({ page }) => {
    const errs = watchErrors(page);
    await page.goto('/?test=1&ep=1');
    await expect(tid(page, 'assign-card')).toBeVisible();
    // 상태 준비는 스토어로(탭 전체는 위 시험이 돈다): E3 의 첫 컷만 보고 네 번째 눈을 연다
    await page.evaluate(() => {
      const g = (window as unknown as { __STORE__: { getState: () => Record<string, (...a: unknown[]) => unknown> } }).__STORE__.getState();
      const st = () => (window as unknown as { __STORE__: { getState: () => Record<string, (...a: unknown[]) => unknown> } }).__STORE__.getState();
      void g;
      st().openEye('E1');
      for (let i = 0; i < 5; i++) st().viewCut('E1', i);
      st().tag('fig_yi', 'yi_geukdon', 'l_e1_2a', 'e1-2');
      st().viewCut('E2', 0);
      st().openRoom();
      st().search('윤');
      st().tag('fig_yun', 'yun_hyoson', 'l_e2_1', 'e2-1');
      st().viewCut('E2', 1);
      st().selectRoomTime('13:20');
      st().tag('fig_eo', 'eo_segyeom', 'l_e1_3', 'e2-2');
      st().viewCut('E3', 0);
      st().search('국장 도감');
      st().openRecord('rec_r02');
      st().tag('fig_hong', 'hong_gwidal', 'l_e3_1', 'e3-1');
      for (let i = 0; i < 5; i++) st().viewCut('E4', i);
      st().closeViewer();
      st().closeRoom();
    });
    await page.locator('[data-eye="E3"]').waitFor();
    await expect(page.locator('[data-eye="E3"]')).toHaveAttribute('data-state', 'closed');
    await page.locator('[data-eye="E3"]').click();
    // 본 컷 3-1 은 지워진 기억(청록)으로 남는다
    await expect(page.locator('[data-cut="e3-1"] [data-testid="cut-img-e3-1"]')).toHaveAttribute('srcset', /erased/);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/90-closed-eye-erased.png` });
    // 안 본 컷은 볼 수 없다
    await tid(page, 'dot-3-3').click();
    await expect(page.locator('[data-cut="e3-3"] [data-testid="lost-text"]')).toHaveText('볼 수 없다');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/91-closed-eye-lost.png` });
    expect(errs, errs.join('\n')).toEqual([]);
  });
});

test.describe('v5 틀', () => {
  test('가로로 돌리면 「세로로 돌려 주세요」 화면만', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', '터치 기기에서만');
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errs = watchErrors(page);
    await page.goto('/?test=1');
    await expect(tid(page, 'assign-card')).toBeVisible();
    await expect(page.getByText('세로로 돌려 주세요')).toHaveCount(0);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.getByText('세로로 돌려 주세요')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/92-rotate-guard.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText('세로로 돌려 주세요')).toHaveCount(0);
    await expect(tid(page, 'assign-card')).toBeVisible();
    expect(errs, errs.join('\n')).toEqual([]);
    await ctx.close();
  });

  test('데스크톱: 같은 세로 화면이 가운데(최대 480px)에 뜬다', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '데스크톱에서만');
    const errs = watchErrors(page);
    await page.goto('/?test=1');
    await expect(tid(page, 'assign-card')).toBeVisible();
    const f = (await page.locator('.phone-frame').boundingBox())!;
    expect(f.width).toBeLessThanOrEqual(480);
    expect(f.height).toBeGreaterThan(f.width);
    expect(Math.abs(f.x + f.width / 2 - 640)).toBeLessThan(2);
    await tid(page, 'btn-memories').click();
    await expect(tid(page, 'viewer-title')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-index', '1');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/93-desktop-frame.png` });
    expect(errs, errs.join('\n')).toEqual([]);
  });

  test('저장 이어하기: 새로 고침 뒤 「이어하기」로 같은 곳', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', '휴대폰에서만');
    await page.goto('/?test=1&boot=1');
    await tid(page, 'start').click();
    await tid(page, 'skip').click();
    await tid(page, 'next').click();
    await tid(page, 'next').click();
    await tid(page, 'btn-memories').click();
    await toCut(page, 0, 3);
    await page.waitForTimeout(2600); // 자동 저장 간격
    await page.reload();
    await tid(page, 'continue').click();
    await expect(tid(page, 'assign-card')).toBeVisible();
    await expect(page.locator('[data-eye="E0"]')).toHaveAttribute('data-state', 'open');
    const viewed = await page.evaluate(() => (window as unknown as { __STORE__: { getState: () => { viewedCuts: string[] } } }).__STORE__.getState().viewedCuts);
    expect(viewed).toEqual(['e0-1', 'e0-3']); // 점으로 1 → 3 으로 건너뛰었다
  });
});
