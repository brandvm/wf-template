import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 3,
  use: { browserName: 'chromium', channel: 'chromium', headless: true },
});
