import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

/** 빌드 산출물 목록으로 서비스 워커(dist/sw.js)를 만든다. 경로는 전부 상대. */
function swPlugin(): Plugin {
  let outDir = 'dist';
  let root = process.cwd();
  return {
    name: 'gyeollok-sw',
    apply: 'build',
    configResolved(c) {
      outDir = join(c.root, c.build.outDir);
      root = c.root;
    },
    closeBundle() {
      const files = walk(outDir)
        .map((f) => relative(outDir, f).split('\\').join('/'))
        .filter((f) => f !== 'sw.js' && !f.endsWith('.map'));
      const core: string[] = [];
      const lazy: string[] = [];
      const hash = createHash('sha1');
      for (const f of files.sort()) {
        hash.update(f).update(readFileSync(join(outDir, f)));
        // 지연 로딩 뷰어(Phaser) 청크는 설치를 막지 않는다.
        if (/^assets\/createViewer-.*\.js$/.test(f)) lazy.push(f);
        else core.push(f);
      }
      const tpl = readFileSync(join(root, 'scripts/sw-template.js'), 'utf8');
      const sw = tpl
        .replace('__VERSION__', hash.digest('hex').slice(0, 10))
        .replace('__CORE__', JSON.stringify(core))
        .replace('__LAZY__', JSON.stringify(lazy));
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), swPlugin()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1700,
    rollupOptions: {
      output: {
        manualChunks: (id) =>
          /node_modules\/(react|react-dom|scheduler)\//.test(id) ? 'react' : undefined,
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['fake-indexeddb/auto'],
  },
});
