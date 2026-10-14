import { chromium } from '/home/user/history/node_modules/playwright/index.mjs';
const [,, url, out, w='400', h='700', dpr='2'] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
p.on('console', m => { if (m.type()==='error') console.log('ERR', m.text()); });
p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.goto(url); await p.waitForTimeout(800);
await p.screenshot({ path: out });
await b.close();
