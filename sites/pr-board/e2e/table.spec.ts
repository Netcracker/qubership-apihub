import type { Page } from '@playwright/test';
import { ALL, expect, openBoard, rows, test } from './helpers.ts';

async function onlyCase(page: Page, title: string) {
  await openBoard(page, { report: 'corner', query: ALL + '&q=' + encodeURIComponent(title) });
  await expect(rows(page)).toHaveCount(1);
  return rows(page).first();
}

const rgb = (hex: string) => 'rgb(' + [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ')';

test.describe('table', () => {
  test('TABLE-1: the header shows the repository and title, then tiles, data source, Refresh, and Settings', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    await expect(page.locator('h1')).toHaveText('acme/widgetsOpen pull requests');
    const order = await page.locator('.masthead-side > *').evaluateAll((els) => els.map((e) => e.className));
    expect(order).toEqual(['tiles', 'update-info', 'menu-wrap refresh']);
    await expect(page.locator('.refresh-buttons button')).toHaveText(['Refresh', '⚙']);
  });

  test('TABLE-4: the columns come in the agreed order', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    const headers = await page.locator('.board > thead > tr > th').allTextContents();
    expect(headers.map((h) => h.replace(/[▲▼]/g, '').trim())).toEqual(
      ['#', 'Pull request', 'Issue', 'Author', 'CI', 'Review', 'Conflicts', 'Age · activity', 'Assignee', 'Last comment', 'Attention']);
  });

  test('TABLE-6: the PR cell shows the draft and target branch chips and a corner case note', async ({ page }) => {
    const row = await onlyCase(page, 'experimental GraphQL schema diff');
    await expect(row.locator('.chip.draft')).toHaveText('Draft');
    await expect(row.locator('.chip.example')).toHaveText('example');
    await expect(row.locator('.example-note')).toContainText('Every problem at once');
    const branch = await onlyCase(page, 'retry discovery when the API server is throttling');
    await expect(branch.locator('.chip.branch')).toHaveText('→ develop');
  });

  test('TABLE-7: labels use their colors with readable text, and long lists fold into +N', async ({ page }) => {
    let row = await onlyCase(page, 'label rendering check');
    const white = row.locator('.label-chip', { hasText: 'wontfix' });
    await expect(white).toHaveCSS('background-color', rgb('ffffff'));
    await expect(white).toHaveCSS('color', rgb('1f2328'));
    await expect(row.locator('.label-chip', { hasText: 'github-actions' })).toHaveCSS('color', rgb('ffffff'));
    await expect(white).toHaveCSS('font-size', '11px');
    await expect(white).toHaveCSS('max-width', '150px');
    row = await onlyCase(page, 'move shared OpenAPI helpers into commons');
    await expect(row.locator('.label-chip')).toHaveCount(4);
    await row.getByRole('button', { name: '+6' }).click();
    await expect(row.locator('.label-chip')).toHaveCount(10);
    await row.getByRole('button', { name: 'less' }).click();
    await expect(row.locator('.label-chip')).toHaveCount(4);
  });

  test('TABLE-8: the Issue column links to the issue, or names the project, or says there is none', async ({ page }) => {
    let row = await onlyCase(page, 'return 404 for a missing package version');
    const issue = row.locator('td.c-issue .issue-ref');
    await expect(issue).toHaveAttribute('href', /acme\/widgets\/issues$/);
    await expect(row.locator('td.c-title .issue-ref')).toHaveCount(0);
    row = await onlyCase(page, 'tidy CODEOWNERS for the agent package');
    await expect(row.locator('td.c-issue')).toHaveText('No issue · in Widgets sprint');
  });

  test('TABLE-8: a linked issue shows its type and up to three labels, then +N', async ({ page }) => {
    const row = await onlyCase(page, 'show the issue type and labels');
    const cell = row.locator('td.c-issue');
    await expect(cell.locator('.issue-type')).toHaveText('Epic');
    await expect(cell.locator('.issue-type .issue-type-dot')).toHaveCSS('background-color', 'rgb(140, 149, 159)');
    await expect(cell.locator('.issue-number')).toHaveText('#512');
    await expect(cell.locator('.issue-labels .label-chip')).toHaveText(['ux', 'customer', 'Q4']);
    await expect(cell.locator('.issue-labels .label-more')).toHaveText('+2');
    await expect(cell.locator('.issue-labels .label-more')).toHaveAttribute('title', 'needs design, frontend');
  });

  test('TABLE-28: the project fields show under the issue, from the first project that sets each, with the current sprint marked', async ({ page }) => {
    const row = await onlyCase(page, 'show the issue type and labels');
    const chips = row.locator('td.c-issue .issue-fields .field-chip');
    await expect(chips).toHaveText(['Urgent', 'Est 13', 'Sprint 42 · current']);
    await expect(chips.nth(0).locator('.issue-type-dot')).toHaveCSS('background-color', 'rgb(164, 117, 249)');
    await expect(chips.nth(2)).toHaveClass(/current/);
    await expect(chips.nth(2)).toHaveAttribute('title', /^Sprint 42: \w{3} \d{1,2} – \w{3} \d{1,2}$/);
    await openBoard(page, { report: 'corner', query: ALL + '&q=' + encodeURIComponent('priority:urgent sprint:current') });
    await expect(rows(page)).toHaveCount(1);
  });

  test('TABLE-9: people show avatars or initials, ghost for deleted accounts, and long logins move below', async ({ page }) => {
    let row = await onlyCase(page, 'author:new-contributor-42');
    await expect(row.locator('td:nth-child(4) .avatar')).toHaveText('NC');
    const assignee = row.locator('td:nth-child(9) .person');
    const avatar = (await assignee.locator('.avatar').boundingBox())!;
    const login = (await assignee.locator('.login').boundingBox())!;
    expect(login.y).toBeGreaterThanOrEqual(avatar.y + avatar.height);
    row = await onlyCase(page, 'author:ghost');
    await expect(row.locator('td:nth-child(4) .person.ghost .login')).toHaveText('ghost');
  });

  test('TABLE-10: the age turns red only past the limit, with the last update under it', async ({ page }) => {
    let row = await onlyCase(page, 'keep operation order stable across rebuilds');
    await expect(row.locator('.age')).toHaveText('10 days');
    await expect(row.locator('.age')).not.toHaveClass(/over/);
    await expect(row.locator('.activity')).toHaveText('updated 2 days ago');
    row = await onlyCase(page, 'normalize trailing slashes in server URLs');
    await expect(row.locator('.age')).toHaveText('11 days');
    await expect(row.locator('.age')).toHaveClass(/over/);
  });

  test('TABLE-12 QUAL-4: status codes carry their full name in the tooltip, the accessible name, and the legend', async ({ page }) => {
    const row = await onlyCase(page, 'add rule for missing operationId');
    const ci = row.locator('td:nth-child(5) .pill');
    await expect(ci).toHaveText('P');
    await expect(ci).toHaveAttribute('title', 'Passing: All checks passed');
    await expect(ci).toHaveAttribute('aria-label', 'Passing');
    await expect(row.locator('td:nth-child(7) .pill')).toHaveText('OK');
    await expect(row.locator('.review-wrap > button')).toHaveText('✓');
    const legend = page.locator('.legend-bar');
    for (const text of ['FFailing', 'PPassing', 'CRChanges requested', '✓Approved', 'OKNo conflicts', '?Checking']) {
      await expect(legend.locator('.legend-item', { hasText: text.slice(text.search(/[A-Z][a-z]/)) }).first()).toContainText(text);
    }
    const codes = await page.locator('.board .pill').allTextContents();
    expect(codes.every((code) => code.trim().length > 0)).toBe(true);
  });

  test('TABLE-15: the row stripe mirrors CI, and rows without checks have none', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    const stripe = (cls: string) => page.locator('.board > tbody > tr.' + cls + ' > td').first();
    await expect(stripe('ci-failing')).toHaveCSS('box-shadow', /inset/);
    await expect(stripe('ci-running')).toHaveCSS('box-shadow', /inset/);
    await expect(stripe('ci-passing')).toHaveCSS('box-shadow', /inset/);
    await expect(stripe('ci-none')).toHaveCSS('box-shadow', 'none');
    const colors = await Promise.all(['ci-failing', 'ci-running', 'ci-passing'].map((c) => stripe(c).evaluate((td) => getComputedStyle(td).boxShadow)));
    expect(new Set(colors).size).toBe(3);
  });

  test('TABLE-21: only the table scrolls and its headers stick; small windows scroll the page instead', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    const header = page.locator('.board > thead > tr > th').first();
    const before = (await header.boundingBox())!.y;
    await page.locator('.table-wrap').evaluate((el) => { el.scrollTop = 400; });
    expect((await header.boundingBox())!.y).toBe(before);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await page.setViewportSize({ width: 680, height: 600 });
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
  });

  test('TABLE-25: the legend explains codes, pending reviewers, and stripes, and ends with Rules', async ({ page }) => {
    await openBoard(page, { report: 'typical' });
    const legend = page.locator('.legend-bar');
    await expect(legend.locator('.legend-name')).toHaveText(['CI', 'Review', 'Conflicts', 'Row']);
    await expect(legend).toContainText('pending reviewers');
    await expect(legend.locator('.stripe')).toHaveCount(3);
    await expect(legend.locator('.legend-rules > *').last()).toHaveText('Rules');
  });

  test('SEC-3: HTML in a title renders as text and never runs', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => { dialogs.push(dialog.message()); void dialog.dismiss(); });
    const row = await onlyCase(page, 'escape');
    await expect(row.locator('.pr-title > a')).toHaveText('fix(ui): escape <script>alert("xss")</script> in package names');
    await expect(row.locator('.pr-title script')).toHaveCount(0);
    expect(dialogs).toEqual([]);
  });
});
