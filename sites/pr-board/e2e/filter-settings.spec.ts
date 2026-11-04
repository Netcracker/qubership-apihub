import { ALL, expect, openBoard, query, rows, test } from './helpers.ts';

test('SET-6 FILTER-14 RULE-11: custom criteria survive sharing into a browser with different preferences', async ({ page, browser }) => {
  await openBoard(page, { report: 'typical', query: ALL });
  const total = await rows(page).count();
  await page.getByRole('button', { name: /^Settings/ }).click();
  const panel = page.getByRole('dialog', { name: 'Settings' });
  for (const field of ['labels', 'scopes', 'tags', 'directories']) {
    await panel.locator('#filter-be-' + field).fill('');
    await panel.locator('#filter-be-' + field).blur();
  }
  await panel.getByLabel('BE repository names').fill('acme/widgets');
  await panel.getByLabel('BE repository names').press('Enter');
  await page.keyboard.press('Escape');
  await page.getByRole('group', { name: 'Area', exact: true }).getByRole('button', { name: 'BE', exact: true }).click();
  await expect(rows(page)).toHaveCount(total);
  const config = JSON.parse(query(page).criteria);
  expect(config.be.labels).toEqual([]);
  expect(config.be.repositories).toEqual(['acme/widgets']);
  const shared = page.url();
  const context = await browser.newContext();
  try {
    const recipient = await context.newPage();
    await recipient.addInitScript(() => {
      localStorage.setItem('apihub-pr-board.wizard', 'done');
      localStorage.setItem('apihub-pr-board.settings', JSON.stringify({
        rules: { areaCriteria: { be: { repositories: ['acme/other'], scopes: ['docs'] } } }, theme: 'dark',
      }));
    });
    await recipient.goto(shared);
    await expect(rows(recipient)).toHaveCount(total);
    await recipient.getByRole('button', { name: /^Settings/ }).click();
    await expect(recipient.getByLabel('BE repository names')).toHaveValue('acme/widgets');
    await expect(recipient.getByLabel('BE title scopes')).toHaveValue('');
    await expect(recipient.locator('html')).toHaveAttribute('data-theme', 'dark');
    await recipient.getByRole('button', { name: 'Reset filters', exact: true }).click();
    await expect.poll(() => query(recipient).criteria).toBeUndefined();
    await expect(recipient.getByLabel('BE title scopes')).not.toHaveValue('');
  } finally {
    await context.close();
  }
});

test('SET-6 SET-14: pending filter text applies on close, and appearance does not enter the URL', async ({ page }) => {
  await openBoard(page, { report: 'typical', query: ALL });
  await page.getByRole('button', { name: /^Settings/ }).click();
  await page.getByLabel('UI labels', { exact: true }).fill('custom label');
  await page.keyboard.press('Escape');
  await expect.poll(() => query(page).criteria).toBeDefined();
  expect(JSON.parse(query(page).criteria).fe.labels).toEqual(['custom label']);
  await page.getByRole('button', { name: /^Settings/ }).click();
  await page.getByRole('group', { name: 'Theme', exact: true }).getByRole('button', { name: 'Dark', exact: true }).click();
  await page.getByLabel('CI', { exact: true }).uncheck();
  await page.keyboard.press('Escape');
  expect(query(page).hide).toBeUndefined();
  expect(query(page).theme).toBeUndefined();
  expect(JSON.parse(query(page).criteria).fe.labels).toEqual(['custom label']);
  await page.reload();
  await page.getByRole('button', { name: /^Settings/ }).click();
  await expect(page.getByLabel('UI labels', { exact: true })).toHaveValue('custom label');
});

test('FILTER-3 FILTER-13: author categories combine and survive a shared link', async ({ page }) => {
  await openBoard(page, { report: 'typical', query: 'draft=all' });
  await page.getByRole('button', { name: /^Authors:/ }).click();
  const categories = page.getByRole('group', { name: 'Author categories' });
  await categories.getByLabel('Dependabot', { exact: true }).check();
  await page.keyboard.press('Escape');
  expect(query(page).authorgroups).toBe('humans,dependabot');
  await page.reload();
  await page.getByRole('button', { name: /^Authors:/ }).click();
  await expect(categories.getByLabel('Humans', { exact: true })).toBeChecked();
  await expect(categories.getByLabel('Dependabot', { exact: true })).toBeChecked();
  await expect(categories.getByLabel('NetcrackerCLPLCI', { exact: true })).not.toBeChecked();
});

test('SET-6 SET-12: resetting shared default criteria also clears older browser overrides', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded-criteria')) return;
    localStorage.setItem('apihub-pr-board.settings', JSON.stringify({
      rules: { areaCriteria: { be: { labels: ['old custom label'] } } },
    }));
    sessionStorage.setItem('seeded-criteria', '1');
  });
  await openBoard(page, { report: 'typical', query: ALL + '&criteria=%7B%7D' });
  await page.getByRole('button', { name: /^Settings/ }).click();
  await expect(page.getByLabel('BE labels', { exact: true })).not.toHaveValue('old custom label');
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /^Settings/ }).click();
  await expect(page.getByLabel('BE labels', { exact: true })).not.toHaveValue('old custom label');
});

test('DATA-28 SET-12 SET-19: resetting shared default groups replaces older browser groups', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded-groups')) return;
    localStorage.setItem('apihub-pr-board.settings', JSON.stringify({
      repoGroups: [{ name: 'Old custom group', repos: ['acme/gadgets'] }],
    }));
    sessionStorage.setItem('seeded-groups', '1');
  });
  await openBoard(page, { report: 'typical', query: ALL + '&repogroups=' });
  await page.getByRole('button', { name: /^Settings/ }).click();
  await expect(page.getByLabel('Repository groups', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Reset to defaults', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /^Settings/ }).click();
  await expect(page.getByLabel('Repository groups', { exact: true })).toHaveValue('');
});
