/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Fixtures } from '@fixtures'
import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'
import process from 'node:process'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<Fixtures>({
  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'temp/test-results',
  /* Timeout for the whole test run */
  globalTimeout: 60_000 * 50,
  /* Maximum time one test can run for. */
  timeout: 70_000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 20_000,
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 2,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 10 : 3,
  /* Limit the number of failures on CI to save resources */
  maxFailures: process.env.CI ? 15 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', {
      open: 'never',
      outputFolder: 'reports/playwright',
    }],
    ['list'],
    ['./src/services/custom-reporter/CustomReporter.ts', { reportType: 'apihub-styled-html' }],
  ],
  globalSetup: require.resolve('./src/tests/global-setup'),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 20_000,
    /* Base URL to use in actions like `await page.goto('/')`. */
    /* baseURL: '', */
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    /* Whether to ignore HTTPS errors when sending network requests. For Firefox in this case */
    ignoreHTTPSErrors: true,
    permissions: ['clipboard-read'],
  },
  projects: [
    {
      name: 'Portal',
      testDir: './src/tests/portal',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        launchOptions: {
          // slowMo: 150,
        },
        viewport: { width: 1320, height: 768 },
      },
      dependencies: ['Portal-Setup'],
    },
    {
      name: 'Portal-Setup',
      testDir: './src/tests/portal',
      testMatch: /setup\.ts/,
      timeout: 1200_000,
      teardown: 'Portal-Teardown',
    },
    {
      name: 'Portal-Teardown',
      testDir: './src/tests/portal',
      testMatch: /teardown\.ts/,
      timeout: 360_000,
    },
    {
      name: 'Utils',
      testDir: './src/tests/utils',
      testMatch: [/tools\.ts/, /cleanup\.ts/, /debug\.spec\.ts/],
    },
    {
      name: 'Cleanup',
      testDir: './src/tests/utils',
      testMatch: ['2-cleanup.ts'],
      timeout: 620_000,
      grep: /@cleanup/,
    },
    {
      name: 'ADV-operations',
      testDir: './src/tests/adv',
      testMatch: /.*operations.*\.ts/,
      timeout: 130_000,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        actionTimeout: 120_000,
        trace: 'off',
        screenshot: 'off',
      },
    },
    {
      name: 'ADV-comparisons',
      testDir: './src/tests/adv',
      testMatch: /.*comparisons.*\.ts/,
      timeout: 190_000,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        actionTimeout: 180_000,
        trace: 'off',
        screenshot: 'off',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   port: 3000,
  // },
})
