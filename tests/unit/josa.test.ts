import { describe, expect, it } from 'vitest';
import { cellsText, josa, josaAfter } from '@/core/josa';

describe('josa helpers (pure text)', () => {
  it('josa picks by final consonant', () => {
    expect(josa('최만리', '이/가')).toBe('최만리가');
    expect(josa('임금', '이/가')).toBe('임금이');
  });
  it('josaAfter fixes the particle that follows a slot value only when it is a particle', () => {
    expect(josaAfter('최만리', '이 소(疏)를 보고')).toBe('가 소(疏)를 보고');
    expect(josaAfter('임금', '이 소(疏)를 보고')).toBe('이 소(疏)를 보고');
    expect(josaAfter('상소를 올린 사람들', '이 소')).toBe('이 소');
    expect(josaAfter('세종', '이달에')).toBe('이달에');
    expect(josaAfter('', '이 소')).toBe('이 소');
  });
  it('cellsText rounds to half cells without flipping a comparison', () => {
    expect(cellsText(9.21)).toBe('약 9칸');
    expect(cellsText(5.46)).toBe('약 5.5칸');
    expect(cellsText(8.18, 8)).toBe('약 8.5칸');
    expect(cellsText(7.9, 8)).toBe('약 7.5칸');
    expect(cellsText(7.17, 6)).toBe('약 7칸');
  });
});
