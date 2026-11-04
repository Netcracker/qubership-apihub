import type { Page } from '@playwright/test';
import { ALL, expect, openBoard, query, rows, test } from './helpers.ts';

async function search(page: Page, text: string, report = 'typical') {
  await openBoard(page, { report, query: ALL + '&q=' + encodeURIComponent(text) });
}

// Every visible row matches, and the search narrowed the board without emptying it.
async function expectAll(page: Page, check: (row: Element) => boolean) {
  const results = await rows(page).evaluateAll((trs, source) => {
    const fn = new Function('return ' + source)() as (row: Element) => boolean;
    return trs.map((tr) => fn(tr));
  }, check.toString());
  expect(results.length).toBeGreaterThan(0);
  expect(results.every(Boolean)).toBe(true);
  return results.length;
}

test.describe('search', () => {
  test('FILTER-8: words match the row, without regard to case, and every word must match', async ({ page }) => {
    await search(page, 'BREADCRUMBS show');
    await expectAll(page, (tr) => /breadcrumbs/i.test(tr.textContent!) && /show/i.test(tr.textContent!));
  });

  test('FILTER-8: an issue number finds its PR, with or without #', async ({ page }) => {
    for (const text of ['#400', '400']) {
      await search(page, text);
      await expectAll(page, (tr) => tr.querySelector('.issue-number')?.textContent === '#400');
    }
  });

  test('FILTER-8: a leading minus excludes, and quotes keep spaces', async ({ page }) => {
    await search(page, '-is:draft "good first issue"');
    await expectAll(page, (tr) => !tr.querySelector('.chip.draft')
      && [...tr.querySelectorAll('td.c-title .label-chip')].some((c) => c.textContent === 'good first issue'));
  });

  const QUALIFIERS: [string, (row: Element) => boolean][] = [
    ['author:anna-dev', (tr) => tr.querySelector('td:nth-child(4) .login')?.textContent === 'anna-dev'],
    ['assignee:none', (tr) => tr.querySelector('td:nth-child(9)')!.textContent === 'Unassigned'],
    ['label:bug', (tr) => [...tr.querySelectorAll('td.c-title .label-chip')].some((c) => c.textContent === 'bug')],
    ['label:none', (tr) => tr.querySelectorAll('td.c-title .label-chip').length === 0],
    ['base:develop', (tr) => tr.querySelector('.chip.branch')?.textContent === '→ develop'],
    ['ci:failing', (tr) => tr.classList.contains('ci-failing')],
    ['ci:none', (tr) => tr.classList.contains('ci-none')],
    ['review:approved', (tr) => tr.querySelector('.review-wrap > button')!.textContent!.startsWith('✓')],
    ['review:changes', (tr) => tr.querySelector('.review-wrap > button')!.textContent!.startsWith('CR')],
    ['is:draft', (tr) => !!tr.querySelector('.chip.draft')],
    ['is:ready', (tr) => !tr.querySelector('.chip.draft')],
    ['is:bot', (tr) => !!tr.querySelector('.chip.bot')],
    ['is:conflict', (tr) => tr.querySelector('td:nth-child(7)')!.textContent === 'C'],
    ['is:stale', (tr) => !!tr.querySelector('.age.over')],
    ['is:attention', (tr) => !!tr.querySelector('.attn-icon')],
    ['no:issue', (tr) => !tr.querySelector('.issue-ref')],
    ['no:label', (tr) => tr.querySelectorAll('td.c-title .label-chip').length === 0],
    ['no:assignee', (tr) => tr.querySelector('td:nth-child(9)')!.textContent === 'Unassigned'],
  ];
  for (const [text, check] of QUALIFIERS) {
    test(`FILTER-9: ${text} keeps only matching PRs`, async ({ page }) => {
      await search(page, text);
      const count = await expectAll(page, check);
      expect(count).toBeLessThan(36);
    });
  }

  test('FILTER-9: reviewer: and area: narrow the list', async ({ page }) => {
    for (const text of ['reviewer:chen-li', 'area:be', 'area:fe', 'area:other']) {
      await search(page, text);
      const count = await rows(page).locator('td.c-num').count();
      expect(count, text).toBeGreaterThan(0);
      expect(count, text).toBeLessThan(36);
    }
  });

  test('FILTER-10: a qualifier being typed filters nothing, and an unknown one is a plain word', async ({ page }) => {
    await search(page, 'label:');
    await expect(rows(page)).toHaveCount(36);
    await search(page, 'colour:blue');
    await expect(page.getByText('No pull requests match this view')).toBeVisible();
  });

  test('FILTER-11: a label chip toggles its filter whatever the case, and highlights while active', async ({ page }) => {
    await search(page, 'label:BUG -is:draft');
    const chip = rows(page).first().locator('.label-chip', { hasText: 'bug' });
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await chip.click();
    expect(query(page).q).toBe('-is:draft');
    await rows(page).locator('.label-chip', { hasText: 'bug' }).first().click();
    expect(query(page).q).toBe('-is:draft label:bug');
  });

  test('FILTER-11: a label with spaces is added quoted', async ({ page }) => {
    await search(page, '');
    await rows(page).locator('.label-chip', { hasText: 'good first issue' }).first().click();
    expect(query(page).q).toBe('label:"good first issue"');
  });

  test('FILTER-12: the ? button lists the syntax, and an example fills the search', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    await page.getByRole('button', { name: 'Search syntax' }).click();
    const help = page.getByRole('dialog', { name: 'Search syntax' });
    await expect(help).toContainText('reviewer:');
    await help.getByRole('button', { name: 'area:fe ci:failing' }).click();
    await expect(page.locator('#pr-search')).toHaveValue('area:fe ci:failing');
    await expect(help).toHaveCount(0);
  });

  test('FILTER-13: the whole view survives a reload, and unknown values fall back', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: 'q=fix&authors=all&draft=drafts&area=fe&quick=ci&sort=title&dir=asc' });
    await page.reload();
    await expect(page.locator('#pr-search')).toHaveValue('fix');
    expect(query(page)).toMatchObject({ q: 'fix', authors: 'all', area: 'fe', quick: 'ci', sort: 'title', dir: 'asc' });
    expect(query(page).draft).toBeUndefined();
    await openBoard(page, { report: 'typical', query: 'draft=weird&area=moon&sort=nope&dir=up&quick=nothing' });
    expect(page.url()).not.toContain('?');
  });
});
