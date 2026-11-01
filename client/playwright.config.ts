import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: './e2e/lab-04',
  workers: 1,
  reporter: 'line',
  outputDir: join(tmpdir(), 'toktickit-lab4-playwright-results', process.env.E2E_RUN_ID || 'manual'),
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    launchOptions: process.env.CHROME_EXECUTABLE_PATH ? { executablePath: process.env.CHROME_EXECUTABLE_PATH } : {},
  },
});
