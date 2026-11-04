// Measures the production board with many PRs (QUAL-8): the load until every row shows, and the latency of a keystroke
// in the search, a sort click, and a Drafts click, as the longest event duration (what INP reports). Prints medians.
// Serve a build with a snapshot first; docs/performance.md says how.
// Usage: node scripts/measure.ts [runs] [url]

import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';

const runs = Number(process.argv[2] || 8);
const url = process.argv[3] || 'http://localhost:4175/?authors=all&draft=all';
const SETTLE_MS = 400;

const median = (list: number[]) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];

// The longest event the browser reports while the action runs and settles.
async function longestEvent(page: Page, action: () => Promise<unknown>): Promise<number> {
  await page.evaluate(() => {
    const w = window as unknown as { __longest: number; __observer: PerformanceObserver };
    w.__longest = 0;
    w.__observer = new PerformanceObserver((list) => { for (const e of list.getEntries()) w.__longest = Math.max(w.__longest, e.duration); });
    w.__observer.observe({ type: 'event', durationThreshold: 16 } as PerformanceObserverInit);
  });
  await action();
  await page.waitForTimeout(SETTLE_MS);
  return page.evaluate(() => {
    const w = window as unknown as { __longest: number; __observer: PerformanceObserver };
    w.__observer.disconnect();
    return w.__longest;
  });
}

const results: Record<string, number[]> = { load: [], search: [], sort: [], drafts: [] };
const browser = await chromium.launch();
for (let i = 0; i < runs; i++) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.addInitScript(() => localStorage.setItem('apihub-pr-board.wizard', 'done'));
  const page = await context.newPage();
  const start = Date.now();
  await page.goto(url);
  const rows = page.locator('.board > tbody > tr');
  await rows.first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.board > tbody > tr').length >= 100);
  results.load.push(Date.now() - start);
  results.search.push(await longestEvent(page, () => page.locator('#pr-search').pressSequentially('fix', { delay: 50 })));
  await page.locator('#pr-search').fill('');
  results.sort.push(await longestEvent(page, () => page.locator('.board > thead th').filter({ hasText: /^Pull request/ }).getByRole('button').click()));
  results.drafts.push(await longestEvent(page, () => page.getByRole('group', { name: 'Draft status' }).getByRole('button', { name: 'Drafts' }).click()));
  await context.close();
}
await browser.close();
for (const [name, list] of Object.entries(results)) {
  console.log(name.padEnd(7), 'median', Math.round(median(list)), 'ms   runs', list.map(Math.round).join(' '));
}
