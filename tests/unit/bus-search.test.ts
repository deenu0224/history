import { describe, expect, it, vi } from 'vitest';
import { createBus, type BusEvents } from '@/core/bus';
import { matchTerm, normalizeQuery, searchIndex } from '@/core/search';
import { EP1 } from '@/data/v5';
import { selectSearch } from '@/store/gameStore';
import { makeStore } from './store-helpers';

describe('bus', () => {
  it('on / once / off / clear', () => {
    const b = createBus<BusEvents>();
    const fn = vi.fn();
    const off = b.on('feedback', fn);
    b.once('notify', fn);
    b.emit('feedback', { kind: 'tag_ok' });
    b.emit('notify', { text: 'a' });
    b.emit('notify', { text: 'b' });
    off();
    b.emit('feedback', { kind: 'tag_no' });
    expect(fn.mock.calls).toEqual([[{ kind: 'tag_ok' }], [{ text: 'a' }]]);
    b.on('ui:open', fn);
    b.clear();
    b.emit('ui:open', { modal: 'room' });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('search (찾기)', () => {
  it('normalizes and matches exact / contains / prefix', () => {
    expect(normalizeQuery('「국장 도감」')).toBe('국장도감');
    expect(matchTerm('국장도감', '국장도감')).toBe('exact');
    expect(matchTerm('김일손의사초를', '김일손')).toBe('contains');
    expect(matchTerm('조의제', '조의제문')).toBe('prefix');
    expect(searchIndex(EP1.search, '윤').matches.map((m) => m.entry.id).sort()).toEqual(['s_yun_hyoson', 's_yun_pilsang']);
  });

  it('heard words become search chips; erased article → 해당 기사 없음; sacho-month records only after restoration', () => {
    const h = makeStore();
    h.st().startEpisode();
    h.st().openEye('E1');
    for (let i = 0; i < 5; i++) h.st().viewCut('E1', i);
    expect(selectSearch(EP1, h.st()).terms).toEqual(['이조 판서', '사관', '김일손', '사초', '대내']);
    const r = h.st().search('대내로 들여오라');
    expect(r).toMatchObject({ status: 'no_article', message: '해당 기사 없음.' });
    expect(h.st().search('불살라').status).toBe('unknown');
    expect(h.st().search('명단').results).toEqual([{ kind: 'record', id: 'rec_r18' }]);
    expect(h.st().openRecord('rec_r18')).toBe(true);
    expect(h.st().cardsFound).toEqual(expect.arrayContaining(['yun_hyoson', 'hong_gwidal', 'yu_sun', 'an_chim']));
    expect(h.st().openRecord('rec_0711')).toBe(false);
    expect(h.st().search('#C-0408').status).toBe('unknown'); // 예고 문서는 아직 없다
    expect(h.st().messenger.fired).not.toContain('ev.search_kim');
    h.st().search('金馹孫');
    expect(h.st().messenger.fired).toContain('ev.search_kim');
  });
});
