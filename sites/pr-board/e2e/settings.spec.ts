import type { Page } from '@playwright/test';
import { ALL, expect, openBoard, query, rows, test } from './helpers.ts';

const SETTINGS_KEY = 'apihub-pr-board.settings';
const TOKEN_KEY = 'apihub-pr-board.token';
const WIDTHS_KEY = 'apihub-pr-board.columns';

async function openSettings(page: Page) {
  await page.getByRole('button', { name: /^Settings/ }).click();
  return page.getByRole('dialog', { name: 'Settings' });
}

async function tileCount(page: Page, label: string) {
  return Number(await page.locator('.tile').filter({ hasText: label }).locator('.count').textContent());
}

function stored(page: Page, key: string) {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

test.describe('settings', () => {
  test('SET-1: the gear opens one panel with every section, and it says where settings live', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    const panel = await openSettings(page);
    for (const section of ['Repositories', 'Attention rules', 'Filter settings', 'View', 'Columns', 'GitHub token']) {
      await expect(panel.getByRole('heading', { name: section })).toBeVisible();
    }
    await expect(panel).toContainText('Saved in this browser. The page address carries repository choices, author filters, and customized detection criteria.');
    await expect(panel.locator('#token-input')).not.toBeFocused();
  });

  test('SET-2 RULE-7 SET-14: the stale limit changes attention and red ages, and an invalid value does not apply', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    const before = await tileCount(page, 'Need attention');
    const red = await rows(page).locator('.age.over').count();
    const panel = await openSettings(page);
    const field = panel.locator('input[type="number"]');
    await field.fill('3');
    expect(await tileCount(page, 'Need attention')).toBeGreaterThan(before);
    expect(await rows(page).locator('.age.over').count()).toBeGreaterThan(red);
    await field.fill('0');
    await field.blur();
    await expect(field).toHaveValue('3');
    expect(JSON.parse((await stored(page, SETTINGS_KEY))!).rules.staleDays).toBe(3);
  });

  test('SET-3 SET-4 RULE-9: the title and issue rules can be turned off', async ({ page }) => {
    await openBoard(page, { report: 'corner', query: ALL + '&q=' + encodeURIComponent('WIP export') });
    const panel = await openSettings(page);
    await panel.getByLabel('Title follows Conventional Commits').uncheck();
    await panel.getByLabel('Linked issue or GitHub Project').uncheck();
    await page.keyboard.press('Escape');
    await expect(rows(page).first().locator('.attn-count')).toHaveCount(0);
    await rows(page).first().locator('.attn-icon').click();
    await expect(page.getByRole('dialog', { name: /needs attention/ }).locator('li')).toHaveText([/^Open \d+ days, limit is 10$/]);
  });

  test('SET-5 RULE-10 SET-17: an extra bot login counts as a bot, without regard to case, and the link carries it', async ({ page }) => {
    await openBoard(page, { report: 'corner', query: 'draft=all&q=' + encodeURIComponent('bump version to') });
    await expect(rows(page)).toHaveCount(1);
    const panel = await openSettings(page);
    await panel.locator('#extra-bots').fill('ACME-release-bot');
    await panel.locator('#extra-bots').press('Enter');
    await page.keyboard.press('Escape');
    await expect(page.getByText('No pull requests match this view')).toBeVisible();
    await expect(page).toHaveURL(/[?&]bots=ACME-release-bot(&|$)/);
    expect(JSON.parse((await stored(page, SETTINGS_KEY))!).rules.extraBots).toEqual([]);
    await page.goto('/?authors=bots&draft=all&bots=ACME-release-bot&q=' + encodeURIComponent('bump version to'));
    await expect(rows(page).first().locator('.chip.bot')).toBeVisible();
  });

  test('SET-14: what is typed in a list field applies when the panel closes with Escape before the field loses focus', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    const panel = await openSettings(page);
    await panel.locator('#extra-bots').fill('acme-release-bot');
    await panel.getByRole('textbox', { name: 'Repositories' }).fill('acme/widgets');
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(page).toHaveURL(/[?&]bots=acme-release-bot(&|$)/);
    await expect(page).toHaveURL(/[?&]repos=acme\/widgets(&|$)/);
    // No form: browsers do not offer to save the token as a password (SEC-1).
    await openSettings(page);
    await expect(page.locator('.settings-panel form')).toHaveCount(0);
  });

  test('SET-23: Labels hides the label chips of PRs and linked issues, and search still finds labels', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    await expect(page.locator('.board .label-chip').first()).toBeAttached();
    const panel = await openSettings(page);
    const labels = panel.getByRole('group', { name: 'Labels' });
    await expect(labels.getByRole('button', { name: 'Show' })).toHaveAttribute('aria-pressed', 'true');
    await labels.getByRole('button', { name: 'Hide' }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.board .label-chip')).toHaveCount(0);
    await expect(page.locator('.board .issue-labels')).toHaveCount(0);
    await page.getByLabel('Search pull requests').fill('label:bug');
    await expect(rows(page).first()).toBeVisible();
    await page.reload();
    await expect(page.locator('.board .label-chip')).toHaveCount(0);
  });

  test('SET-25: Settings orders the reviewer groups with arrows, and the Reviewers list follows', async ({ page }) => {
    // Seeded once, so the reload below reads what Settings saved.
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem('apihub-pr-board.settings', JSON.stringify({ reviewColumn: 'list' }));
      sessionStorage.setItem('seeded', '1');
    });
    await openBoard(page, { report: 'mixed', query: ALL + '&q=' + encodeURIComponent('publish packages in batches') });
    const first = rows(page).first().getByRole('listitem').first();
    await expect(first.getByRole('img', { name: 'requested changes' })).toBeVisible();
    const panel = await openSettings(page);
    const order = panel.getByRole('list', { name: 'Reviewers order' });
    await expect(order.getByRole('listitem')).toHaveText([/Requested changes/, /Not reviewed yet/, /Left comments/, /Review dismissed/, /Approved/]);
    await expect(panel.getByRole('button', { name: 'Move Approved down' })).toBeDisabled();
    for (let i = 0; i < 4; i++) await panel.getByRole('button', { name: 'Move Approved up' }).click();
    await expect(order.getByRole('listitem').first()).toHaveText(/Approved/);
    await expect(first.getByRole('img', { name: 'approved' })).toBeVisible();
    await page.reload();
    await expect(rows(page).first().getByRole('listitem').first().getByRole('img', { name: 'approved' })).toBeVisible();
  });

  test('SET-6 RULE-11: adding a scope to an area moves its PRs there', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL + '&area=other' });
    const other = await rows(page).locator('td.c-num').count();
    const panel = await openSettings(page);
    const be = panel.locator('#filter-be-scopes');
    await be.fill((await be.inputValue()) + ', ci, docs, release');
    await be.blur();
    await page.keyboard.press('Escape');
    expect(await rows(page).locator('td.c-num').count()).toBeLessThan(other);
    expect(query(page).area).toBe('other');
  });

  test('SET-7 SET-15: theme and density apply at once', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    const panel = await openSettings(page);
    const root = page.locator('html');
    const padding = () => rows(page).first().locator('td').first().evaluate((td) => getComputedStyle(td).paddingTop);
    expect(await padding()).toBe('9px');
    await panel.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click();
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await panel.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'System' }).click();
    await expect(root).not.toHaveAttribute('data-theme');
    await panel.getByRole('group', { name: 'Density' }).getByRole('button', { name: 'Compact' }).click();
    await expect(root).toHaveAttribute('data-density', 'compact');
    expect(await padding()).toBe('4px');
  });

  test('SET-9 SEC-1 SEC-2: the token field hides the token, and Forget token removes it', async ({ page }) => {
    await page.addInitScript((key) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, 'mock-token'); sessionStorage.setItem('seeded', '1'); } }, TOKEN_KEY);
    await openBoard(page, { report: 'typical' });
    const panel = await openSettings(page);
    await expect(panel.locator('#token-input')).toHaveAttribute('type', 'password');
    await expect(panel.locator('#token-input')).toHaveAttribute('autocomplete', 'off');
    await expect(panel.locator('#token-input')).toHaveAttribute('placeholder', 'Saved. Paste a new one to replace it');
    await panel.getByRole('button', { name: 'Forget token' }).click();
    expect(await stored(page, TOKEN_KEY)).toBeNull();
    await expect(panel.getByRole('button', { name: 'Forget token' })).toHaveCount(0);
  });

  test('SET-10: custom rules show a dot on the gear and Custom rules in the legend', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    await expect(page.locator('.chip.custom')).toHaveCount(0);
    await expect(page.locator('.btn.icon .dot')).toHaveCount(0);
    const panel = await openSettings(page);
    await panel.locator('input[type="number"]').fill('5');
    await expect(page.locator('.chip.custom')).toHaveText('Custom rules');
    await expect(page.locator('.btn.icon .dot')).toHaveCount(1);
  });

  test('SET-11: settings survive a reload, and a broken or partly invalid entry falls back field by field', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify({ rules: { staleDays: 999, checkTitle: false }, theme: 'neon', density: 'compact' })), SETTINGS_KEY);
    await openBoard(page, { report: 'typical' });
    const panel = await openSettings(page);
    await expect(panel.locator('input[type="number"]')).toHaveValue('10');
    await expect(panel.getByLabel('Title follows Conventional Commits')).not.toBeChecked();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  });

  test('SET-11: unreadable stored settings do not break the page', async ({ page, pageErrors }) => {
    await page.addInitScript((key) => localStorage.setItem(key, '{broken'), SETTINGS_KEY);
    await openBoard(page, { report: 'typical', query: ALL });
    await expect(rows(page)).toHaveCount(36);
    expect(pageErrors).toEqual([]);
  });

  test('SET-12: Reset to defaults restores rules, areas, view, and columns, and keeps the token and widths', async ({ page }) => {
    await page.addInitScript(([settings, token, widths]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem(settings, JSON.stringify({ rules: { staleDays: 3, extraBots: ['acme-release-bot'] }, theme: 'dark', hiddenColumns: ['ci'] }));
      localStorage.setItem(token, 'mock-token');
      localStorage.setItem(widths, JSON.stringify({ author: 230 }));
      sessionStorage.setItem('seeded', '1');
    }, [SETTINGS_KEY, TOKEN_KEY, WIDTHS_KEY]);
    await openBoard(page, { report: 'typical' });
    const panel = await openSettings(page);
    await panel.getByRole('button', { name: 'Reset to defaults' }).click();
    await expect(panel.locator('input[type="number"]')).toHaveValue('10');
    await expect(panel.locator('#extra-bots')).toHaveValue('');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(page.locator('.board > thead > tr > th').filter({ hasText: 'CI' })).toHaveCount(1);
    expect(await stored(page, TOKEN_KEY)).toBe('mock-token');
    expect(await stored(page, WIDTHS_KEY)).toContain('230');
  });
});
