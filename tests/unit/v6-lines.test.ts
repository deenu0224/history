import { describe, expect, it } from 'vitest';
import sources from '../../docs/HISTORICAL_SOURCES.md?raw';
import { ARTICLE_0220_KO, ARTICLE_0220_PARTS } from '@/data/v5/ep0/article';
import { EP0_V6 as D } from '@/data/v6/ep0';
import { HOLED_PARTS } from '@/data/v6/ep0/lines';
import { fillWho, holeCount, kukyeokView, modernView, sourceView, wonmunView, SOURCE_HIDDEN } from '@/core/v6/lines';

const L = D.lines;
const doc = sources.replace(/\s/g, '');
const ko = ARTICLE_0220_KO.replace(/\s/g, '');
const n = (s: string) => s.replace(/\s/g, '');

describe('검증 문장은 HISTORICAL_SOURCES·실록 국역 그대로', () => {
  it('국역: 기사 전문 또는 문서에 글자 그대로 있다', () => {
    for (const v of Object.values(L.verified)) {
      const k = n(v.kukyeok);
      const inArticle = ko.includes(k) || (v.id === 'L_holed' && n(ARTICLE_0220_PARTS[1]).concat('…') === k) || (v.id === 'L_restored' && ko.includes(n(v.kukyeok.replace(' …', ''))));
      expect(inArticle || doc.includes(k), `${v.id} 국역`).toBe(true);
    }
  });

  it('원문: §13.8 / §13.1 / §13.2 에 글자 그대로 있다(없으면 null)', () => {
    for (const v of Object.values(L.verified)) {
      if (v.wonmun === null) continue;
      const parts = v.id === 'L_restored' || v.id === 'L_holed' ? [v.wonmun.split(' ')[0]!.concat(' ', v.wonmun.split(' ')[1]!).replace(/ $/, ''), v.wonmun.slice(v.wonmun.indexOf('"'))] : [v.wonmun];
      for (const p of parts) expect(doc.includes(n(p)), `${v.id} 원문 ${p.slice(0, 12)}`).toBe(true);
    }
  });

  it('§13.8 로 채운 여섯 줄은 원문이 있다', () => {
    for (const id of ['L_head', 'L_eonmun', 'L_s_seol', 'L_k_seol', 'L_summon', 'L_restored']) expect(L.verified[id]!.wonmun, id).not.toBeNull();
    // 아직 확인하지 않은 줄은 「확보 전」(null) — 한자를 지어내지 않는다
    for (const id of ['L_n6', 'L_n8', 'L_n9']) expect(L.verified[id]!.wonmun).toBeNull();
  });

  it('구멍 난 단락의 이은 글 = 국역 기사의 그 단락', () => {
    expect(L.verified.L_holed!.kukyeok).toBe(`${ARTICLE_0220_PARTS[1]} …`);
    expect(holeCount(L.verified.L_holed!)).toBe(4);
    expect(HOLED_PARTS.filter((p) => 'hole' in p)).toHaveLength(4);
  });

  it('하위지 국역 표기 주석(河緯之 — 원문 河緯地)', () => {
    expect(L.verified.L_roster!.note).toContain('河緯地');
    expect(L.verified.L_roster!.wonmun).toContain('河緯地');
    expect(L.verified.L_roster!.kukyeok).toContain('河緯之');
  });

  it('모든 줄에 provenance 와 출처', () => {
    for (const v of Object.values(L.verified)) {
      expect(v.provenance).toBe('verified');
      expect(v.url).toMatch(/^https:\/\//);
    }
    for (const m of Object.values(L.modern)) expect(m.provenance).toBe('reconstructed');
    for (const s of Object.values(L.scenes)) expect(s.provenance).toBe('reconstructed');
  });
});

describe('손상된 줄과 원문 보기', () => {
  it('복원 전: 현대어·국역·원문이 같은 자리가 뚫려 있다', () => {
    const mv = modernView(L, 'm_tail', false);
    const kv = kukyeokView(L, 'L_holed', false);
    const marks = (s: string) => s.match(/\[ [?─]+ \]/g) ?? [];
    expect(marks(mv)).toEqual(marks(kv));
    expect(marks(mv)).toHaveLength(4);
    const w = wonmunView(L, 'L_holed', false);
    expect(w).toMatchObject({ status: 'damaged', holes: 4 });
    expect(mv.startsWith('[ ? ] 올린 글을 보고, ')).toBe(true);
    expect(mv).toContain('누가 바로잡겠느냐. …');
    expect(`${mv}${kv}${w.text}`).not.toContain('임금');
  });

  it('복원 뒤: 구멍 없이 돌아온다', () => {
    expect(modernView(L, 'm_tail', true).startsWith('임금이 올린 글을 보고, 만리 등에게')).toBe(true);
    expect(kukyeokView(L, 'L_holed', true)).toBe(L.verified.L_holed!.kukyeok);
    expect(wonmunView(L, 'L_holed', true).status).toBe('ok');
  });

  it('복원 전 출처는 왕대·연도를 가리고, 복원 뒤에 보인다', () => {
    expect(sourceView(L, 'L_head', false)).toEqual({ text: SOURCE_HIDDEN });
    const after = sourceView(L, 'L_head', true);
    expect(after.text).toContain('세종 26년 2월 20일');
    expect(after.url).toContain('kda_12602020_001');
  });

  it('누가 칸에 이름을 넣은 국역은 조사까지 검증된 국역과 같아야 한다', () => {
    expect(fillWho(L.verified.L_holed!, '임금')).toBe(L.verified.L_holed!.kukyeok);
    expect(fillWho(L.verified.L_holed!, '최만리')).not.toBe(L.verified.L_holed!.kukyeok);
    expect(fillWho(L.verified.L_holed!, '최만리')).toContain('최만리가 소(疏)를 보고');
  });

  it('원문이 없는 줄은 확보 전', () => {
    expect(wonmunView(L, 'L_n6', false)).toMatchObject({ status: 'pending' });
  });
});

describe('메신저 예산', () => {
  it('한 선임 줄 ≤ 15, 말풍선 ≤ 30자, 복원 전 줄에 답 낱말 없음', async () => {
    const { BURSTS0, ERASED0 } = await import('@/data/v6/ep0');
    const says: { text: string; restored?: string; facts?: string[]; post: boolean }[] = [];
    const walk = (steps: any[], post: boolean) => {
      for (const s of steps) {
        if (s.kind === 'say') says.push({ text: s.text, restored: s.restored, facts: s.facts, post });
        if (s.kind === 'choice') {
          for (const o of s.options) walk(o.then, post);
          walk(s.after ?? [], post);
        }
      }
    };
    for (const b of BURSTS0) walk(b.steps, !!b.postRestore);
    expect(says.length).toBeLessThanOrEqual(15);
    expect(says.length).toBeGreaterThan(8);
    for (const s of says) {
      expect(s.text.replace(/\s/g, '').length, s.text).toBeLessThanOrEqual(30);
      if (!s.post) for (const t of D.answerTokens) expect(s.text, s.text).not.toContain(t);
      // 소실 사실에 기대는 줄은 달아 두었다
      const relies = ERASED0.some((f) => f.tells.some((re) => re.test(s.text)));
      if (relies && !s.post) expect(s.facts?.length, s.text).toBeGreaterThan(0);
    }
  });
});
