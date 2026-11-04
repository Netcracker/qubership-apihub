import type { Page } from '@playwright/test';
import { ALL, expect, openBoard, rows, test } from './helpers.ts';

async function expectTableBorders(page: Page) {
  const actual = await page.locator('.table-wrap').evaluate((wrap) => {
    const sides = ['top', 'right', 'bottom', 'left'];
    const borders = (el: Element) => {
      const style = getComputedStyle(el);
      return Object.fromEntries(sides.map((side) => [side, {
        width: style.getPropertyValue(`border-${side}-width`),
        style: style.getPropertyValue(`border-${side}-style`),
        color: style.getPropertyValue(`border-${side}-color`),
      }]));
    };
    const probe = document.createElement('span');
    wrap.append(probe);
    const color = (token: string) => {
      probe.style.color = `var(${token})`;
      return getComputedStyle(probe).color;
    };
    const line = color('--line');
    const strong = color('--line-strong');
    probe.remove();
    return {
      line, strong, frame: borders(wrap),
      headers: [...wrap.querySelectorAll('.board > thead > tr > th')].map(borders),
      rows: [...wrap.querySelectorAll('.board > tbody > tr')].map((row) => [...row.children].map(borders)),
    };
  });
  const solid = (color: string) => ({ width: '1px', style: 'solid', color });
  expect(actual.frame, 'all four edges of the table frame').toEqual({
    top: solid(actual.line), right: solid(actual.line), bottom: solid(actual.line), left: solid(actual.line),
  });
  const expectedCells = (count: number, bottom: string) => Array.from({ length: count }, (_, index) => ({
    top: { width: '0px' }, left: { width: '0px' },
    right: index < count - 1 ? solid(actual.line) : { width: '0px' },
    bottom: solid(bottom),
  }));
  expect(actual.headers.length).toBeGreaterThan(1);
  expect(actual.headers, 'header separators').toMatchObject(expectedCells(actual.headers.length, actual.strong));
  expect(actual.rows.length).toBeGreaterThan(0);
  for (const [index, cells] of actual.rows.entries()) {
    expect(cells, `borders of row ${index + 1}`).toMatchObject(expectedCells(cells.length, actual.line));
  }
}

for (const theme of ['light', 'dark']) {
  for (const density of ['comfortable', 'compact']) {
    test(`TABLE-4 TABLE-23 QUAL-6 SET-15: all table borders (${theme}, ${density})`, async ({ page }) => {
      await page.addInitScript((settings) => {
        localStorage.setItem('apihub-pr-board.settings', JSON.stringify(settings));
      }, { theme, density });
      await openBoard(page, { report: 'corner', query: ALL });
      expect(await rows(page).count()).toBeGreaterThan(1);
      await expectTableBorders(page);

      await page.getByRole('searchbox').fill('experimental GraphQL schema diff');
      await expect(rows(page)).toHaveCount(1);
      const frame = (await page.locator('.table-wrap').boundingBox())!;
      const last = (await rows(page).last().boundingBox())!;
      expect(frame.y + frame.height).toBeGreaterThan(last.y + last.height + 20);
      await expectTableBorders(page);

      await page.getByRole('button', { name: /^Settings/ }).click();
      const panel = page.getByRole('dialog', { name: 'Settings' });
      for (const label of ['Last comment', 'Attention']) await panel.getByLabel(label, { exact: true }).uncheck();
      await page.keyboard.press('Escape');
      await expect(page.locator('.board > thead > tr > th').last()).toContainText('Assignee');
      await expectTableBorders(page);

      await page.getByRole('searchbox').fill('no-matching-pull-request');
      await expect(page.getByText('No pull requests match this view')).toBeVisible();
      await expectTableBorders(page);
    });
  }
}
