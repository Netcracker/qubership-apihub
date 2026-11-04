import { defineConfig } from '@playwright/test';
import { E2E_PORT, MOCK_NOW } from './e2e/helpers.ts';

// Browser tests run against the Vite dev server with the mocks, on their own port and a pinned clock. The server
// keeps the chosen scenario globally, so tests run one at a time.
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:' + E2E_PORT,
    // A common wide screen, wide enough that every column is in view: a click on a hidden cell scrolls the table, and
    // scrolling closes popovers by design (PANEL-1).
    viewport: { width: 1920, height: 900 },
    // Times on the page follow the browser's zone and locale; pinning them keeps text and screenshots the same anywhere.
    timezoneId: 'UTC',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  // Screenshots freeze animations and hide the caret, so the same state gives the same pixels. Fonts ship with the
  // page and the clock is pinned, so the per-pixel threshold can be strict enough to catch a changed text color.
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', threshold: 0.05 } },
  // Baselines live in e2e/__screenshots__ with separate files for Windows and the pinned Linux container.
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{platform}{ext}',
  projects: [
    { name: 'e2e', use: { browserName: 'chromium' }, testIgnore: /screenshots\.spec\.ts$/ },
    { name: 'screenshots', use: { browserName: 'chromium' }, testMatch: /screenshots\.spec\.ts$/ },
  ],
  webServer: {
    command: 'pnpm exec vite --port ' + E2E_PORT + ' --strictPort',
    url: 'http://localhost:' + E2E_PORT,
    env: { PR_BOARD_MOCK_NOW: MOCK_NOW },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
