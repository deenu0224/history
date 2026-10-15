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

/** 메신저를 열어 밀린 말을 다 읽는다(답장은 늘 첫 선택지). 실제 플레이어가 하듯이 */
async function readChat(page: Page) {
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
  await tid(page, 'messenger-back').click();
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

test.describe('v5 전체 플레이', () => {
  test.setTimeout(420_000);
  test.beforeEach(({ page: _p }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', '휴대폰 세로(390×844)에서만 전체 경로를 돈다');
  });

  test('콜드 오픈부터 예고까지 — 실제 탭으로', async ({ page }) => {
    const errs = watchErrors(page);
    shotNo = 0;
    // 이전 전체 경로 캡처(00~89)를 비운다 — 번호가 섞이지 않게(90번대는 따로 찍는 화면)
    for (const f of fs.readdirSync(SHOTS)) if (/^[0-8]\d-.*\.png$/.test(f)) fs.unlinkSync(`${SHOTS}/${f}`);
    await page.goto('/?test=1&boot=1');

    // ── 부트 → 프롤로그(건너뛰기) → 콜드 오픈 → 홈
    await expect(tid(page, 'start')).toBeVisible();
    await shot(page, 'title');
    await tid(page, 'start').click();
    await expect(tid(page, 'boot-line')).toContainText('언제부터인지');
    await shot(page, 'prologue');
    await tid(page, 'next').click();
    await tid(page, 'next').click();
    await tid(page, 'skip').click();
    await expect(tid(page, 'boot-line')).toContainText('23:04');
    await shot(page, 'cold-open');
    await tid(page, 'next').click();
    await tid(page, 'next').click();
    await expect(tid(page, 'assign-card')).toBeVisible();
    await expect(tid(page, 'home-date')).toHaveText('####');
    await expect(tid(page, 'home-place')).toHaveText('미확인');
    await shot(page, 'home');
    // 설정에서 「메시지 빠르게」(시험을 짧게) — 이것도 실제 탭
    await tid(page, 'open-settings').click();
    await shot(page, 'settings');
    await tid(page, 'sw-fast').click();
    await expect(tid(page, 'sw-fast')).toHaveAttribute('aria-checked', 'true');
    await tid(page, 'settings-back').click();

    // ── 起: 첫 번째 기억 — 넘기기. 이름 붙이기 전엔 연도·장소·인물을 알려주지 않는다
    await tid(page, 'btn-memories').click();
    await expect(tid(page, 'viewer-title')).toHaveText('첫 번째 기억');
    await expect(tid(page, 'cut-time')).toHaveText('09:10');
    await expect(page.locator('[data-cut="e1-1"] [data-testid="bubble"]')).toBeVisible();
    await shot(page, 'viewer-first-cut');
    // 실제 밀기(드래그)로 다음 컷
    const stage = tid(page, 'stage');
    const sb = (await stage.boundingBox())!;
    await page.mouse.move(sb.x + sb.width * 0.85, sb.y + sb.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(sb.x + sb.width * 0.3, sb.y + sb.height * 0.4, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-index', '1');
    await expect(tid(page, 'cut-time')).toHaveText('11:40');
    for (let n = 3; n <= 5; n++) await toCut(page, 1, n);
    await toCut(page, 1, 4);
    await expect(page.locator('[data-cut="e1-4"] [data-testid="bubble"]').first()).toContainText('사초', { timeout: 8000 });
    await shot(page, 'viewer-order-line');
    await toCut(page, 1, 2);

    // ── T1: 이름 붙이기 — 실패(공짜) 한 번, 그다음 정답
    await figure(page, 'e1-2', 'fig_yi').click();
    await expect(tid(page, 'tag-sheet')).toBeVisible();
    await shot(page, 'tag-cards');
    await tid(page, 'card-eo_segyeom').click();
    await shot(page, 'tag-evidence');
    await tid(page, 'ev-l_e1_2a').click();
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-feedback')).toContainText('근거가 이 사람을 가리키지 않는다');
    await shot(page, 'tag-not-pointing');
    await tid(page, 'card-yi_geukdon').click();
    await tid(page, 'ev-l_e1_2a').click();
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-sheet')).toBeHidden();
    await expect(page.locator('[data-cut="e1-2"] [data-figure="fig_yi"]')).toHaveAttribute('data-named', 'true');
    await expect(tid(page, 'toast')).toContainText('눈이 하나 열렸다');
    await shot(page, 'tag-ok-eye-opens');
    await expect(page.locator('[data-eye="E2"]')).toHaveAttribute('data-state', 'open');

    // ── 인물 카드(이름 붙인 사람을 탭)
    await figure(page, 'e1-2', 'fig_yi').click();
    await expect(tid(page, 'card-name')).toHaveText('이극돈');
    await shot(page, 'person-card');
    await tid(page, 'card-close').click();

    // ── 承: 두 번째 기억 · 그날의 방 · 겹침
    await page.locator('[data-eye="E2"]').click();
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-eye', 'E2');
    await expect(tid(page, 'btn-room')).toBeVisible();
    await tid(page, 'btn-room').click();
    await expect(tid(page, 'room-sheet')).toBeVisible();
    await expect(tid(page, 'same-person')).toBeVisible();
    await shot(page, 'room-plan-merge');
    await tid(page, 'marker-Y').click();
    await expect(tid(page, 'room-go-cut')).toBeVisible();
    await shot(page, 'room-marker');
    await page.getByRole('button', { name: '닫기' }).last().click();
    await expect(tid(page, 'room-sheet')).toBeHidden();

    // 찾기: 「윤」 — 인물 둘이 나온다
    await tid(page, 'viewer-back').click();
    await tid(page, 'dock-search').click();
    await tid(page, 'search-input').fill('윤');
    await tid(page, 'search-go').click();
    await expect(tid(page, 'hit-person-yun_hyoson')).toBeVisible();
    await expect(tid(page, 'hit-person-yun_pilsang')).toBeVisible();
    await shot(page, 'search-yun');
    await tid(page, 'search-input').fill('대내로 들여오라');
    await tid(page, 'search-go').click();
    await expect(tid(page, 'search-message')).toContainText('해당 기사 없음.');
    await shot(page, 'search-no-article');
    await tid(page, 'search-back').click();
    await page.locator('[data-eye="E2"]').click();
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-eye', 'E2');

    // T2: 미끼(윤필상) → 정답(윤효손)
    await toCut(page, 2, 1);
    await expect(figure(page, 'e2-1', 'fig_yun')).toBeVisible();
    await tagWith(page, 'e2-1', 'fig_yun', 'yun_pilsang', 'l_e2_1');
    await expect(tid(page, 'tag-feedback')).toBeVisible();
    await tid(page, 'card-yun_hyoson').click();
    await tid(page, 'ev-l_e2_1').click();
    await tid(page, 'tag-confirm').click();
    await expect(tid(page, 'tag-sheet')).toBeHidden();
    await expect(page.locator('[data-eye="E1"]')).toHaveAttribute('data-state', 'open');
    // 첫 번째 눈의 주인이 밝혀졌다
    await page.locator('[data-eye="E1"]').click();
    await expect(tid(page, 'viewer-title')).toHaveText('윤효손의 기억');
    await viewAll(page, 1);
    await page.locator('[data-eye="E2"]').click();
    await expect(page.locator('[data-screen=viewer]')).toHaveAttribute('data-eye', 'E2');

    // T3: 13:20 겹침 뒤에 근거가 뜬다
    await toCut(page, 2, 2);
    await tid(page, 'btn-room').click();
    await tid(page, 'chip-13:20').click();
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
    await page.getByText('찾기로 더').click();
    await tid(page, 'search-input').fill('국장 도감');
    await tid(page, 'search-go').click();
    await tid(page, 'hit-record-rec_r02').click();
    await shot(page, 'search-record');
    await tid(page, 'search-back').click();
    await tagWith(page, 'e3-1', 'fig_hong', 'hong_gwidal', 'l_e3_1');
    await expect(tid(page, 'tag-sheet')).toBeHidden();
    await expect(page.locator('[data-eye="E4"]')).toHaveAttribute('data-state', 'open');
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
    await shot(page, 'room-contradiction');
    await tid(page, 'resolve-c_scope_six').click();
    await expect(tid(page, 'retry-text')).toBeVisible();
    await shot(page, 'room-contradiction-retry');
    await tid(page, 'resolve-c_scope_all').click();
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
    await tid(page, 'resolve-c_count_6').click();
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
    await shot(page, 'rewrite-verdict');
    await tid(page, 'btn-restore').click();

    // ── 복원: 기사 → 홈 → 카드 → 메시지 → 방 → 로그 → 독백 → 예고
    await expect(tid(page, 'restored-article')).toContainText('김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로');
    await shot(page, 'restore-article');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'restore-date')).toContainText('연산군 4년 7월 11일', { timeout: 6000 });
    await shot(page, 'restore-home');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'restore-cards')).toBeVisible();
    await page.waitForTimeout(2600); // 먹 번짐(글자가 굳는 시간)
    await shot(page, 'restore-cards');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'restore-messages')).toBeVisible();
    await expect(tid(page, 'rewritten-msg').first()).toBeVisible();
    await tid(page, 'reply-muo').click({ timeout: 60_000 });
    await expect(tid(page, 'restore-messages')).toContainText('그걸 모르는 사람이 어디 있어', { timeout: 30_000 });
    await shot(page, 'restore-messenger');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'restore-room')).toContainText('유순·안침');
    await shot(page, 'restore-room');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'restore-log')).toContainText('해당 기사 없음');
    await shot(page, 'restore-log');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'restore-monologue')).toContainText('그의 눈은 끝내 열리지 않았다');
    await page.waitForTimeout(4500);
    await shot(page, 'restore-monologue');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'restore-teaser')).toBeVisible();
    await shot(page, 'restore-teaser');
    await tid(page, 'restore-next').click();
    await expect(tid(page, 'home-date')).toHaveText('연산군 4년 7월 11일');
    await expect(tid(page, 'btn-restored')).toBeVisible();
    await shot(page, 'home-restored');

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
    await page.goto('/?test=1');
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
    await toCut(page, 1, 3);
    await page.waitForTimeout(2600); // 자동 저장 간격
    await page.reload();
    await tid(page, 'continue').click();
    await expect(tid(page, 'assign-card')).toBeVisible();
    await expect(page.locator('[data-eye="E1"]')).toHaveAttribute('data-state', 'open');
    const viewed = await page.evaluate(() => (window as unknown as { __STORE__: { getState: () => { viewedCuts: string[] } } }).__STORE__.getState().viewedCuts);
    expect(viewed).toEqual(['e1-1', 'e1-3']); // 점으로 1 → 3 으로 건너뛰었다
  });
});
