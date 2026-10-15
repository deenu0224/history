/**
 * 한자 규칙(DEDUCTION_RULES 7): 화면에 나오는 한자는 늘 한글 읽기를 옆에 붙인다.
 * 에피소드 글(들은 말·본 것·카드 줄·기사·메시지 …)은 「읽기(한자)」 꼴이어야 한다. UI 코드의 한자도 허용 목록 밖에는 없다.
 */
// @ts-expect-error — @types/node 없이 파일만 읽는다
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EP0, EP1 } from '@/data/v5';
import type { Episode } from '@/core/types';
import { bareHanja } from '@/ui/lib/text';

const HANJA = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

function strings(ep: Episode): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const add = (where: string, text?: string) => text && out.push({ where, text });
  for (const l of ep.lines) {
    add(`line ${l.id}`, l.text);
  }
  for (const d of ep.details) add(`detail ${d.id}`, d.label);
  for (const c of ep.cards) {
    for (const f of c.facts) add(`fact ${f.id}`, f.text);
    for (const a of c.altered ?? []) add(`altered ${a.id}`, a.display);
  }
  for (const p of ep.pieces) add(`piece ${p.id}`, p.label);
  for (const p of ep.article.parts) add('article', p.text);
  for (const r of ep.records) {
    for (const l of r.lines) add(`record ${r.id}`, l.text);
    for (const l of r.inWorld ?? []) add(`record-inworld ${r.id}`, l);
  }
  for (const f of ep.figures) add(`figure ${f.id}`, f.label);
  add('home place', ep.home.place.after);
  add('home task', ep.home.task);
  add('home detection', ep.home.detection);
  const walk = (steps: unknown[], where: string) => {
    for (const st of steps as { kind: string; text?: string; options?: { text?: string; then: unknown[] }[]; after?: unknown[] }[]) {
      add(`${where} ${st.kind}`, st.text);
      for (const o of st.options ?? []) {
        add(`${where} option`, o.text);
        walk(o.then, where);
      }
      if (st.after) walk(st.after, where);
    }
  };
  for (const b of ep.bursts) walk(b.steps as unknown[], `burst ${b.id}`);
  return out;
}

describe.each([
  ['EP0', EP0],
  ['EP1', EP1],
])('한자에는 한글 읽기가 옆에 있다 — %s', (_n, ep) => {
  it('에피소드 글', () => {
    const bad = strings(ep)
      .map((s) => ({ ...s, bare: bareHanja(s.text) }))
      .filter((s) => s.bare.length);
    expect(bad.map((b) => `${b.where}: ${b.bare.join(',')} ← ${b.text.slice(0, 40)}`)).toEqual([]);
  });
});

describe('UI 코드의 한자', () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = `${d}/${f}`;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(p)) files.push(p);
    }
  };
  walk('src/ui');
  it('화면 글에는 한글 읽기 없는 한자가 없다(주석 제외)', () => {
    const bad: string[] = [];
    for (const f of files) {
      for (const [n, raw] of readFileSync(f, 'utf8').split('\n').entries()) {
        const line = raw.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').replace(/^\s*\*.*$/, '');
        if (!HANJA.test(line)) continue;
        for (const b of bareHanja(line)) bad.push(`${f}:${n + 1} ${b}`);
      }
    }
    // 도장 「實錄」은 같은 도장 안에 「실록」이 붙어 있다(같은 줄은 아니므로 허용)
    expect(bad.filter((x) => !x.startsWith('src/ui/parts/RestoredCard.tsx') && !x.startsWith('src/ui/screens/Restore.tsx') && !x.startsWith('src/ui/screens/Boot.tsx'))).toEqual([]);
  });
});
