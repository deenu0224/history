import { defineConfig, devices } from '@playwright/test';

const base = process.env.E2E_BASE ?? 'http://localhost:4173';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 240_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: base,
    actionTimeout: 15_000,
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_BASE
    ? undefined
    : { command: 'npx vite build && npx vite preview --port 4173', port: 4173, reuseExistingServer: true, timeout: 180_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    // 세로 휴대폰(390×844, 터치). 가로 회전 안내는 같은 컨텍스트에서 뷰포트를 돌려 확인한다.
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } },
  ],
});
