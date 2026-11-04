import type { Page } from '@playwright/test';
import { ALL, expect, openBoard, query, rows, test } from './helpers.ts';

function tile(page: Page, label: string) {
  return page.locator('.tile').filter({ hasText: label });
}

async function tileCount(page: Page, label: string) {
  return Number(await tile(page, label).locator('.count').textContent());
}

function authorsButton(page: Page) {
  return page.getByRole('button', { name: /^Authors:/ });
}

function segment(page: Page, group: string, label: string) {
  return page.getByRole('group', { name: group }).getByRole('button', { name: label, exact: true });
}

test.describe('quick filters', () => {
  test('FILTER-1 FILTER-2: a tile shows its count and filters to exactly those PRs', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    expect(await tileCount(page, 'Open PRs')).toBe(36);
    const failing = await tileCount(page, 'CI failing');
    await tile(page, 'CI failing').click();
    await expect(rows(page)).toHaveCount(failing);
    expect(await rows(page).evaluateAll((trs) => trs.every((tr) => tr.classList.contains('ci-failing')))).toBe(true);
    expect(query(page).quick).toBe('ci');
  });

  test('FILTER-2: active tiles combine with AND, and Open PRs clears them', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    await tile(page, 'CI failing').click();
    await tile(page, 'Without approval').click();
    expect(query(page).quick).toBe('ci,review');
    const reviews = await rows(page).locator('.review-wrap > button').allTextContents();
    expect(reviews.every((code) => !code.startsWith('✓'))).toBe(true);
    await tile(page, 'Open PRs').click();
    await expect(rows(page)).toHaveCount(36);
    expect(query(page).quick).toBeUndefined();
  });

  test('FILTER-2: a tile without matching PRs is dimmed', async ({ page }) => {
    await openBoard(page, { report: 'empty' });
    await expect(tile(page, 'CI failing')).toHaveClass(/\bzero\b/);
  });
});

