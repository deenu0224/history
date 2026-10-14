import { describe, expect, it, vi } from 'vitest';
import { isStandalone, isTouchLandscape, tryLockPortrait, LANDSCAPE_TOUCH_QUERY } from '@/shell/orientation';
import { shouldRegisterSw } from '@/shell/registerSw';

describe('shell orientation', () => {
  it('touch landscape only', () => {
    expect(isTouchLandscape((q) => ({ matches: q === LANDSCAPE_TOUCH_QUERY }))).toBe(true);
    expect(isTouchLandscape(() => ({ matches: false }))).toBe(false);
    expect(isTouchLandscape(() => { throw new Error('x'); })).toBe(false);
  });
  it('standalone via media or navigator.standalone', () => {
    expect(isStandalone(() => ({ matches: true }))).toBe(true);
    expect(isStandalone(() => ({ matches: false }), true)).toBe(true);
    expect(isStandalone(() => ({ matches: false }))).toBe(false);
  });
  it('lock only when standalone, failures ignored', async () => {
    const lock = vi.fn().mockResolvedValue(undefined);
    expect(await tryLockPortrait({ lock }, false)).toBe(false);
    expect(lock).not.toHaveBeenCalled();
    expect(await tryLockPortrait({ lock }, true)).toBe(true);
    expect(await tryLockPortrait({ lock: () => Promise.reject(new Error('no')) }, true)).toBe(false);
    expect(await tryLockPortrait(undefined, true)).toBe(false);
  });
  it('sw registration gate', () => {
    expect(shouldRegisterSw({ prod: true, search: '', hasSw: true })).toBe(true);
    expect(shouldRegisterSw({ prod: false, search: '', hasSw: true })).toBe(false);
    expect(shouldRegisterSw({ prod: true, search: '?test=1', hasSw: true })).toBe(false);
    expect(shouldRegisterSw({ prod: true, search: '?x=1', hasSw: false })).toBe(false);
  });
});
