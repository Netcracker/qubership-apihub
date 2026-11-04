// Screenshots of the visual states, compared with separate Windows and Linux baselines.
// Run them with `pnpm run test:screenshots`; after an intended change, `pnpm run test:screenshots:update` and review
// the new images before committing them. CI checks Linux baselines in the pinned Playwright container.

import type { Locator, Page } from '@playwright/test';
import { ALL, expect, firstVisit, openBoard, rows, test } from './helpers.ts';

const SETTINGS_KEY = 'apihub-pr-board.settings';

// Saved settings the page reads on load; fields left out keep their defaults.
async function withSettings(page: Page, settings: Record<string, unknown>) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SETTINGS_KEY, JSON.stringify(settings)]);
}

// Opens the corner cases narrowed to the PR whose title holds the given words.
async function onlyCase(page: Page, title: string): Promise<Locator> {
  await openBoard(page, { report: 'corner', query: ALL + '&q=' + encodeURIComponent(title) });
  await expect(rows(page)).toHaveCount(1);
  return rows(page).first();
}

// The fonts must be in before a picture is taken, or the text shifts between runs.
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

test.describe('screenshots', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`TABLE-4 TABLE-23: table borders in a short list (${theme})`, async ({ page }) => {
      await withSettings(page, { theme });
      await onlyCase(page, 'experimental GraphQL schema diff');
      await settle(page);
      await expect(page).toHaveScreenshot(`board-short-${theme}.png`);
    });

    for (const density of ['comfortable', 'compact'] as const) {
      test(`QUAL-6 SET-15: the board in the ${theme} theme, ${density} rows`, async ({ page }) => {
        await withSettings(page, { theme, density });
        await openBoard(page, { report: 'typical', query: ALL });
        await settle(page);
        await expect(page).toHaveScreenshot(`board-${theme}-${density}.png`);
      });
    }
  }

  test('TABLE-30 DATA-26: the Review column as a list of reviewers, with the viewer at the top right', async ({ page }) => {
    await withSettings(page, { reviewColumn: 'list' });
    await page.addInitScript(() => localStorage.setItem('apihub-pr-board.token', 'mock-token'));
    await openBoard(page, { report: 'corner', refresh: 'ok', query: ALL });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.viewer-badge')).toBeVisible();
    // The load summary leaves the corner after a few seconds (DATA-27).
    await expect(page.locator('.load-status')).toHaveCount(0, { timeout: 8000 });
    // The PRs that wait for the viewer: one asked again, one with a crowd of reviewers, and a single request.
    await page.getByRole('searchbox').fill('review:requested');
    await page.getByRole('searchbox').blur();
    // The badge appears where Refresh was, under the pointer.
    await page.mouse.move(0, 0);
    await settle(page);
    await expect(page).toHaveScreenshot('board-reviewers-list.png');
  });

  test('SET-21: the first-visit card that offers the wizard, over the board', async ({ page }) => {
    await firstVisit(page);
    await openBoard(page, { report: 'typical', query: ALL });
    await expect(page.getByRole('complementary', { name: 'New here?' })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('state-first-visit.png');
  });

  test('SET-21 SET-23 SET-25: the setup wizard with a picture for every theme, the Reviewers order step, and the Labels step', async ({ page }) => {
    await firstVisit(page);
    await openBoard(page, { report: 'typical', query: ALL });
    await page.getByRole('button', { name: 'Take the tour' }).click();
    await expect(page.getByRole('dialog', { name: 'Set up your board' })).toBeVisible();
    await settle(page);
    await expect(page.getByRole('dialog', { name: 'Set up your board' })).toHaveScreenshot('wizard-theme.png');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('dialog', { name: 'Set up your board' })).toHaveScreenshot('wizard-reviewers-order.png');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('dialog', { name: 'Set up your board' })).toHaveScreenshot('wizard-labels.png');
  });

  test('TABLE-26 TABLE-27: two repositories add the Repository column', async ({ page }) => {
    await openBoard(page, { report: 'two-repos', query: ALL + '&sort=repo&dir=asc' });
    await settle(page);
    await expect(page).toHaveScreenshot('board-two-repos.png');
  });

  test('PANEL-3: the failed checks popover', async ({ page }) => {
    const row = await onlyCase(page, 'new package overview layout');
    await row.locator('.ci-wrap > button').click();
    await settle(page);
    await expect(page.getByRole('dialog', { name: /failed checks on PR/ })).toHaveScreenshot('popover-checks.png');
  });

  test('PANEL-6: the reviewers popover', async ({ page }) => {
    const row = await onlyCase(page, 'remember the last opened package tab');
    await row.locator('.review-wrap > button').click();
    await settle(page);
    await expect(page.getByRole('dialog', { name: /Reviewers of PR/ })).toHaveScreenshot('popover-reviewers.png');
  });

  test('PANEL-2: the attention popover', async ({ page }) => {
    const row = await onlyCase(page, 'experimental GraphQL schema diff');
    await row.locator('.attn-icon').click();
    await settle(page);
    await expect(page.getByRole('dialog', { name: /needs attention/ })).toHaveScreenshot('popover-attention.png');
  });

  test('PANEL-7 PANEL-8 FILTER-12: the rules, data source, and search syntax popovers', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    await settle(page);
    await page.getByRole('button', { name: 'Rules', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Board rules' })).toHaveScreenshot('popover-rules.png');
    await page.locator('.source-button').click();
    await expect(page.getByRole('dialog', { name: 'Data source' })).toHaveScreenshot('popover-source.png');
    await page.getByRole('button', { name: 'Search syntax' }).click();
    await expect(page.getByRole('dialog', { name: 'Search syntax' })).toHaveScreenshot('popover-search.png');
  });

  test('FILTER-3: the authors menu', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    await settle(page);
    await page.getByRole('button', { name: /^Authors:/ }).click();
    await expect(page.getByRole('group', { name: 'Authors' })).toHaveScreenshot('menu-authors.png');
  });

  test('NOTE-1 NOTE-9: the notes panel with what was asked at the standup', async ({ page }) => {
    const note = '## Standup\n\n- **Asked:** split the parser change from the UI change\n- **Promised:** a new PR by Friday\n\n'
      + '- [x] Rebased on main\n- [ ] Tests for the empty rule';
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value),
      ['apihub-pr-board.notes', JSON.stringify({ 'acme/widgets#206': { text: note, updatedAt: '2026-10-28T09:00:00Z' } })]);
    await openBoard(page, { report: 'typical', query: ALL });
    await page.getByRole('button', { name: 'Notes for PR #206' }).click();
    await expect(page.getByRole('dialog', { name: 'Notes for PR #206' }).getByRole('heading', { name: 'Standup' })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('panel-notes.png');
  });

  test('PANEL-9 PANEL-10: the comments panel', async ({ page }) => {
    const row = await onlyCase(page, 'import packages from an OpenAPI registry');
    await row.locator('.comment-preview').click();
    const panel = page.getByRole('dialog', { name: /^Comments on PR/ });
    await expect(panel.locator('article')).toHaveCount(15);
    await settle(page);
    await expect(page).toHaveScreenshot('panel-comments.png');
  });

  test('SET-1: the settings panel', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    await settle(page);
    await page.getByRole('button', { name: /^Settings/ }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveScreenshot('panel-settings.png');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`TABLE-31 FILTER-17: repository names tinted by group, with the Repositories menu open, ${theme} theme`, async ({ page }) => {
      await withSettings(page, { theme });
      await openBoard(page, { report: 'two-repos', query: ALL + '&sort=repo&dir=asc&repogroups=Gadgets:acme/gadgets;Widgets:acme/widgets' });
      await page.getByRole('button', { name: /^Repositories:/ }).click();
      await settle(page);
      await expect(page).toHaveScreenshot(`board-groups-${theme}.png`);
    });
  }

  test('TABLE-20: no PR matches the view', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: 'q=nothing-matches-this' });
    await settle(page);
    await expect(page).toHaveScreenshot('state-empty.png');
  });

  test('DATA-16 DATA-23: no snapshot and no repositories, as the published page opens without a link', async ({ page }) => {
    await openBoard(page, { report: 'missing' });
    await settle(page);
    await expect(page).toHaveScreenshot('state-no-repos.png');
  });

  test('DATA-16: prs.json is broken', async ({ page }) => {
    await openBoard(page, { report: 'broken' });
    await settle(page);
    await expect(page).toHaveScreenshot('state-broken.png');
  });

  test('TABLE-21: a narrow window scrolls the whole page', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await openBoard(page, { report: 'typical', query: ALL });
    await settle(page);
    await expect(page).toHaveScreenshot('board-narrow.png');
  });

  test('TABLE-22 SET-8: hidden columns leave the table filling the window', async ({ page }) => {
    await withSettings(page, { hiddenColumns: ['ci', 'review', 'merge', 'assignee', 'comment'] });
    await openBoard(page, { report: 'typical', query: ALL });
    await settle(page);
    await expect(page).toHaveScreenshot('board-hidden-columns.png');
  });
});
