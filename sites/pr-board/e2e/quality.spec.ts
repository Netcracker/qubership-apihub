import { ALL, expect, MOCK_NOW, openBoard, rows, test } from './helpers.ts';

const MINUTE_MS = 60 * 1000;

test.describe('quality', () => {
  test('QUAL-1: buttons that show only an icon or a code say what they do', async ({ page }) => {
    await openBoard(page, { report: 'corner', query: ALL + '&q=' + encodeURIComponent('WIP export') });
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search syntax' })).toBeVisible();
    await expect(page.getByRole('separator', { name: 'Resize the Author column' })).toBeVisible();
    await expect(rows(page).first().getByRole('button', { name: /^PR #\d+: 3 problems$/ })).toBeVisible();
    await expect(rows(page).first().getByRole('button', { name: /^No approval on PR #\d+\. Show reviewers$/ })).toBeVisible();
  });

  test('QUAL-2: menus report whether they are open, headers their sort, and toggles whether they are pressed', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    const gear = page.getByRole('button', { name: 'Settings', exact: true });
    await expect(gear).toHaveAttribute('aria-expanded', 'false');
    await gear.click();
    await expect(gear).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    const attention = page.locator('.board > thead > tr > th').filter({ hasText: 'Attention' });
    await expect(attention).toHaveAttribute('aria-sort', 'descending');
    await expect(page.locator('.board > thead > tr > th').filter({ hasText: 'Author' })).toHaveAttribute('aria-sort', 'none');
    const tile = page.locator('.tile').filter({ hasText: 'CI failing' });
    await expect(tile).toHaveAttribute('aria-pressed', 'false');
    await tile.click();
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('group', { name: 'Draft status' }).getByRole('button', { name: 'Ready for review' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('QUAL-3: the board works from the keyboard, and focus is always visible', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    const tile = page.locator('.tile').filter({ hasText: 'CI failing' });
    await tile.focus();
    await page.keyboard.press('Enter');
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
    await expect(tile).toHaveCSS('outline-style', 'solid');
    const rulesButton = page.getByRole('button', { name: 'Rules', exact: true });
    await rulesButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Board rules' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Board rules' })).toHaveCount(0);
  });

  test('QUAL-1 QUAL-3: codes that open nothing carry their full name, and focus returns to the button of a menu closed with Escape', async ({ page }) => {
    await openBoard(page, { report: 'corner', query: ALL + '&q=' + encodeURIComponent('WIP export') });
    const row = rows(page).first();
    await expect(row.getByRole('img', { name: 'No conflicts' })).toBeVisible();
    // Focus inside the Authors menu goes back to its button when Escape closes it.
    const authors = page.getByRole('button', { name: /^Authors:/ });
    await authors.click();
    const menu = page.getByRole('group', { name: 'Authors' });
    await menu.getByRole('checkbox').first().focus();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(authors).toBeFocused();
  });

  test('QUAL-5: running checks pulse, and stop when the system asks for reduced motion', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    const running = page.locator('.board .pill.running').first();
    await expect(running).toHaveCSS('animation-name', 'pulse');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(running).toHaveCSS('animation-name', 'none');
  });

  test('QUAL-7: text uses IBM Plex Sans and code IBM Plex Mono', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    await expect(page.locator('body')).toHaveCSS('font-family', /^"IBM Plex Sans"/);
    await expect(page.locator('h1 .repo')).toHaveCSS('font-family', /^"IBM Plex Mono"/);
  });

  test('SEC-8 QUAL-7: the page loads its fonts from its own host and makes no request to another one', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).hostname !== 'localhost') external.push(request.url());
    });
    await openBoard(page, { report: 'mixed' });
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('500 14px "IBM Plex Sans"') && document.fonts.check('400 12px "IBM Plex Mono"'))).toBe(true);
    const loaded = await page.evaluate(() => [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family));
    expect(loaded).toEqual(expect.arrayContaining(['IBM Plex Sans', 'IBM Plex Mono']));
    expect(external).toEqual([]);
  });

  test('QUAL-11: codes that open a popover show an outline and a ▾ at rest; codes that open nothing stay flat', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    const failing = page.locator('.ci-wrap > button.pill').first();
    const passing = page.locator('td.c-state span.pill', { hasText: /^P$/ }).first();
    const style = (locator: typeof failing) => locator.evaluate((el) => {
      const own = getComputedStyle(el);
      return { shadow: own.boxShadow, after: getComputedStyle(el, '::after').content, cursor: own.cursor };
    });
    const clickable = await style(failing);
    expect(clickable.shadow).not.toBe('none');
    expect(clickable.after).toBe('"▾"');
    expect(clickable.cursor).toBe('pointer');
    const flat = await style(passing);
    expect(flat.shadow).toBe('none');
    expect(flat.after).toBe('none');
    expect(await page.locator('.attn-icon').first().evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
  });

  test('QUAL-10: relative times move on every minute without a reload', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    const source = page.locator('.source-age');
    await expect(source).toHaveText('updated just now');
    // Time moves on, but the page only notices it on its minute tick.
    await page.clock.setFixedTime(Date.parse(MOCK_NOW) + 5 * MINUTE_MS);
    await expect(source).toHaveText('updated just now');
    await page.clock.runFor(MINUTE_MS);
    await expect(source).toHaveText('updated 5 min ago');
  });
});
