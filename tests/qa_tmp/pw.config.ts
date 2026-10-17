import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '/home/user/history/tests/qa_tmp', timeout: 900_000, workers: 1, reporter: [['list']], use: { baseURL: 'http://localhost:4173', actionTimeout: 15_000, browserName: 'chromium' } });
