import { describe, expect, it } from 'vitest';
import manifest from '../../public/manifest.webmanifest?raw';
import tpl from '../../scripts/sw-template.js?raw';

const icons = import.meta.glob('../../public/icons/*.png', { eager: false });

describe('shell pwa assets', () => {
  const m = JSON.parse(manifest);
  it('manifest is portrait standalone with relative scope', () => {
    expect(m.display).toBe('standalone');
    expect(m.orientation).toBe('portrait');
    expect(m.start_url).toBe('./');
    expect(m.scope).toBe('./');
    expect(m.short_name).toBe('결록');
  });
  it('icons exist and are relative', () => {
    for (const i of m.icons) {
      expect(i.src.startsWith('/')).toBe(false);
      expect(Object.keys(icons).some((k) => k.endsWith(`/public/${i.src}`))).toBe(true);
    }
    expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
  });
  it('sw template has placeholders and skips test=1', () => {
    const t = tpl;
    for (const k of ['__VERSION__', '__CORE__', '__LAZY__']) expect(t).toContain(k);
    expect(t).toContain("'test') === '1'");
  });
});
