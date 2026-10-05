/*
 * Ambient globals injected by jest-environment-puppeteer.
 *
 * These used to come from @types/jest-environment-puppeteer@5.0.6, which was removed:
 * it describes the puppeteer v5 API while this project runs puppeteer 24 (which ships
 * its own types), and it depends on `jest-environment-node: >=24 <=27`, which pinned
 * that package to 27.5.1 for every component sharing a dependency tree.
 *
 * jest-environment-puppeteer@11 does not declare these globals itself, so they are
 * declared here against the puppeteer actually in use.
 */
import type { Browser, BrowserContext, Page } from 'puppeteer'

declare global {
  const browser: Browser
  const context: BrowserContext
  const page: Page

  const jestPuppeteer: {
    /** Reset global.page */
    resetPage(): Promise<void>
    /** Reset global.browser */
    resetBrowser(): Promise<void>
    /** Suspend test execution and open the browser for inspection. */
    debug(): Promise<void>
  }
}
