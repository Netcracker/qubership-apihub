import type { Page } from '@playwright/test';
import { ALL, expect, openBoard, rows, test } from './helpers.ts';

const REST = '**/__dev/rest/**';

async function openComments(page: Page, title: string) {
  await openBoard(page, { report: 'corner', query: ALL + '&q=' + encodeURIComponent(title) });
  await expect(rows(page)).toHaveCount(1);
  await rows(page).first().locator('.comment-preview').click();
  return page.getByRole('dialog', { name: /^Comments on PR/ });
}

test.describe('comments panel', () => {
  test('PANEL-9 PANEL-10: the panel docks to the right and loads every comment', async ({ page }) => {
    const panel = await openComments(page, 'import packages from an OpenAPI registry');
    await expect(panel.locator('.popover-title')).toHaveText(/^15 comments · PR #\d+$/);
    await expect(panel.locator('article')).toHaveCount(15);
    const box = (await panel.boundingBox())!;
    expect(box.x + box.width).toBeGreaterThan(page.viewportSize()!.width - 20);
    expect(box.height).toBeGreaterThan(page.viewportSize()!.height - 40);
    expect(Math.round(box.width)).toBe(800);
    // A narrow window gets the panel at its whole width, less the margins. Resizing closes it, so it opens again.
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(panel).toHaveCount(0);
    // The cell is off to the right now: scroll to it first, because scrolling closes popovers (PANEL-1).
    const preview = rows(page).first().locator('.comment-preview');
    await preview.scrollIntoViewIfNeeded();
    await preview.click();
    const narrow = (await panel.boundingBox())!;
    expect(narrow.x).toBeGreaterThanOrEqual(0);
    expect(narrow.x + narrow.width).toBeLessThanOrEqual(600);
  });

  test('PANEL-9: scrolling inside keeps the panel open; the close button and Escape close it', async ({ page }) => {
    const panel = await openComments(page, 'import packages from an OpenAPI registry');
    await expect(panel.locator('article')).toHaveCount(15);
    await panel.evaluate((el) => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).toHaveCount(0);
    await rows(page).first().locator('.comment-preview').click();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  });

  test('PANEL-10 PANEL-13: the two comments from the data show while the rest loads', async ({ page }) => {
    await page.route(REST, () => { /* never answers */ });
    const panel = await openComments(page, 'stabilize snapshot comparison on CI');
    await expect(panel.getByRole('status')).toHaveText('Loading all comments…');
    await expect(panel.locator('article')).toHaveCount(1);
    await expect(panel.locator('.comment-cut')).toHaveText('The comment is longer; open it on GitHub to read the rest.');
  });

  test('PANEL-11: a used-up anonymous limit keeps the two comments and says to add a token', async ({ page }) => {
    await page.route(REST, (route) => route.fulfill({ status: 403, headers: { 'x-ratelimit-remaining': '0' }, body: '{}' }));
    const panel = await openComments(page, 'import packages from an OpenAPI registry');
    await expect(panel.getByRole('status')).toContainText('Showing the latest only. Cannot load the rest:');
    await expect(panel.getByRole('status')).toContainText('Add a token in Settings.');
    await expect(panel.locator('article')).toHaveCount(2);
  });

  test('PANEL-11: the token goes with the request when there is one', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('apihub-pr-board.token', 'mock-token'));
    const auth: (string | undefined)[] = [];
    page.on('request', (request) => { if (request.url().includes('/__dev/rest/')) auth.push(request.headers().authorization); });
    const panel = await openComments(page, 'import packages from an OpenAPI registry');
    await expect(panel.locator('article')).toHaveCount(15);
    expect(auth).toEqual(['Bearer mock-token', 'Bearer mock-token']);
  });

  test('PANEL-12: the list loads once per PR', async ({ page }) => {
    let requests = 0;
    page.on('request', (request) => { if (request.url().includes('/__dev/rest/')) requests += 1; });
    const panel = await openComments(page, 'import packages from an OpenAPI registry');
    await expect(panel.locator('article')).toHaveCount(15);
    await page.keyboard.press('Escape');
    await rows(page).first().locator('.comment-preview').click();
    await expect(panel.locator('article')).toHaveCount(15);
    expect(requests).toBe(2);
  });

  test('PANEL-13 PANEL-15: each comment links to GitHub, and the footer opens the conversation', async ({ page }) => {
    const panel = await openComments(page, 'import packages from an OpenAPI registry');
    await expect(panel.locator('article')).toHaveCount(15);
    await expect(panel.locator('article').first().getByRole('link', { name: 'Open on GitHub' })).toHaveAttribute('href', /pulls$/);
    await expect(panel.getByRole('link', { name: 'Open the conversation on GitHub' })).toHaveAttribute('href', /acme\/widgets\/pulls$/);
  });

  test('PANEL-14 SEC-4: Markdown renders like on GitHub, and nothing from a comment runs', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => { dialogs.push(dialog.message()); void dialog.dismiss(); });
    const panel = await openComments(page, 'report visual diffs as a table');
    await expect(panel.locator('article')).toHaveCount(2);
    const markdown = panel.locator('.markdown');
    await expect(markdown.locator('table td')).toHaveCount(6);
    await expect(markdown.locator('input[type="checkbox"]')).toHaveCount(2);
    await expect(markdown.locator('summary')).toHaveText('Environment');
    await expect(markdown.locator('br').first()).toBeAttached();
    await expect(markdown.getByRole('link', { name: 'the test guide' })).toHaveAttribute('target', '_blank');
    const html = await markdown.evaluateAll((els) => els.map((e) => e.innerHTML).join(''));
    expect(html).not.toMatch(/<script|onerror=|href="javascript:/i);
    expect(dialogs).toEqual([]);
  });

  test('TABLE-11: the cell preview is plain text, without Markdown or HTML', async ({ page }) => {
    await openBoard(page, { report: 'corner', query: ALL + '&q=' + encodeURIComponent('report visual diffs as a table') });
    const preview = rows(page).first().locator('.comment-body');
    await expect(preview).toContainText('Before merging: update baselines check dark theme');
    await expect(preview).not.toContainText('- [');
  });
});
