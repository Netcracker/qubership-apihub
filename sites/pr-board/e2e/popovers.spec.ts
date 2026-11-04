import type { Locator, Page } from '@playwright/test';
import { ALL, expect, openBoard, rows, test } from './helpers.ts';

// Opens the corner cases narrowed to the PR whose title holds the given words.
async function onlyCase(page: Page, title: string) {
  await openBoard(page, { report: 'corner', query: ALL + '&q=' + encodeURIComponent(title) });
  await expect(rows(page)).toHaveCount(1);
  return rows(page).first();
}

async function expectInsideWindow(page: Page, popover: Locator) {
  const box = (await popover.boundingBox())!;
  const view = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(view.width);
  expect(box.y + box.height).toBeLessThanOrEqual(view.height);
}

test.describe('popovers', () => {
  test('PANEL-1 PANEL-2: attention opens on click and closes on a second click, Escape, or a click outside', async ({ page }) => {
    const row = await onlyCase(page, 'WIP export');
    const icon = row.locator('.attn-icon');
    await expect(icon.locator('.attn-count')).toHaveText('3');
    const popover = page.getByRole('dialog', { name: /needs attention/ });
    await icon.click();
    await expect(popover.locator('li')).toHaveCount(3);
    await expect(popover.locator('.popover-title')).toHaveText('3 problems');
    await icon.click();
    await expect(popover).toHaveCount(0);
    await icon.click();
    await page.keyboard.press('Escape');
    await expect(popover).toHaveCount(0);
    await icon.click();
    await page.locator('h1').click();
    await expect(popover).toHaveCount(0);
  });

  test('PANEL-1: page scroll and window resize close a popover, and it stays inside the window', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    const popover = page.getByRole('dialog', { name: /needs attention/ });
    const icons = page.locator('.attn-icon');
    await icons.first().click();
    await expectInsideWindow(page, popover);
    await page.locator('.table-wrap').evaluate((el) => el.dispatchEvent(new Event('scroll')));
    await expect(popover).toHaveCount(0);
    // The lowest visible icon opens upward, still inside the window.
    const lowest = await icons.evaluateAll((els) => {
      const visibleBottom = document.querySelector('.table-wrap')!.getBoundingClientRect().bottom;
      return els.filter((e) => e.getBoundingClientRect().bottom < visibleBottom).length - 1;
    });
    await icons.nth(lowest).click();
    await expectInsideWindow(page, popover);
    await page.setViewportSize({ width: 1700, height: 880 });
    await expect(popover).toHaveCount(0);
  });

  test('PANEL-3 PANEL-4 TABLE-14: failed checks group repeats, name the failure kind, and list the summary job last', async ({ page }) => {
    const row = await onlyCase(page, 'new package overview layout');
    const button = row.locator('.ci-wrap > button');
    await expect(button).toHaveText('F8');
    await button.click();
    const popover = page.getByRole('dialog', { name: /failed checks on PR/ });
    await expect(popover.locator('.popover-title')).toHaveText('8 failed checks of 72');
    const items = popover.locator('.check-list > li');
    await expect(items).toHaveCount(8);
    await expect(items.filter({ hasText: 'screenshot-tests (apispec-view)' }).locator('.check-count')).toHaveText('×2');
    await expect(items.filter({ hasText: 'deploy-preview' })).toContainText('Did not start');
    await expect(items.filter({ hasText: 'CLAAssistant' })).toContainText('Action required');
    await expect(items.last()).toContainText('ci-ok');
    await expect(items.last()).toContainText('summary job');
    await expect(popover).not.toContainText('unit (api-diff)');
    await expect(popover.getByRole('link', { name: 'All checks on GitHub' })).toHaveAttribute('href', /\/checks$/);
  });

  test('PANEL-5: the checks popover says when details are missing or only partly read', async ({ page }) => {
    for (const [title, text] of [
      ['handle empty namespace list', 'Check details were not collected for this PR.'],
      ['split the e2e matrix by module', 'no failed check is among the first 100 checks read.'],
    ]) {
      const row = await onlyCase(page, title);
      await row.locator('.ci-wrap > button').click();
      await expect(page.getByRole('dialog', { name: /on PR/ })).toContainText(text);
    }
    // That note already says only the first 100 were read, so the one for a partly read list does not repeat it.
    await expect(page.getByRole('dialog', { name: /on PR/ })).not.toContainText('Only the first 100');
  });

  test('PANEL-6 TABLE-13: review shows approvers, pending reviewers, and the counts on the code', async ({ page }) => {
    const row = await onlyCase(page, 'remember the last opened package tab');
    await expect(row.locator('.review-wrap > button')).toHaveText('✓2');
    await expect(row.locator('.pending')).toHaveText('◷1');
    await row.locator('.review-wrap > button').click();
    const popover = page.getByRole('dialog', { name: /Reviewers of PR/ });
    await expect(popover.locator('section').filter({ hasText: 'Approved by' }).locator('li')).toHaveCount(2);
    await expect(popover.locator('section').filter({ hasText: 'Waiting for review from' }).locator('li')).toHaveCount(1);
    await expect(popover.getByRole('link', { name: 'Open the PR on GitHub' })).toBeVisible();
  });

  test('PANEL-6: teams show as @team, dismissed reviews get their section, and no reviews says so', async ({ page }) => {
    let row = await onlyCase(page, 'split the version service');
    await expect(row.locator('.pending')).toHaveText('◷5');
    await row.locator('.review-wrap > button').click();
    await expect(page.getByRole('dialog', { name: /Reviewers of PR/ }).locator('li', { hasText: '@widgets-maintainers' }))
      .toContainText('team');
    row = await onlyCase(page, 'fix(ui): keep filters when switching package versions');
    await row.locator('.review-wrap > button').click();
    await expect(page.getByRole('dialog', { name: /Reviewers of PR/ })).toContainText('Dismissed reviews');
    row = await onlyCase(page, 'describe the export endpoint');
    await row.locator('.review-wrap > button').click();
    await expect(page.getByRole('dialog', { name: /Reviewers of PR/ }))
      .toContainText('No reviews yet, and nobody is requested as a reviewer.');
  });

  test('PANEL-7: Rules lists the rules in use, with the defaults when they are custom', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    await page.getByRole('button', { name: 'Rules', exact: true }).click();
    const popover = page.getByRole('dialog', { name: 'Board rules' });
    await expect(popover).toContainText('The PR is open for more than 10 days.');
    await expect(popover).not.toContainText('team defaults');
    await page.addInitScript(() => localStorage.setItem('apihub-pr-board.settings', JSON.stringify({ rules: { staleDays: 3, checkTitle: false } })));
    await page.reload();
    await page.getByRole('button', { name: 'Rules', exact: true }).click();
    await expect(popover).toContainText('The PR is open for more than 3 days.');
    await expect(popover).not.toContainText('Conventional Commits');
    await expect(popover).toContainText('The team defaults are 10 days');
  });

  test('PANEL-8: the data source shows where the data comes from and its exact time', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    await page.locator('.source-button').click();
    const popover = page.getByRole('dialog', { name: 'Data source' });
    await expect(popover.locator('.popover-title')).toHaveText('Snapshot');
    await expect(popover).toContainText('Published with the page just now, at ');
    await expect(popover).toContainText('Refresh loads live data from GitHub.');
  });
});
