/* 임시 UX QA 스크립트 — 커밋하지 않는다 */
import fs from 'node:fs';
import { expect, test, type Page, type Locator, type CDPSession } from '@playwright/test';

const OUT = process.env.QA_OUT!;
fs.mkdirSync(OUT, { recursive: true });
const tid = (page: Page, id: string) => page.getByTestId(id);
const figure = (page: Page, cut: string, fig: string) => page.locator(`[data-cut="${cut}"] [data-figure="${fig}"]`);

type Rec = Record<string, unknown>;
const report: { audits: Rec[]; taps: Rec[]; notes: string[]; timings: Rec[] } = { audits: [], taps: [], notes: [], timings: [] };
let taps = 0;
let tag = '';
let lastMile = 0;
const mile = (name: string) => {
  report.taps.push({ vp: tag, name, taps: taps - lastMile, total: taps });
  lastMile = taps;
};
const note = (s: string) => report.notes.push(`[${tag}] ${s}`);
const tap = async (l: Locator) => {
  taps++;
  await l.tap();
};
let shotNo = 0;
const shot = async (page: Page, name: string) => {
  shotNo++;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${tag}-${String(shotNo).padStart(2, '0')}-${name}.png` });
};

/** 화면 감사: 작은 탭 대상 · 위 1/3 동작 · 가로 넘침 · 잘림 · 알림 겹침 */
async function audit(page: Page, screen: string) {
  const r = await page.evaluate(() => {
    const H = innerHeight;
    const W = innerWidth;
    const vis = (e: Element) => {
      const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < H && b.right > 0 && b.left < W && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && Number(cs.opacity) > 0.05;
    };
    const name = (e: Element) => (e.getAttribute('data-testid') || e.getAttribute('aria-label') || (e as HTMLElement).innerText || e.tagName).replace(/\s+/g, ' ').slice(0, 40);
    const sel = 'button, a[href], [role=button], input, [data-figure], [data-detail], .gloss, .term, [data-testid^=marker], [data-testid^=seat-], [data-testid^=chip-], [data-testid^=dot-]';
    const els = [...document.querySelectorAll(sel)].filter(vis);
    const small = els
      .map((e) => ({ e, b: e.getBoundingClientRect() }))
      .filter(({ b }) => b.width < 44 || b.height < 44)
      .map(({ e, b }) => `${name(e)} ${Math.round(b.width)}x${Math.round(b.height)}`);
    const top = els
      .filter((e) => e.tagName === 'BUTTON')
      .filter((e) => {
        const b = e.getBoundingClientRect();
        return b.top + b.height / 2 < H / 3;
      })
      .map(name);
    const hOverflow = document.documentElement.scrollWidth > W + 1 || document.body.scrollWidth > W + 1;
    const trunc = [...document.querySelectorAll('.app *')]
      .filter(vis)
      .filter((e) => {
        const he = e as HTMLElement;
        const cs = getComputedStyle(he);
        return he.children.length === 0 && he.innerText && (he.scrollWidth > he.clientWidth + 1) && (cs.overflow.includes('hidden') || cs.textOverflow === 'ellipsis');
      })
      .map((e) => `${name(e)} (${(e as HTMLElement).scrollWidth}>${(e as HTMLElement).clientWidth})`);
    const offR = els.filter((e) => e.getBoundingClientRect().right > W + 1).map(name);
    const toast = document.querySelector('[data-testid=toast]');
    const overT: string[] = [];
    if (toast && vis(toast)) {
      const t = toast.getBoundingClientRect();
      for (const e of els) {
        if (toast.contains(e)) continue;
        const b = e.getBoundingClientRect();
        if (b.left < t.right && b.right > t.left && b.top < t.bottom && b.bottom > t.top) overT.push(name(e));
      }
    }
    const fontSmall = [...document.querySelectorAll('.app *')]
      .filter(vis)
      .filter((e) => (e as HTMLElement).children.length === 0 && (e as HTMLElement).innerText?.trim() && parseFloat(getComputedStyle(e).fontSize) < 14)
      .map((e) => `${name(e)} ${getComputedStyle(e).fontSize}`)
      .slice(0, 8);
    return { small, top, hOverflow, trunc, offR, overT, fontSmall };
  });
  report.audits.push({ vp: tag, screen, ...r });
}

async function touchSwipe(cdp: CDPSession, x0: number, y0: number, x1: number, y1: number, steps = 8) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps }] });
    await new Promise((r) => setTimeout(r, 16));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function touchHold(cdp: CDPSession, x: number, y: number, ms: number) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await new Promise((r) => setTimeout(r, ms));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const center = async (l: Locator) => {
  await l.scrollIntoViewIfNeeded();
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

async function readChat(page: Page) {
  const t0 = Date.now();
  await tap(tid(page, 'dock-messenger'));
  let stable = 0;
  let last = -1;
  let replies = 0;
  for (let i = 0; i < 120 && stable < 4; i++) {
    const reply = tid(page, 'replies').locator('button').first();
    if (await reply.isVisible()) {
      await tap(reply);
      replies++;
      stable = 0;
    }
    const n = await page.locator('.msg, .sysline').count();
    const typing = await tid(page, 'typing').isVisible();
    stable = n === last && !typing ? stable + 1 : 0;
    last = n;
    await page.waitForTimeout(1000);
  }
  return { secs: Math.round((Date.now() - t0) / 1000) - 4, replies };
}
async function chatUntil(page: Page, text: string, maxS = 150) {
  const t0 = Date.now();
  for (let i = 0; i < maxS; i++) {
    if ((await tid(page, 'chat').innerText()).includes(text)) return Math.round((Date.now() - t0) / 1000);
    const reply = tid(page, 'replies').locator('button').first();
    if (await reply.isVisible()) await tap(reply);
    await page.waitForTimeout(1000);
  }
  throw new Error(`no ${text}`);
}
async function holdSubmit(page: Page, cdp: CDPSession, ms = 1500) {
  taps++;
  const c = await center(tid(page, 'btn-submit'));
  if (process.env.QA_MOUSEHOLD) { await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); return; }
  await touchHold(cdp, c.x, c.y, ms);
}
async function tagWith(page: Page, cut: string, fig: string, card: string, ev: string) {
  await tap(figure(page, cut, fig));
  await expect(tid(page, 'tag-sheet')).toBeVisible();
  await tap(tid(page, `card-${card}`));
  await tap(tid(page, `ev-${ev}`));
  await tap(tid(page, 'tag-confirm'));
}

for (const vp of [
  { name: 'm390', width: 390, height: 844 },
  { name: 'm360', width: 360, height: 740 },
]) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test(`full ${vp.name}`, async ({ page }) => {
      test.setTimeout(900_000);
      tag = vp.name;
      taps = 0;
      lastMile = 0;
      shotNo = 0;
      const cdp = await page.context().newCDPSession(page);
      const stage = async () => (await tid(page, 'stage').boundingBox())!;
      const idx = () => page.locator('[data-screen=viewer]').getAttribute('data-index');
      const fast = vp.name === 'm360';

      await page.goto('/?test=1&boot=1');
      await audit(page, 'title');
      await tap(tid(page, 'start'));
      await audit(page, 'prologue');
      // 프롤로그는 화면 탭으로 넘긴다(건너뛰기 없이) — 몇 번?
      let n = 0;
      while (!(await tid(page, 'assign-card').isVisible()) && n < 20) {
        if (await tid(page, 'next').isVisible()) await tap(tid(page, 'next'));
        n++;
        await page.waitForTimeout(250);
      }
      note(`프롤로그+콜드오픈을 「다음」으로 끝까지: ${n}탭`);
      mile('부트→홈(건너뛰기 없이)');
      await audit(page, 'home-ep0');
      await shot(page, 'home-ep0');
      if (fast) {
        await tap(tid(page, 'open-settings'));
        await audit(page, 'settings');
        await shot(page, 'settings');
        await tap(tid(page, 'sw-fast'));
        await tap(tid(page, 'settings-back'));
      }

      // ── Ep0 뷰어
      let t0 = Date.now();
      await tap(tid(page, 'btn-memories'));
      await expect(page.locator('[data-cut="e0-1"] [data-testid="bubble"]')).toBeVisible();
      report.timings.push({ vp: tag, what: '관측하기→첫 말풍선', ms: Date.now() - t0 });
      await audit(page, 'viewer-e0-1');
      await shot(page, 'viewer-e0-1');
      // 진짜 손가락 밀기(가운데에서)
      let sb = await stage();
      await touchSwipe(cdp, sb.x + sb.width * 0.85, sb.y + sb.height * 0.5, sb.x + sb.width * 0.25, sb.y + sb.height * 0.5);
      await page.waitForTimeout(500);
      note(`터치 밀기(가운데) 뒤 index=${await idx()}`);
      // 가장자리 근처(30px)에서 왼쪽→오른쪽 밀기(이전 컷 의도) — 뒤로가 되는가?
      await touchSwipe(cdp, sb.x + 30, sb.y + sb.height * 0.5, sb.x + 250, sb.y + sb.height * 0.5);
      await page.waitForTimeout(500);
      note(`x=30 에서 오른쪽 밀기 뒤: screen=${await page.locator('[data-screen]').first().getAttribute('data-screen')} index=${await idx()}`);
      if (!(await page.locator('[data-screen=viewer]').isVisible())) await tap(tid(page, 'btn-memories'));
      // 가장자리 12px 에서 오른쪽 밀기 = 뒤로
      sb = await stage();
      await touchSwipe(cdp, sb.x + 10, sb.y + sb.height * 0.5, sb.x + 200, sb.y + sb.height * 0.52);
      await page.waitForTimeout(500);
      note(`x=10 에서 오른쪽 밀기 뒤: home visible=${await page.locator('[data-screen=home]').isVisible()}`);
      if (!(await page.locator('[data-screen=viewer]').isVisible())) await tap(tid(page, 'btn-memories'));
      // 첫 컷으로
      await tap(tid(page, 'dot-0-1'));
      // 두루마리 세부
      await tap(page.locator('[data-cut="e0-1"] [data-detail="d_scroll_head"]'));
      await expect(tid(page, 'detail-note')).toBeVisible();
      await audit(page, 'detail-note');
      await shot(page, 'detail-note');
      await tap(tid(page, 'detail-note'));
      // 각 컷 둘러보기
      for (const k of [2, 3]) {
        await tap(tid(page, `dot-0-${k}`));
        await page.waitForTimeout(2500);
        await audit(page, `viewer-e0-${k}`);
        await shot(page, `viewer-e0-${k}`);
      }
      // 사람 탭 → 시트(아무 근거 없이)
      await tap(tid(page, 'dot-0-1'));
      await tap(figure(page, 'e0-1', 'fig_choi'));
      await expect(tid(page, 'tag-sheet')).toBeVisible();
      await audit(page, 'tag-sheet');
      await shot(page, 'tag-sheet');
      // 카드만 고르고 확인 가능한지?
      await tap(tid(page, 'card-jeong_changson'));
      note(`카드만 고른 뒤 tag-confirm enabled=${await tid(page, 'tag-confirm').isEnabled().catch(() => 'none')} visible=${await tid(page, 'tag-confirm').isVisible()}`);
      await audit(page, 'tag-sheet-card-picked');
      await shot(page, 'tag-sheet-card-picked');
      await tap(tid(page, 'ev-d_scroll_head'));
      await audit(page, 'tag-sheet-ev-picked');
      await shot(page, 'tag-sheet-ev-picked');
      await tap(tid(page, 'tag-confirm'));
      await expect(tid(page, 'tag-feedback')).toBeVisible();
      note(`틀린 이름 뒤 피드백: ${await tid(page, 'tag-feedback').innerText()} / 카드 선택 유지=${await tid(page, 'card-jeong_changson').getAttribute('aria-pressed')}`);
      await shot(page, 'tag-wrong');
      await tap(tid(page, 'card-choi_manri'));
      await tap(tid(page, 'ev-d_scroll_head'));
      await tap(tid(page, 'tag-confirm'));
      await expect(tid(page, 'tag-ok-stamp')).toBeVisible();
      await shot(page, 'tag-ok');
      await expect(tid(page, 'tag-sheet')).toBeHidden();
      mile('T0a 최만리(오답 1회 포함)');
      // 카드 → 세종 링크
      await tap(figure(page, 'e0-1', 'fig_choi'));
      await expect(tid(page, 'card-name')).toBeVisible();
      await audit(page, 'person-card');
      await shot(page, 'person-card');
      await tap(tid(page, 'flink-sejong'));
      await expect(tid(page, 'toast')).toBeVisible();
      await audit(page, 'person-card-toast');
      await shot(page, 'person-card-toast');
      await tap(tid(page, 'card-close'));
      await tap(tid(page, 'dot-0-3'));
      await page.waitForTimeout(2500);
      await tap(figure(page, 'e0-3', 'fig_king'));
      await tap(tid(page, 'card-sejong'));
      await tid(page, 'ev-l_e0_gunsang').scrollIntoViewIfNeeded();
      await shot(page, 'tag-sheet-scrolled');
      await tap(tid(page, 'ev-l_e0_gunsang'));
      await tap(tid(page, 'tag-confirm'));
      await expect(tid(page, 'tag-sheet')).toBeHidden();
      await expect(tid(page, 'toast')).toHaveText('모두 밝혀졌다', { timeout: 6000 });
      await audit(page, 'viewer-all-done');
      await shot(page, 'viewer-all-done');
      mile('T0b 세종');
      // 역사 고정
      await tap(tid(page, 'btn-to-rewrite'));
      await expect(tid(page, 'line-pc_R0')).toBeVisible();
      await audit(page, 'rewrite-ep0');
      await shot(page, 'rewrite-ep0');
      // 길게 누르지 않고 그냥 탭하면?
      const sc = await center(tid(page, 'btn-submit'));
      taps++;
      await touchHold(cdp, sc.x, sc.y, 120);
      await page.waitForTimeout(600);
      await shot(page, 'rewrite-short-tap');
      note(`역사 고정 짧은 탭(빈칸 그대로): result=${await tid(page, 'line-pc_R0').getAttribute('data-result')} 화면 글=${(await page.locator('.app').innerText()).match(/길게[^\n]*/)?.[0]}`);
      await tap(tid(page, 'slot-pc_R0-who'));
      await expect(tid(page, 'slot-sheet')).toBeVisible();
      await audit(page, 'slot-sheet');
      await shot(page, 'slot-sheet');
      await tap(tid(page, 'opt-세종'));
      // 반쯤 누르다 떼기
      const sc2 = await center(tid(page, 'btn-submit'));
      taps++;
      await touchHold(cdp, sc2.x, sc2.y, 600);
      await page.waitForTimeout(400);
      note(`0.6초 누르다 뗌: result=${await tid(page, 'line-pc_R0').getAttribute('data-result')}`);
      await page.evaluate(() => { (window as any).__ev = []; for (const t of ['pointerdown','pointerup','pointercancel','contextmenu','click']) window.addEventListener(t, (e) => (window as any).__ev.push(t + ':' + ((e.target as HTMLElement).closest('[data-testid]')?.getAttribute('data-testid') ?? '-') + '@' + Math.round(performance.now())), true); });
      await holdSubmit(page, cdp);
      await page.waitForTimeout(500);
      note(`1.5초 터치 홀드 이벤트: ${JSON.stringify(await page.evaluate(() => (window as any).__ev))} restoreScreen=${await page.locator('[data-screen=restore]').isVisible()} btnRestore=${await tid(page, 'btn-restore').isVisible()}`);
      if (await page.locator('[data-screen=restore]').isVisible()) { await shot(page, 'hold-skipped-to-restore'); }
      else {
      await expect(tid(page, 'btn-restore')).toBeVisible();
      await audit(page, 'rewrite-restored');
      await shot(page, 'rewrite-restored');
      await tap(tid(page, 'btn-restore'));
      }
      mile('Ep0 역사 고정');
      let steps = 0;
      while (!(await tid(page, 'reply-hangul').isVisible()) && steps < 10) {
        await page.waitForTimeout(3000);
        if (await tid(page, 'restore-next').isVisible() && !(await tid(page, 'restore-bridge').isVisible())) {
          await audit(page, `restore-${steps}`);
          await tap(tid(page, 'restore-next'));
        }
        steps++;
      }
      t0 = Date.now();
      await tap(tid(page, 'reply-hangul'));
      await expect(tid(page, 'restore-next')).toHaveText('다음 빈자리 ▸', { timeout: 90_000 });
      report.timings.push({ vp: tag, what: '다리 답장→「다음 빈자리」', ms: Date.now() - t0 });
      await audit(page, 'bridge');
      await shot(page, 'bridge');
      await tap(tid(page, 'restore-next'));
      while (!(await tid(page, 'assign-card').isVisible())) await tap(tid(page, 'next'));
      mile('복원→Ep1 홈');
      await audit(page, 'home-ep1');
      await shot(page, 'home-ep1');

      // ── Ep1
      await tap(tid(page, 'btn-memories'));
      for (let k = 1; k <= 5; k++) {
        await tap(tid(page, `dot-1-${k}`));
        await page.waitForTimeout(fast ? 800 : 2500);
        await audit(page, `viewer-e1-${k}`);
        if (k === 2 || k === 4) await shot(page, `viewer-e1-${k}`);
      }
      await tap(tid(page, 'dot-1-2'));
      await tagWith(page, 'e1-2', 'fig_yi', 'yi_geukdon', 'l_e1_2a');
      await expect(tid(page, 'toast')).toContainText('관측이 하나 열렸다');
      await audit(page, 'eye-opened-toast');
      await shot(page, 'eye-opened-toast');
      mile('T1 이극돈');
      await tap(page.locator('button[data-eye="E2"]'));
      await tap(tid(page, 'dot-2-1'));
      await tap(figure(page, 'e2-1', 'fig_yun'));
      await tap(tid(page, 'tag-search-more'));
      await audit(page, 'search-yun');
      await shot(page, 'search-yun');
      await tap(tid(page, 'hit-person-yun_hyoson'));
      await tap(tid(page, 'card-close'));
      await tap(tid(page, 'search-back'));
      await tap(tid(page, 'ev-l_e2_1'));
      await tap(tid(page, 'tag-confirm'));
      await expect(tid(page, 'tag-sheet')).toBeHidden();
      mile('T2 윤효손(찾기 경유)');
      await tap(page.locator('button[data-eye="E2"]'));
      await tap(tid(page, 'dot-2-1'));
      await tap(tid(page, 'btn-room'));
      await expect(tid(page, 'room-sheet')).toBeVisible();
      await audit(page, 'room-1140');
      await shot(page, 'room-1140');
      await page.getByRole('button', { name: '닫기' }).last().tap();
      // T3
      await tap(tid(page, 'dot-2-2'));
      await page.waitForTimeout(1500);
      await tap(figure(page, 'e2-2', 'fig_eo'));
      await tap(tid(page, 'card-eo_segyeom'));
      await tap(tid(page, 'ev-l_e1_3'));
      await tap(tid(page, 'tag-confirm'));
      note(`T3 첫 시도 피드백: ${await tid(page, 'tag-feedback').innerText()}`);
      await audit(page, 'tag-not-linked');
      await shot(page, 'tag-not-linked');
      await tap(tid(page, 'tag-room-link'));
      await expect(tid(page, 'room-sheet')).toBeVisible();
      await audit(page, 'room-1320');
      await shot(page, 'room-1320');
      const mk = (key: string) => page.locator(`[data-testid="room-plan"] [data-keys~="${key}"]`);
      note(`잇기 버튼(A 고르기 전) disabled=${await tid(page, 'link-start').isDisabled()} 글=${await tid(page, 'link-start').innerText()}`);
      // 플레이어 직관: A 탭 후 바로 B 탭(버튼 건너뜀)
      await tap(mk('e2-2#fig_eo'));
      await shot(page, 'room-A-selected');
      await audit(page, 'room-A-selected');
      await tap(mk('e1-3#say:l_e1_3'));
      await page.waitForTimeout(400);
      note(`A→B 직접 탭(버튼 없이): same-person=${await tid(page, 'same-person').count()} A sel=${await mk('e2-2#fig_eo').getAttribute('data-sel')} B sel=${await mk('e1-3#say:l_e1_3').getAttribute('data-sel')}`);
      await shot(page, 'room-A-then-B-direct');
      // 정식: A → 잇기 → B
      await tap(mk('e2-2#fig_eo'));
      await tap(tid(page, 'link-start'));
      await audit(page, 'room-linking');
      await shot(page, 'room-linking');
      await tap(mk('e1-3#owner'));
      note(`틀린 잇기: ${await tid(page, 'link-feedback').innerText()}`);
      await tap(tid(page, 'link-start'));
      await tap(mk('e1-3#say:l_e1_3'));
      await expect(tid(page, 'same-person')).toBeVisible();
      await shot(page, 'room-linked');
      await page.getByRole('button', { name: '닫기' }).last().tap();
      await expect(tid(page, 'tag-sheet')).toBeVisible();
      await tap(tid(page, 'ev-l_e1_3'));
      await tap(tid(page, 'tag-confirm'));
      await expect(tid(page, 'tag-sheet')).toBeHidden();
      mile('T3 어세겸(방 잇기 포함, 오답 1회)');
      for (let k = 1; k <= 5; k++) await tap(tid(page, `dot-2-${k}`));
      // T4
      await tap(page.locator('button[data-eye="E3"]'));
      await tap(figure(page, 'e3-1', 'fig_hong'));
      await tap(tid(page, 'tag-search-more'));
      await tid(page, 'search-input').fill('국장 도감');
      taps++;
      await tap(tid(page, 'search-go'));
      await audit(page, 'search-results');
      await shot(page, 'search-results');
      await tap(tid(page, 'hit-record-rec_r02'));
      await audit(page, 'record-toast');
      await shot(page, 'record-toast');
      await tap(tid(page, 'search-back'));
      await tap(tid(page, 'card-hong_gwidal'));
      await tap(tid(page, 'ev-l_e3_1'));
      await tap(tid(page, 'tag-confirm'));
      await expect(tid(page, 'tag-sheet')).toBeHidden();
      mile('T4 홍귀달(찾기 경유)');
      for (let k = 1; k <= 5; k++) await tap(tid(page, `dot-3-${k}`));
      await tap(page.locator('button[data-eye="E4"]'));
      for (let k = 1; k <= 5; k++) {
        await tap(tid(page, `dot-4-${k}`));
        await page.waitForTimeout(fast ? 600 : 2000);
      }
      await expect(tid(page, 'alert-chip')).toBeVisible();
      await audit(page, 'viewer-alert-chip');
      await shot(page, 'viewer-alert-chip');
      await tap(tid(page, 'alert-chip'));
      await expect(tid(page, 'conflict-plan')).toBeVisible();
      await audit(page, 'contradiction-x1');
      await shot(page, 'contradiction-x1');
      await tap(tid(page, 'seat-E4'));
      await shot(page, 'contradiction-seat-line');
      await audit(page, 'contradiction-seat');
      await tap(tid(page, 'resolve-wait'));
      t0 = Date.now();
      const s = await chatUntil(page, '맨 끝 봐, 1년 전에도 너 거기서 멈췄어.');
      report.timings.push({ vp: tag, what: '06:00 메신저 대기(보고서까지)', ms: s * 1000 });
      await audit(page, 'messenger');
      await shot(page, 'messenger');
      await tap(tid(page, 'messenger-back'));
      await tap(tid(page, 'alert-chip'));
      await tap(tid(page, 'claim-c_scope_six'));
      await tap(tid(page, 'cev-X1:E4'));
      await tap(tid(page, 'resolve-confirm'));
      await audit(page, 'contradiction-retry');
      await shot(page, 'contradiction-retry');
      await tap(tid(page, 'claim-c_scope_all'));
      await tap(tid(page, 'cev-X1:E4'));
      await tap(tid(page, 'resolve-confirm'));
      await expect(tid(page, 'resolved-text')).toBeVisible();
      await shot(page, 'contradiction-resolved');
      mile('X1 모순(오답 1회, 메신저 대기 포함)');
      await tap(tid(page, 'room-back'));
      await page.getByRole('button', { name: '닫기' }).last().tap();
      await tap(tid(page, 'viewer-back'));
      await tap(tid(page, 'btn-rewrite'));
      await audit(page, 'rewrite-ep1');
      await shot(page, 'rewrite-ep1');
      const fill = async (piece: string, kind: string, value: string) => {
        await tap(tid(page, `slot-${piece}-${kind}`));
        await tap(tid(page, `opt-${value}`));
      };
      await fill('pc_L1', 'whose', '김일손');
      await fill('pc_L1', 'scope', '모두');
      await fill('pc_L2', 'speaker', '당상(이극돈 등)');
      await holdSubmit(page, cdp);
      await page.waitForTimeout(800);
      await fill('pc_L4', 'who', '이극돈');
      await fill('pc_L4', 'whose', '김일손');
      await tap(tid(page, 'slot-pc_L4-count'));
      await tap(tid(page, 'opt-6'));
      await expect(tid(page, 'conflict-plan')).toBeVisible();
      await audit(page, 'contradiction-x2');
      await shot(page, 'contradiction-x2');
      await tap(tid(page, 'seat-E1'));
      await tap(tid(page, 'claim-c_count_6'));
      await tap(tid(page, 'cev-X2:E1'));
      await tap(tid(page, 'resolve-confirm'));
      await expect(tid(page, 'resolved-text')).toBeVisible();
      await tap(tid(page, 'room-back'));
      await page.getByRole('button', { name: '닫기' }).last().tap();
      note(`X2 해결 뒤 돌아온 화면: rewrite=${await page.locator('[data-screen=rewrite]').isVisible()} count 칸=${await tid(page, 'slot-pc_L4-count').innerText()}`);
      await fill('pc_L4', 'count', '6');
      await tap(tid(page, 'btn-add-line'));
      await audit(page, 'add-line-sheet');
      await shot(page, 'add-line-sheet');
      await tap(tid(page, 'piece-pc_S3'));
      await tap(tid(page, 'btn-add-line'));
      await tap(tid(page, 'piece-w_alive'));
      await audit(page, 'rewrite-compose');
      await shot(page, 'rewrite-compose');
      await holdSubmit(page, cdp);
      await page.waitForTimeout(1000);
      note(`Ep1 최종 홀드 뒤: restoreScreen=${await page.locator('[data-screen=restore]').isVisible()}`);
      await shot(page, 'rewrite-verdict');
      mile('Ep1 역사 고정(X2 포함)');
      if (await tid(page, 'btn-restore').isVisible()) await tap(tid(page, 'btn-restore'));
      for (let i = 0; i < 4; i++) {
        await page.waitForTimeout(2500);
        await audit(page, `restore1-${i}`);
        await shot(page, `restore1-${i}`);
        await tap(tid(page, 'restore-next'));
      }
      mile('Ep1 복원 끝');
      fs.writeFileSync(`${OUT}/report-${tag}.json`, JSON.stringify(report, null, 1));
    });
  });
}

test.afterEach(() => { fs.writeFileSync(`${OUT}/report-${tag}.json`, JSON.stringify(report, null, 1)); });

test.describe('misc', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  test('resume, rotate, reduced motion, edge vs sheet', async ({ page, browser }) => {
    test.setTimeout(240_000);
    tag = 'misc';
    const misc: string[] = [];
    await page.goto('/?test=1&ep=1');
    await expect(tid(page, 'assign-card')).toBeVisible();
    await tid(page, 'btn-memories').tap();
    await tid(page, 'dot-1-2').tap();
    await figure(page, 'e1-2', 'fig_yi').tap();
    await tid(page, 'card-eo_segyeom').tap();
    await page.waitForTimeout(3000);
    await page.reload();
    await page.waitForTimeout(1500);
    misc.push(`새로고침 뒤 화면: ${(await page.locator('.app').innerText()).slice(0, 120).replace(/\n/g, ' / ')}`);
    await page.screenshot({ path: `${OUT}/misc-reload.png` });
    if (await tid(page, 'continue').isVisible()) await tid(page, 'continue').tap();
    await page.waitForTimeout(800);
    misc.push(`이어하기 뒤: viewer=${await page.locator('[data-screen=viewer]').isVisible()} home=${await page.locator('[data-screen=home]').isVisible()} sheet=${await tid(page, 'tag-sheet').isVisible()}`);
    // 시트 위에서 가장자리 밀기
    await tid(page, 'btn-memories').tap();
    await tid(page, 'dot-1-2').tap();
    await figure(page, 'e1-2', 'fig_yi').tap();
    const cdp = await page.context().newCDPSession(page);
    await touchSwipe(cdp, 8, 600, 200, 605);
    await page.waitForTimeout(500);
    misc.push(`시트 위 가장자리 밀기: sheet=${await tid(page, 'tag-sheet').isVisible()} viewer=${await page.locator('[data-screen=viewer]').isVisible()}`);
    // 시트를 아래로 끌어 닫기?
    if (!(await tid(page, 'tag-sheet').isVisible())) await figure(page, 'e1-2', 'fig_yi').tap();
    const sh = (await tid(page, 'tag-sheet').boundingBox())!;
    await touchSwipe(cdp, sh.x + sh.width / 2, sh.y + 10, sh.x + sh.width / 2, sh.y + 400);
    await page.waitForTimeout(500);
    misc.push(`시트 손잡이 아래로 끌기: sheet 남음=${await tid(page, 'tag-sheet').isVisible()}`);
    // 시트 밖(컷) 탭
    if (await tid(page, 'tag-sheet').isVisible()) {
      await page.touchscreen.tap(195, 120);
      await page.waitForTimeout(400);
      misc.push(`시트 밖 탭: sheet 남음=${await tid(page, 'tag-sheet').isVisible()}`);
    }
    // 회전
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);
    misc.push(`가로: guard=${await page.getByText('세로로 돌려 주세요').isVisible()}`);
    await page.screenshot({ path: `${OUT}/misc-rotate.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    misc.push(`세로 복귀: viewer=${await page.locator('[data-screen=viewer]').isVisible()}`);
    // reduced motion
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', baseURL: 'http://localhost:4173' });
    const p2 = await ctx.newPage();
    await p2.goto('/?test=1&ep=0');
    await expect(tid(p2, 'assign-card')).toBeVisible();
    const anims = await p2.evaluate(() => {
      const out: string[] = [];
      for (const e of document.querySelectorAll('.app *')) {
        const cs = getComputedStyle(e);
        const d = parseFloat(cs.animationDuration) * (cs.animationDuration.endsWith('ms') ? 0.001 : 1);
        if (cs.animationName !== 'none' && d > 0.05) out.push(`${(e as HTMLElement).className} ${cs.animationName} ${cs.animationDuration} ${cs.animationIterationCount}`);
      }
      return out;
    });
    misc.push(`reduced-motion 홈 남은 애니메이션: ${JSON.stringify(anims.slice(0, 6))}`);
    await tid(p2, 'btn-memories').tap();
    const sb = (await tid(p2, 'stage').boundingBox())!;
    const c2 = await ctx.newCDPSession(p2);
    await touchSwipe(c2, sb.x + sb.width * 0.85, sb.y + sb.height * 0.5, sb.x + sb.width * 0.25, sb.y + sb.height * 0.5);
    await p2.waitForTimeout(300);
    misc.push(`reduced-motion 밀기 index=${await p2.locator('[data-screen=viewer]').getAttribute('data-index')}`);
    await ctx.close();
    fs.writeFileSync(`${OUT}/report-misc.json`, JSON.stringify(misc, null, 1));
  });
});