test.describe('toolbar', () => {
  test('FILTER-3 FILTER-13 DATA-26: Me selects the token owner and becomes unavailable when the token is forgotten', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('apihub-pr-board.token', 'mock-token'));
    await openBoard(page, { report: 'typical', query: ALL });
    await authorsButton(page).click();
    const me = page.getByRole('group', { name: 'Authors', exact: true }).getByRole('button', { name: 'Me', exact: true });
    await expect(me).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.viewer-badge')).toHaveText(/boris-k/);
    await authorsButton(page).click();
    await expect(me).toBeEnabled();
    await me.click();
    await expect(authorsButton(page)).toContainText('Me');
    await expect(me).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(rows(page).locator('td:nth-child(4) .login').first()).toHaveText('boris-k');
    expect(new Set(await rows(page).locator('td:nth-child(4) .login').allTextContents())).toEqual(new Set(['boris-k']));
    expect(query(page).authors).toBe('me');
    await page.getByRole('button', { name: /^Settings/ }).click();
    await page.getByRole('button', { name: 'Forget token', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.viewer-badge')).toHaveCount(0);
    await expect(rows(page).locator('td:nth-child(4)')).toHaveCount(0);
    await authorsButton(page).click();
    await expect(me).toBeDisabled();
    expect(query(page).authors).toBe('me');
  });

  test('FILTER-3 FILTER-13 DATA-26: a shared Me link resolves to the recipient rather than the sender', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('apihub-pr-board.token', 'mock-token'));
    await page.route('**/__dev/graphql', async (route) => {
      const response = await route.fetch();
      const body = await response.json() as { data?: { viewer?: { login: string } } };
      if (body.data?.viewer) body.data.viewer.login = 'anna-dev';
      await route.fulfill({ response, json: body });
    });
    await openBoard(page, { report: 'typical', query: 'authors=me&draft=all' });
    await expect(rows(page).locator('td:nth-child(4)')).toHaveCount(0);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.viewer-badge')).toHaveText(/anna-dev/);
    await expect(rows(page).locator('td:nth-child(4) .login').first()).toHaveText('anna-dev');
    expect(new Set(await rows(page).locator('td:nth-child(4) .login').allTextContents())).toEqual(new Set(['anna-dev']));
    expect(query(page).authors).toBe('me');
    await page.reload();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(rows(page).locator('td:nth-child(4) .login').first()).toHaveText('anna-dev');
    await expect(authorsButton(page)).toContainText('Me');
  });

  test('FILTER-3: People is the default and hides bots; Bots, Everyone, and Clear switch the choice', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: 'draft=all' });
    await expect(authorsButton(page)).toContainText('People');
    await expect(rows(page).locator('.chip.bot')).toHaveCount(0);
    await authorsButton(page).click();
    await page.getByRole('group', { name: 'Authors' }).getByRole('button', { name: 'Bots' }).click();
    await expect(authorsButton(page)).toContainText('Bots');
    expect(await rows(page).count()).toBe(await rows(page).locator('.chip.bot').count());
    await page.getByRole('group', { name: 'Authors' }).getByRole('button', { name: 'Everyone' }).click();
    await expect(rows(page)).toHaveCount(36);
    await page.getByRole('group', { name: 'Authors' }).getByRole('button', { name: 'Clear' }).click();
    await expect(authorsButton(page)).toContainText('Nobody');
    await expect(page.getByText('No pull requests match this view')).toBeVisible();
  });

  test('FILTER-3 FILTER-4: one author by hand, and every person by hand becomes People', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: 'draft=all' });
    await authorsButton(page).click();
    await page.getByRole('group', { name: 'Authors' }).getByRole('button', { name: 'Clear' }).click();
    await page.getByRole('group', { name: 'Authors' }).locator('label').filter({ hasText: 'anna-dev' }).click();
    await expect(authorsButton(page)).toContainText('anna-dev');
    expect(new Set(await rows(page).locator('td:nth-child(4) .login').allTextContents())).toEqual(new Set(['anna-dev']));
    // The typical board has one bot, dependabot; check every other author.
    for (const label of await page.getByRole('group', { name: 'Authors' }).locator('label.author-option').all()) {
      const bot = (await label.textContent())!.includes('dependabot');
      if (!bot && !(await label.locator('input').isChecked())) await label.click();
    }
    await expect(authorsButton(page)).toContainText('People');
    expect(query(page).authors).toBeUndefined();
  });

  test('FILTER-4: the author list follows a Refresh, and a chosen author without PRs stays in the URL', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('apihub-pr-board.token', 'mock-token'));
    await openBoard(page, { report: 'typical', refresh: 'ok', query: 'draft=all&authors=anna-dev,new-contributor-42' });
    await expect(authorsButton(page)).toContainText('anna-dev');
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    await expect(authorsButton(page)).toContainText('2 selected');
    expect(query(page).authors).toBe('anna-dev,new-contributor-42');
  });

  test('FILTER-5: Ready for review is the default; Drafts and All change it', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: 'authors=all' });
    await expect(rows(page).locator('.chip.draft')).toHaveCount(0);
    await segment(page, 'Draft status', 'Drafts').click();
    expect(await rows(page).count()).toBe(await rows(page).locator('.chip.draft').count());
    expect(await rows(page).count()).toBeGreaterThan(0);
    await segment(page, 'Draft status', 'All').click();
    await expect(rows(page)).toHaveCount(36);
    expect(query(page).draft).toBe('all');
  });

  test('FILTER-6 RULE-11: a PR in both areas shows under BE and FE, and not under Other', async ({ page }) => {
    await openBoard(page, { report: 'corner', query: ALL + '&q=' + encodeURIComponent('missing package version') });
    await expect(rows(page)).toHaveCount(1);
    for (const [area, count] of [['BE', 1], ['UI', 1], ['Other', 0]] as const) {
      await segment(page, 'Area', area).click();
      await expect(rows(page).locator('td.c-num')).toHaveCount(count);
    }
  });

  test('FILTER-7: Reset view shows only for a changed view and restores the default', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    const reset = page.locator('.toolbar').getByRole('button', { name: 'Reset view' });
    await expect(reset).toHaveCount(0);
    await segment(page, 'Area', 'UI').click();
    await reset.click();
    await expect(reset).toHaveCount(0);
    expect(page.url()).not.toContain('?');
  });

  test('FILTER-7: Copy link copies the address and confirms', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openBoard(page, { report: 'typical', query: 'area=fe' });
    await page.getByRole('button', { name: 'Copy link to this view' }).click();
    await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
  });

  test('FILTER-7: a blocked clipboard asks to copy the address bar', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } });
    });
    await openBoard(page, { report: 'typical' });
    await page.getByRole('button', { name: 'Copy link to this view' }).click();
    await expect(page.getByRole('button', { name: 'Copy the address bar instead' })).toBeVisible();
  });

  test('FILTER-16: the Priority menu lists the priorities of linked issues and keeps the choice in the address', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    await page.getByRole('button', { name: /^Priority:/ }).click();
    const menu = page.getByRole('group', { name: 'Priority' });
    await expect(menu.locator('label > span:not(.n)')).toHaveText(['High', 'Medium', 'Low', 'No priority']);
    const highCount = Number(await menu.locator('label', { hasText: 'High' }).locator('.n').textContent());
    await menu.getByRole('checkbox', { name: 'High' }).check();
    await expect(page.getByRole('button', { name: /^Priority:/ })).toHaveText(/Priority:\s*High/);
    await expect(rows(page)).toHaveCount(highCount);
    await expect(page).toHaveURL(/[?&]priority=High(&|$)/);
    await page.reload();
    await expect(rows(page)).toHaveCount(highCount);
    await expect(page.locator('td.c-issue .field-chip').filter({ hasText: /^(Medium|Low)$/ })).toHaveCount(0);
  });
});
