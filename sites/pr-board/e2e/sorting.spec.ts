import type { Page } from '@playwright/test';
import { ALL, expect, numbers, openBoard, query, rows, test } from './helpers.ts';

function header(page: Page, label: string) {
  return page.locator('.board > thead > tr > th').filter({ hasText: label }).getByRole('button');
}

async function columnTexts(page: Page, selector: string): Promise<string[]> {
  return (await rows(page).locator(selector).allTextContents()).map((t) => t.trim());
}

// The rank of each row's state, read from what the row shows.
const CI_RANK: Record<string, number> = { 'ci-failing': 0, 'ci-running': 1, 'ci-none': 2, 'ci-passing': 3 };
const REVIEW_RANK: Record<string, number> = { CR: 0, '—': 1, '✓': 2 };
const MERGE_RANK: Record<string, number> = { C: 0, '?': 1, OK: 2 };

async function ciRanks(page: Page) {
  const classes = await rows(page).evaluateAll((trs) => trs.map((tr) => tr.className.split(' ')[0]));
  return classes.map((c) => CI_RANK[c]);
}

async function attentionCounts(page: Page) {
  return rows(page).evaluateAll((trs) => trs.map((tr) => {
    const icon = tr.querySelector('.attn-icon');
    return icon ? Number(icon.querySelector('.attn-count')?.textContent || 1) : 0;
  }));
}

const ascending = (list: number[]) => list.every((v, i) => i === 0 || list[i - 1] <= v);
const descending = (list: number[]) => list.every((v, i) => i === 0 || list[i - 1] >= v);

test.describe('sorting', () => {
  test('TABLE-18: the default sort puts the most attention reasons first, newest PR first on ties', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    const counts = await attentionCounts(page);
    const nums = await numbers(page);
    expect(descending(counts)).toBe(true);
    expect(counts.every((c, i) => i === 0 || c !== counts[i - 1] || nums[i - 1] > nums[i])).toBe(true);
  });

  test('TABLE-16 FILTER-13: a header click sorts, a second click reverses, and the URL keeps it', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    await header(page, '#').click();
    expect(query(page)).toMatchObject({ sort: 'number', dir: 'desc' });
    expect(descending(await numbers(page))).toBe(true);
    await header(page, '#').click();
    expect(query(page)).toMatchObject({ sort: 'number', dir: 'asc' });
    expect(ascending(await numbers(page))).toBe(true);
    await page.reload();
    expect(ascending(await numbers(page))).toBe(true);
    await expect(page.locator('.board > thead > tr > th[aria-sort="ascending"]')).toContainText('#');
  });

  test('TABLE-16: title and author sort A to Z first', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    await header(page, 'Pull request').click();
    const titles = (await columnTexts(page, '.pr-title > a')).map((t) => t.toLowerCase());
    expect(titles).toEqual([...titles].sort());
    await header(page, 'Author').click();
    const authors = (await columnTexts(page, 'td.c-person:nth-child(4) .login')).map((t) => t.toLowerCase());
    expect(authors).toEqual([...authors].sort());
  });

  test('TABLE-16: Assignee and Last comment are not sortable', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    await expect(header(page, 'Assignee')).toHaveCount(0);
    await expect(header(page, 'Last comment')).toHaveCount(0);
  });

  test('TABLE-17: CI, Review, and Conflicts sort by their state order', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    await header(page, 'CI').click();
    await header(page, 'CI').click();
    expect(ascending(await ciRanks(page))).toBe(true);
    await header(page, 'Review').click();
    await header(page, 'Review').click();
    const reviews = (await columnTexts(page, '.review-wrap > button')).map((t) => REVIEW_RANK[t.replace(/\d+$/, '')]);
    expect(ascending(reviews)).toBe(true);
    await header(page, 'Conflicts').click();
    await header(page, 'Conflicts').click();
    const merges = (await columnTexts(page, 'td:nth-child(7) .pill')).map((t) => MERGE_RANK[t]);
    expect(ascending(merges)).toBe(true);
  });

  test('TABLE-17: Age sorts by opening time, the oldest PR first', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    await header(page, 'Age · activity').click();
    const days = (await columnTexts(page, '.age')).map((t) => (t === 'today' ? 0 : Number(t.split(' ')[0])));
    expect(descending(days)).toBe(true);
  });
});
