import { chromium } from '/home/user/history/node_modules/playwright/index.mjs';
const only = process.argv.slice(2);
const b = await chromium.launch();
const probe = await b.newPage();
await probe.goto('http://localhost:5195/mockups.html');
await probe.waitForFunction(() => window.__SCREENS);
const screens = await probe.evaluate(() => window.__SCREENS);
await probe.close();
for (const s of screens) {
  if (only.length && !only.includes(s.id)) continue;
  const p = await b.newPage({ viewport: { width: s.vw ?? s.w, height: s.vh ?? s.h }, deviceScaleFactor: 3 });
  p.on('console', (m) => { if (m.type() === 'error') console.log(s.id, 'ERR', m.text()); });
  p.on('pageerror', (e) => console.log(s.id, 'PAGEERR', e.message));
  await p.goto(`http://localhost:5195/mockups.html#/${s.id}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `/home/user/history/mockups/out/${s.id}-${s.name}.png` });
  await p.close();
  console.log('ok', s.id, s.name);
}
await b.close();
