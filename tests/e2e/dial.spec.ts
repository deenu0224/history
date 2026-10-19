/**
 * 다이얼 시제품(dial.html) e2e — 모든 조작은 실제 포인터 드래그·탭·길게 누르기.
 * 정답 경로: 바깥 고리로 높은 자리(웅얼거림만) → 줄 앞의 상소 소리 잠금 → 「소(疏)를 보고」 탭 → 안쪽 고리 표식 →
 *   높은 자리 + 표식 근처 시각 → 잠금(군상) → 가운데 길게 누르기(일찍 떼면 손해 없음) → 복원.
 * 화면 캡처: DIAL_SHOTS=1 일 때 mockups/out/dial/*.png (모바일 390×844).
 */
import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { bareHanja } from '../../src/ui/lib/text';
import { ARTICLE_0220_KO } from '../../src/data/v5/ep0/article';

const SHOTS = 'mockups/out/dial';
const wantShots = !!process.env.DIAL_SHOTS;
let shotNo = 0;
const shot = async (page: Page, name: string, project: string) => {
  if (!wantShots || project !== 'mobile') return;
  fs.mkdirSync(SHOTS, { recursive: true });
  shotNo += 1;
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/${String(shotNo).padStart(2, '0')}-${name}.png` });
};

const rad = (d: number) => (d * Math.PI) / 180;
const norm = (a: number) => ((a % 360) + 360) % 360;
const delta = (from: number, to: number) => {
  const d = norm(to - from);
  return d > 180 ? d - 360 : d;
};

const app = (page: Page) => page.getByTestId('dial-app');
const num = async (page: Page, attr: string) => Number(await app(page).getAttribute(attr));

/** 다이얼 위에서 반지름 r(viewBox 단위)을 따라 호를 그리며 끈다 */
async function dragArc(page: Page, r: number, fromDeg: number, deg: number) {
  const b = (await page.getByTestId('dial').boundingBox())!;
  const k = b.width / 300;
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const P = (a: number) => [cx + r * k * Math.cos(rad(a)), cy + r * k * Math.sin(rad(a))] as const;
  await page.mouse.move(...P(fromDeg));
  await page.mouse.down();
  const steps = Math.max(3, Math.ceil(Math.abs(deg) / 4));
  for (let i = 1; i <= steps; i++) await page.mouse.move(...P(fromDeg + (deg * i) / steps));
  await page.mouse.up();
}

async function turnOuterTo(page: Page, angle: number) {
  const target = norm(Math.round(angle / 3) * 3);
  for (let i = 0; i < 6 && (await num(page, 'data-beam')) !== target; i++) {
    await dragArc(page, 127, -60, delta(await num(page, 'data-beam'), target));
  }
  await expect(app(page)).toHaveAttribute('data-beam', String(target));
}

async function turnInnerTo(page: Page, minute: number) {
  for (let i = 0; i < 6 && (await num(page, 'data-minute')) !== minute; i++) {
    await dragArc(page, 84, -60, (minute - (await num(page, 'data-minute'))) * 6);
  }
  await expect(app(page)).toHaveAttribute('data-minute', String(minute));
}

async function holdCenter(page: Page, ms: number) {
  const b = (await page.getByTestId('dial').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
}

test('다이얼: 방향·시각을 맞춰 잠그고 길게 눌러 고정한다', async ({ page }, info) => {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && errs.push(`http ${r.status()} ${r.url()}`));
  const P = info.project.name;

  await page.goto('dial.html?test=1');
  await expect(app(page)).toBeVisible();
  const moments = JSON.parse((await app(page).getAttribute('data-moments'))!) as { id: string; angle: number; minute: number }[];
  const [memorial, rebuke] = moments;
  const text = () => app(page).innerText();

  // 1) 정적 + 다이얼, 동료 한 줄. 안쪽 고리는 아직 잠들어 있다
  await expect(page.getByTestId('messenger')).toContainText('돌려 봐. 소리 나는 쪽이 있을 거야.');
  await expect(page.getByTestId('inner-ring')).toHaveClass(/is-off/);
  await expect(page.getByTestId('word-so')).toBeDisabled();
  await expect(page.getByTestId('hole')).toHaveText('[ ? ]이');
  expect(await text()).not.toContain('임금');
  await shot(page, 'static', P);

  // 2) 높은 자리 쪽: 시각이 맞지 않아 뭉갠 소리만
  await turnOuterTo(page, rebuke.angle);
  await expect(app(page)).toHaveAttribute('data-lock', '');
  await expect(page.getByTestId('garbled')).toBeVisible();
  await shot(page, 'dais-garbled', P);

  // 줄 앞 상소 소리: 잠금 → 국역 그대로
  await turnOuterTo(page, memorial.angle);
  await expect(app(page)).toHaveAttribute('data-lock', memorial.id);
  const memLine = page.locator('[data-line="l_e0_memorial"]');
  await expect(memLine).toBeVisible();
  expect(ARTICLE_0220_KO).toContain(await memLine.innerText());
  await expect(page.getByTestId('inner-ring')).not.toHaveClass(/is-off/);
  await shot(page, 'memorial-locked', P);

  // 3) 낱말 탭 → 안쪽 고리에 「근처」 표식
  await expect(page.getByTestId('messenger')).toContainText('소(疏)');
  await page.getByTestId('word-so').click();
  await expect(page.getByTestId('time-marker')).toBeVisible();
  await shot(page, 'marker', P);

  // 높은 자리 + 표식 가장자리: 맥놀이(뭉갠 말), 아직 잠금 아님
  await turnOuterTo(page, rebuke.angle);
  await turnInnerTo(page, rebuke.minute + 2);
  await expect(app(page)).toHaveAttribute('data-lock', '');
  await expect(page.getByTestId('garbled')).toBeVisible();
  await shot(page, 'beat-near', P);

  // 4) 정확한 분 → 잠금, 「군상」 → 구멍이 맥박친다
  await turnInnerTo(page, rebuke.minute);
  await expect(app(page)).toHaveAttribute('data-lock', rebuke.id);
  await expect(page.locator('[data-line="l_e0_gunsang"]')).toContainText('군상(君上, 임금)');
  await expect(app(page)).toHaveAttribute('data-can-fix', '1');
  await expect(page.getByTestId('hole')).toHaveClass(/is-pulse/);
  await shot(page, 'rebuke-locked', P);

  // 일찍 떼면 아무 일 없다
  await holdCenter(page, 600);
  await shot(page, 'holding', P);
  await page.mouse.up();
  await page.waitForTimeout(300);
  await expect(app(page)).toHaveAttribute('data-fixed', '0');

  // 길게 눌러 고정
  await holdCenter(page, 2000);
  await page.mouse.up();
  await expect(app(page)).toHaveAttribute('data-fixed', '1');

  // 5) 복원
  await expect(page.getByTestId('hole')).toHaveText('임금이');
  await expect(page.getByTestId('restored')).toContainText('이달에 임금이 친히 언문(諺文) 28자(字)를 지었는데');
  await expect(page.getByTestId('restored')).toContainText('『세종실록』 102권');
  await expect(page.getByTestId('messenger')).toContainText('세종대왕이 만든 거 모르는 사람이 어디 있어.');
  expect(bareHanja(await text()), '한글 읽기 없는 한자').toEqual([]);
  await shot(page, 'restored', P);

  await page.getByTestId('about').click();
  await expect(page.getByRole('dialog')).toContainText('재구성');
  await shot(page, 'about', P);
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();

  // 처음부터
  await page.getByTestId('reset').click();
  await expect(app(page)).toHaveAttribute('data-fixed', '0');
  await expect(page.getByTestId('hole')).toHaveText('[ ? ]이');
  await expect(page.getByTestId('inner-ring')).toHaveClass(/is-off/);

  expect(errs).toEqual([]);
});
