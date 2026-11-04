import { ALL, expect, openBoard, rows, test } from './helpers.ts';

const TOKEN_KEY = 'apihub-pr-board.token';

test.describe('several repositories', () => {
  test('DATA-20 DATA-21: equal numbers from two repositories are two rows', async ({ page, pageErrors }) => {
    await openBoard(page, { report: 'two-repos', query: ALL });
    await expect(page.locator('h1 .repo')).toHaveText('acme/widgets, acme/gadgets');
    await expect(rows(page)).toHaveCount(40);
    await expect(rows(page).filter({ has: page.getByRole('link', { name: '#101', exact: true }) })).toHaveCount(2);
    expect(pageErrors).toEqual([]);
  });

  test('DATA-20: the comments panel reads a PR from its own repository', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => { if (request.url().includes('/__dev/rest/')) requests.push(new URL(request.url()).pathname); });
    await openBoard(page, { report: 'two-repos', query: ALL + '&q=' + encodeURIComponent('repo:gadgets "version on connect"') });
    await expect(rows(page)).toHaveCount(1);
    await rows(page).first().locator('.comment-preview').click();
    // With two repositories, the PR is named with its repository (DATA-20).
    const panel = page.getByRole('dialog', { name: 'Comments on PR gadgets#101' });
    await expect(panel.locator('article')).toHaveCount(1);
    await expect(panel.locator('article')).toContainText('Tested on the gadget bench');
    expect(requests).toContain('/__dev/rest/repos/acme/gadgets/issues/101/comments');
  });

  test('DATA-18: Refresh reads every repository on the page', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await openBoard(page, { report: 'two-repos', refresh: 'ok', query: ALL });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    // The mixed board of acme/widgets and the four PRs of acme/gadgets.
    await expect(rows(page)).toHaveCount(84);
    await expect(page.locator('h1 .repo')).toHaveText('acme/widgets, acme/gadgets');
  });

  test('TABLE-26: one repository has no Repository column and no setting for it', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    await expect(page.locator('.board > thead > tr > th').first()).toHaveText('#');
    await page.getByRole('button', { name: /^Settings/ }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await expect(settings.getByRole('checkbox', { name: 'Author' })).toBeVisible();
    await expect(settings.getByRole('checkbox', { name: 'Repository' })).toHaveCount(0);
  });

  test('TABLE-26: with two repositories the Repository column comes first, sorts, and can be hidden', async ({ page }) => {
    await openBoard(page, { report: 'two-repos', query: ALL });
    const header = page.locator('.board > thead > tr > th').first();
    await expect(header).toHaveText('Repository');
    const firstCell = rows(page).first().locator('td').first();
    await header.getByRole('button').click();
    await expect(firstCell).toHaveText('gadgets');
    await expect(firstCell.getByRole('link')).toHaveAttribute('href', 'https://github.com/acme/gadgets');
    await expect(rows(page).first().getByRole('link', { name: '#107', exact: true })).toBeVisible();
    await header.getByRole('button').click();
    await expect(firstCell).toHaveText('widgets');
    await page.getByRole('button', { name: /^Settings/ }).click();
    await page.getByRole('dialog', { name: 'Settings' }).getByRole('checkbox', { name: 'Repository' }).uncheck();
    await expect(header).toHaveText('#');
  });

  test('TABLE-26 FILTER-17: the Repository column goes when the rows the groups let through come from one repository', async ({ page }) => {
    await openBoard(page, { report: 'two-repos', query: ALL + '&repogroups=Widgets:acme/widgets;Gadgets:acme/gadgets' });
    const first = page.locator('.board > thead > tr > th').first();
    await expect(first).toHaveText('Repository');
    await page.getByRole('button', { name: /^Repositories:/ }).click();
    await page.getByRole('group', { name: 'Repositories' }).getByRole('checkbox', { name: 'Widgets' }).uncheck();
    await expect(rows(page)).toHaveCount(4);
    await expect(first).toHaveText('#');
    // The search does not count, so a search that finds one repository keeps the column.
    await page.getByRole('group', { name: 'Repositories' }).getByRole('checkbox', { name: 'Widgets' }).check();
    await page.keyboard.press('Escape');
    await page.getByLabel('Search pull requests').fill('repo:gadgets');
    await expect(rows(page)).toHaveCount(4);
    await expect(first).toHaveText('Repository');
  });

  test('FILTER-14: repos in the address narrow the board, and Reset view and Copy link keep them', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openBoard(page, { report: 'two-repos', query: ALL + '&q=pairing&repos=acme/gadgets' });
    await expect(page.locator('h1 .repo')).toHaveText('acme/gadgets');
    await expect(rows(page)).toHaveCount(2);
    await expect(page.locator('.board > thead > tr > th').first()).toHaveText('#');
    await page.getByRole('button', { name: 'Reset view' }).click();
    await expect(page).toHaveURL(/\/\?repos=acme\/gadgets$/);
    await page.getByRole('button', { name: 'Copy link to this view' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\?repos=acme\/gadgets$/);
  });

  test('SET-16: the Repositories field writes the address, rejects a bad entry with the reason, and clears', async ({ page }) => {
    await openBoard(page, { report: 'two-repos', query: ALL });
    await page.getByRole('button', { name: /^Settings/ }).click();
    const field = page.getByRole('dialog', { name: 'Settings' }).getByRole('textbox', { name: 'Repositories' });
    await expect(field).toHaveAttribute('placeholder', 'acme/widgets, acme/gadgets');
    await field.fill('acme/widgets, gadgets');
    await field.press('Enter');
    await expect(page.getByRole('alert')).toHaveText('"gadgets" is not owner/name, such as acme/widgets.');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(page.url()).not.toContain('repos=');
    await field.fill('acme/gadgets  ACME/gadgets');
    await field.press('Enter');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(field).toHaveValue('acme/gadgets');
    await expect(page).toHaveURL(/[?&]repos=acme\/gadgets(&|$)/);
    await expect(rows(page)).toHaveCount(4);
    await field.fill('');
    await field.blur();
    await expect(rows(page)).toHaveCount(40);
    expect(page.url()).not.toContain('repos=');
  });

  test('SET-17: bots saved by an earlier version move into the address, and Reset to defaults removes both', async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem('apihub-pr-board.settings', JSON.stringify({ rules: { extraBots: ['acme-release-bot'] } }));
      sessionStorage.setItem('seeded', '1');
    });
    await openBoard(page, { report: 'two-repos', query: 'repos=acme/widgets' });
    await expect(page).toHaveURL(/\?repos=acme\/widgets&bots=acme-release-bot$/);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('apihub-pr-board.settings')!));
    expect(saved.rules.extraBots).toEqual([]);
    await page.reload();
    await expect(page).toHaveURL(/\?repos=acme\/widgets&bots=acme-release-bot$/);
    await page.getByRole('button', { name: /^Settings/ }).click();
    await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Reset to defaults' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('DATA-22: repositories missing from the snapshot get a banner, and Refresh with a token loads them', async ({ page }) => {
    await openBoard(page, { report: 'mixed', refresh: 'ok', query: ALL + '&repos=acme/widgets,acme/gadgets' });
    const banner = page.locator('.banner.warn');
    await expect(banner).toContainText('acme/gadgets is not in the snapshot. Add a GitHub token in Settings, then Refresh loads it.');
    await expect(rows(page)).toHaveCount(80);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.getByRole('dialog', { name: 'Add a GitHub token' }).getByLabel('Token').fill('mock-token');
    await page.getByRole('button', { name: 'Save and load' }).click();
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    await expect(rows(page)).toHaveCount(84);
    await expect(banner).toHaveCount(0);
  });

  test('DATA-22 SET-16: Refresh reads the repositories set in Settings, and live data names what it lacks', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await openBoard(page, { report: 'mixed', refresh: 'ok', query: ALL });
    await page.getByRole('button', { name: /^Settings/ }).click();
    const field = page.getByRole('dialog', { name: 'Settings' }).getByRole('textbox', { name: 'Repositories' });
    await field.fill('acme/gadgets');
    await field.press('Enter');
    const banner = page.locator('.banner.warn');
    await expect(banner).toHaveText('acme/gadgets is not in the snapshot. Refresh loads it.');
    await expect(page.getByText('No pull requests match this view')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    await expect(rows(page)).toHaveCount(4);
    await expect(banner).toHaveCount(0);
    await page.getByRole('button', { name: /^Settings/ }).click();
    await field.fill('acme/gadgets acme/widgets');
    await field.press('Enter');
    await expect(banner).toHaveText('acme/widgets is not in the live data. Refresh loads it.');
  });

  test('SET-19 FILTER-17: groups from Settings fill a Repositories menu that filters the rows', async ({ page }) => {
    await openBoard(page, { report: 'two-repos', query: ALL });
    await expect(page.getByRole('button', { name: /^Repositories:/ })).toHaveCount(0);
    await page.getByRole('button', { name: /^Settings/ }).click();
    const field = page.getByRole('dialog', { name: 'Settings' }).getByRole('textbox', { name: 'Repository groups' });
    await field.fill('Widgets: acme/widgets\nacme/gadgets');
    await field.blur();
    await expect(page.getByRole('alert')).toHaveText('Line 2: start with the group name and a colon, such as "Backend: acme/widgets".');
    await field.fill('Widgets: acme/widgets\n*Gadgets & Co: acme/gadgets');
    await field.press('Control+Enter');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.keyboard.press('Escape');

    // The default group is checked; the data and the repos in the address stay as they are.
    const button = page.getByRole('button', { name: /^Repositories:/ });
    await expect(button).toHaveText(/Repositories:\s*Gadgets & Co/);
    await expect(rows(page)).toHaveCount(4);
    expect(page.url()).not.toMatch(/[?&]groups=/);
    expect(page.url()).not.toContain('repos=');
    await button.click();
    const menu = page.getByRole('group', { name: 'Repositories' });
    await expect(menu.locator('label')).toHaveText([/Widgets\s*36/, /Gadgets & Co\s*4/]);
    await menu.getByRole('checkbox', { name: 'Widgets' }).check();
    await expect(rows(page)).toHaveCount(40);
    await expect(button).toHaveText(/Repositories:\s*All/);
    await expect(page).toHaveURL(/[?&]groups=Widgets%2CGadgets\+%26\+Co(&|$)/);
    await menu.getByRole('button', { name: 'None' }).click();
    await expect(page.getByText('No pull requests match this view')).toBeVisible();
    await expect(page).toHaveURL(/[?&]groups=(&|$)/);
    // Checking the default group again leaves the address clean.
    await menu.getByRole('checkbox', { name: 'Gadgets & Co' }).check();
    await expect(rows(page)).toHaveCount(4);
    expect(page.url()).not.toMatch(/[?&]groups=/);
    // The groups stay in this browser.
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('apihub-pr-board.settings')!).repoGroups);
    expect(stored).toEqual([{ name: 'Widgets', repos: ['acme/widgets'] }, { name: 'Gadgets & Co', repos: ['acme/gadgets'], isDefault: true }]);
  });

  test('FILTER-17: repositories in no group are under Ungrouped, and a link checks the groups it names', async ({ page }) => {
    await page.addInitScript((groups) => localStorage.setItem('apihub-pr-board.settings', JSON.stringify({ repoGroups: groups })), [
      { name: 'Gadgets', repos: ['acme/gadgets'] },
    ]);
    await openBoard(page, { report: 'two-repos', query: ALL + '&groups=ungrouped' });
    const button = page.getByRole('button', { name: /^Repositories:/ });
    await expect(button).toHaveText(/Repositories:\s*Ungrouped/);
    await expect(rows(page)).toHaveCount(36);
    // The tiles count only what the groups show.
    await expect(page.getByRole('button', { name: /Open PRs/ })).toContainText('36');
    await button.click();
    const menu = page.getByRole('group', { name: 'Repositories' });
    await menu.getByRole('checkbox', { name: 'Ungrouped' }).uncheck();
    await menu.getByRole('checkbox', { name: 'Gadgets' }).check();
    await expect(rows(page)).toHaveCount(4);
    await expect(page).toHaveURL(/[?&]groups=Gadgets(&|$)/);
  });

  test('DATA-18: without repos in the address, Refresh reads only the repositories of the checked groups', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await page.addInitScript((groups) => localStorage.setItem('apihub-pr-board.settings', JSON.stringify({ repoGroups: groups })), [
      { name: 'Widgets', repos: ['acme/widgets'] },
      { name: 'Gadgets', repos: ['acme/gadgets'], isDefault: true },
    ]);
    await openBoard(page, { report: 'mixed', refresh: 'ok', query: ALL });
    const banner = page.locator('.banner.warn');
    await expect(banner).toHaveText('acme/gadgets is not in the snapshot. Refresh loads it.');
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    await expect(banner).toHaveCount(0);
    await expect(rows(page)).toHaveCount(4);
    expect(page.url()).not.toContain('repos=');
  });

  test('DATA-18: a reason Refresh cannot start shows on Refresh and goes once the reason does', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await openBoard(page, { report: 'two-repos', refresh: 'ok', query: ALL + '&groups=&repogroups=Gadgets:acme/gadgets;Widgets:acme/widgets' });
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    const reason = page.getByRole('alert');
    await expect(reason).toHaveText('Check a repository group in the Repositories menu first.');
    await expect(reason).toHaveClass(/\bwarn\b/);
    await page.getByRole('button', { name: /^Repositories:/ }).click();
    const gadgets = page.getByRole('group', { name: 'Repositories' }).getByRole('checkbox', { name: 'Gadgets' });
    await gadgets.check();
    await expect(reason).toHaveCount(0);
    // The reason comes back, but nobody asked for Refresh since, so it waits for the next one.
    await gadgets.uncheck();
    await page.clock.runFor(500);
    await expect(reason).toHaveCount(0);
  });

  test('DATA-18: groups with more than 40 repositories stop Refresh with the reason', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    const many = (prefix: string) => Array.from({ length: 21 }, (_, i) => 'acme/' + prefix + i);
    await page.addInitScript((groups) => localStorage.setItem('apihub-pr-board.settings', JSON.stringify({ repoGroups: groups })), [
      { name: 'Left', repos: many('l') },
      { name: 'Right', repos: many('r') },
    ]);
    await openBoard(page, { report: 'two-repos', refresh: 'ok', query: ALL });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    // Ungrouped is checked too and adds the two repositories of the data in no group.
    await expect(page.getByRole('alert')).toHaveText('The checked groups name 44 repositories; the board reads at most 40.'
      + ' Uncheck a group in the Repositories menu.');
  });

  test('FILTER-14 SET-19: a link with repository groups fills the menu without replacing the saved groups', async ({ page }) => {
    const savedGroups = () => page.evaluate(() => JSON.parse(localStorage.getItem('apihub-pr-board.settings') || '{}').repoGroups);
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem('apihub-pr-board.settings', JSON.stringify({ repoGroups: [{ name: 'Mine', repos: ['acme/widgets'] }] }));
      sessionStorage.setItem('seeded', '1');
    });
    await openBoard(page, { report: 'two-repos', query: ALL + '&repogroups=Widgets:acme/widgets;*Gadgets%20%26%20Co:acme/gadgets' });
    const button = page.getByRole('button', { name: /^Repositories:/ });
    await expect(button).toHaveText(/Repositories:\s*Gadgets & Co/);
    await expect(rows(page)).toHaveCount(4);
    // Another setting changes; the saved groups stay the viewer's own.
    await page.getByRole('button', { name: /^Settings/ }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('checkbox', { name: 'Author' }).uncheck();
    expect(await savedGroups()).toEqual([{ name: 'Mine', repos: ['acme/widgets'] }]);
    // Editing the groups saves the edit and puts it in the address.
    const field = settings.getByRole('textbox', { name: 'Repository groups' });
    await field.fill('Gadgets: acme/gadgets');
    await field.press('Control+Enter');
    await expect(page).toHaveURL(/[?&]repogroups=Gadgets:acme\/gadgets(&|$)/);
    expect(await savedGroups()).toEqual([{ name: 'Gadgets', repos: ['acme/gadgets'] }]);
    // Without groups in the link, the saved ones apply and go into the address.
    await page.goto('/?' + ALL);
    await expect(page).toHaveURL(/[?&]repogroups=Gadgets:acme\/gadgets(&|$)/);
  });

  test('TABLE-31: repository names and menu entries take the tint of their group, and a repository in no group has none', async ({ page }) => {
    await openBoard(page, { report: 'two-repos', query: ALL + '&repogroups=Gadgets:acme/gadgets' });
    const names = page.locator('td.c-repo a');
    const tinted = names.filter({ hasText: 'gadgets' });
    await expect(tinted).toHaveCount(4);
    for (const name of await tinted.all()) await expect(name).toHaveAttribute('style', /var\(--group-0\)/);
    await expect(names.filter({ hasText: 'widgets' }).first()).not.toHaveAttribute('style', /--group-/);
    await expect(rows(page).first()).not.toHaveAttribute('style', /--group-/);
    await page.getByRole('button', { name: /^Repositories:/ }).click();
    const menu = page.getByRole('group', { name: 'Repositories' });
    await expect(menu.locator('label').filter({ hasText: 'Gadgets' })).toHaveAttribute('style', /var\(--group-0\)/);
    await expect(menu.locator('label').filter({ hasText: 'Ungrouped' })).not.toHaveAttribute('style', /--group-/);
  });

  test('DATA-18 FILTER-17: Refresh with Ungrouped checked reads the repositories in no group too', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await openBoard(page, { report: 'two-repos', refresh: 'ok', query: ALL + '&repogroups=Gadgets:acme/gadgets' });
    const button = page.getByRole('button', { name: /^Repositories:/ });
    await expect(button).toHaveText(/Repositories:\s*All/);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    // The mixed board of acme/widgets, which is in no group, and the four PRs of acme/gadgets.
    await expect(rows(page)).toHaveCount(84);
    await button.click();
    await expect(page.getByRole('group', { name: 'Repositories' }).getByRole('checkbox', { name: 'Ungrouped' })).toBeChecked();
  });

  test('FILTER-17 DATA-23: with no group checked nothing loads, and unchecking a group loads nothing new', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    const loads: string[] = [];
    page.on('request', (request) => { if (request.url().includes('/__dev/graphql')) loads.push(request.url()); });
    await openBoard(page, { report: 'missing', refresh: 'ok', query: ALL + '&groups=&repogroups=Widgets:acme/widgets;Gadgets:acme/gadgets' });
    await expect(page.getByText('No repository group is checked')).toBeVisible();
    expect(loads).toEqual([]);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Check a repository group in the Repositories menu first.');

    const button = page.getByRole('button', { name: /^Repositories:/ });
    await button.click();
    const menu = page.getByRole('group', { name: 'Repositories' });
    await menu.getByRole('button', { name: 'All' }).click();
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    await expect(rows(page)).toHaveCount(84);
    const afterLoad = loads.length;
    await menu.getByRole('checkbox', { name: 'Widgets' }).uncheck();
    await expect(rows(page)).toHaveCount(4);
    expect(loads.length).toBe(afterLoad);
  });
});

