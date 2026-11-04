import { ALL, expect, MOCK_NOW, openBoard, rows, test } from './helpers.ts';

const TOKEN_KEY = 'apihub-pr-board.token';
const MINUTE_MS = 60 * 1000;

test.describe('loading prs.json', () => {
  test('DATA-4 TABLE-2: the snapshot opens with a gray dot and its age', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    await expect(page.locator('.board > tbody > tr')).toHaveCount(36);
    const source = page.locator('.source-button');
    await expect(source).toHaveText('updated just now');
    await expect(source).not.toHaveClass(/\blive\b/);
  });

  test('TABLE-2: an old snapshot shows its age', async ({ page }) => {
    await openBoard(page, { report: 'stale', query: ALL });
    await expect(page.locator('.source-button')).toHaveText('updated 3 days ago');
  });

  test('DATA-9: the corner cases render, one row each', async ({ page }) => {
    await openBoard(page, { report: 'corner', query: ALL });
    await expect(page.locator('.board > tbody > tr')).toHaveCount(44);
    await expect(page.locator('.board .example-note').first()).toBeVisible();
  });

  test('QUAL-8: 300 PRs render', async ({ page }) => {
    await openBoard(page, { report: 'many', query: ALL });
    await expect(page.locator('.board > tbody > tr')).toHaveCount(300);
  });

  test('TABLE-20: an empty board says so and offers Reset view', async ({ page }) => {
    await openBoard(page, { report: 'empty' });
    await expect(page.getByText('No pull requests match this view')).toBeVisible();
    await expect(page.locator('.empty').getByRole('button', { name: 'Reset view' })).toBeVisible();
  });

  test('TABLE-19: a slow prs.json shows the loading row with a spinner first', async ({ page }) => {
    await page.request.post('/__dev/state', { data: { report: 'slow', refresh: 'ok' } });
    await page.goto('/');
    await expect(page.locator('.board').getByRole('status')).toHaveText('Loading pull requests…');
    await expect(page.locator('.board .spinner')).toBeVisible();
    await expect(page.getByText('Loading pull requests…')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('.board > tbody > tr').first()).toBeVisible();
  });

  test('DATA-14 TABLE-3: forbidden project data loads with a warning', async ({ page }) => {
    await openBoard(page, { report: 'projects-unavailable', query: ALL });
    await expect(page.locator('.banner.warn')).toContainText('Project membership is unavailable for this token');
    await expect(page.locator('.board > tbody > tr')).toHaveCount(36);
  });

  for (const [report, reason] of [
    ['broken', 'JSON'],
    ['wrong-shape', 'the file has no list of pull requests'],
  ]) {
    test(`DATA-5 DATA-16: ${report} prs.json says why and suggests Refresh`, async ({ page }) => {
      await openBoard(page, { report });
      const banner = page.locator('.banner.bad');
      await expect(banner).toContainText('Cannot load prs.json (');
      await expect(banner).toContainText(reason);
      await expect(banner).toContainText('Use Refresh with a token to load live data.');
    });
  }

  test('DATA-16 DATA-23: without prs.json and without repositories, the table says how to choose them', async ({ page }) => {
    await openBoard(page, { report: 'missing' });
    await expect(page.locator('.banner.bad')).toHaveCount(0);
    await expect(page.getByText('Choose the repositories to show')).toBeVisible();
    await expect(page.locator('.board > tbody')).toContainText('Add them in Settings, or open a link with ?repos=owner/name.');
  });

  test('DATA-23: without prs.json and without a token, a banner names the repositories and asks for a token', async ({ page }) => {
    await openBoard(page, { report: 'missing', query: 'repos=acme/gadgets' });
    await expect(page.locator('.banner.bad')).toHaveCount(0);
    await expect(page.locator('.banner.warn')).toContainText('acme/gadgets is not loaded yet. Add a GitHub token in Settings, then Refresh loads it.');
    await expect(page.getByText('No pull requests loaded yet')).toBeVisible();
  });

  test('DATA-23: without prs.json, a saved token and a link load the board by themselves, and new repositories load too', async ({ page }) => {
    let graphqlCalls = 0;
    page.on('request', (request) => { if (request.url().endsWith('/__dev/graphql')) graphqlCalls += 1; });
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await openBoard(page, { report: 'missing', refresh: 'ok', query: ALL + '&repos=acme/gadgets' });
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    await expect(rows(page)).toHaveCount(4);
    await expect(page.locator('.banner')).toHaveCount(0);
    await page.getByRole('button', { name: /^Settings/ }).click();
    const field = page.getByRole('dialog', { name: 'Settings' }).getByRole('textbox', { name: 'Repositories' });
    await field.fill('acme/gadgets acme/widgets');
    await field.press('Enter');
    await expect(rows(page)).toHaveCount(84);
    // One query a page and repository: gadgets, then widgets (80 PRs, four pages of 20) and gadgets. Nothing after that.
    expect(graphqlCalls).toBe(6);
    await page.waitForTimeout(1000);
    expect(graphqlCalls).toBe(6);
  });

  test('DATA-23: a repository that cannot be read is loaded once, not again and again', async ({ page }) => {
    let graphqlCalls = 0;
    page.on('request', (request) => { if (request.url().endsWith('/__dev/graphql')) graphqlCalls += 1; });
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await openBoard(page, { report: 'missing', refresh: 'ok', query: 'repos=acme/nowhere' });
    await expect(page.locator('.banner.bad')).toContainText('Refresh failed.');
    await page.waitForTimeout(1000);
    expect(graphqlCalls).toBe(1);
  });

  test('SET-18: without a token, a dialog explains how to create one; Not now and Escape close it until a reload', async ({ page }) => {
    await openBoard(page, { report: 'missing', query: 'repos=acme/gadgets' });
    const dialog = page.getByRole('dialog', { name: 'Add a GitHub token' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Create a fine-grained token' }))
      .toHaveAttribute('href', 'https://github.com/settings/personal-access-tokens/new');
    await expect(dialog).toContainText('Public repositories (read-only)');
    await expect(dialog).toContainText('github_pat_');
    await expect(dialog.getByLabel('Token')).toHaveAttribute('type', 'password');
    await expect(dialog.locator('form')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Not now' }).click();
    await expect(dialog).toHaveCount(0);
    // It stays closed when the repositories change, here from one to two.
    await page.getByRole('button', { name: /^Settings/ }).click();
    const field = page.getByRole('dialog', { name: 'Settings' }).getByRole('textbox', { name: 'Repositories' });
    await field.fill('acme/widgets acme/gadgets');
    await field.press('Enter');
    await expect(page).toHaveURL(/repos=acme\/widgets,acme\/gadgets/);
    await expect(dialog).toHaveCount(0);
    await page.keyboard.press('Escape');
    const addToken = page.locator('.banner.warn').getByRole('button', { name: 'Add token' });
    await addToken.click();
    await expect(dialog).toBeVisible();
    // Focus starts in the token field, stays in the dialog, and comes back to the button that opened it.
    await expect(dialog.getByLabel('Token')).toBeFocused();
    for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    // Shift+Tab from the first stop, the link, wraps to the last.
    await dialog.getByRole('link', { name: 'Create a fine-grained token' }).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Not now' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(addToken).toBeFocused();
  });

  test('SET-18 DATA-23: Save and load in the dialog stores the token and loads the board once', async ({ page }) => {
    let loads = 0;
    page.on('request', (request) => { if (request.url().endsWith('/__dev/graphql')) loads += 1; });
    await openBoard(page, { report: 'missing', refresh: 'ok', query: ALL + '&repos=acme/gadgets' });
    const dialog = page.getByRole('dialog', { name: 'Add a GitHub token' });
    const save = dialog.getByRole('button', { name: 'Save and load' });
    await expect(save).toBeDisabled();
    await dialog.getByLabel('Token').fill('mock-token');
    await dialog.getByLabel('Token').press('Enter');
    await expect(dialog).toHaveCount(0);
    // It opened by itself, so focus goes to the Settings button.
    await expect(page.getByRole('button', { name: /^Settings/ })).toBeFocused();
    await expect(rows(page)).toHaveCount(4);
    expect(await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY)).toBe('mock-token');
    // The automatic load knows this load ran, so it does not read the same repositories again.
    await page.clock.runFor(2000);
    expect(loads).toBe(1);
  });

  test('SET-18: forgetting the token in Settings does not open the token dialog', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await openBoard(page, { report: 'missing', refresh: 'ok', query: ALL + '&repos=acme/gadgets' });
    await expect(rows(page)).toHaveCount(4);
    await page.getByRole('button', { name: /^Settings/ }).click();
    await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Forget token' }).click();
    await page.clock.runFor(1000);
    await expect(page.getByRole('dialog', { name: 'Add a GitHub token' })).toHaveCount(0);
  });

  test('TABLE-19 QUAL-5: an empty table shows the spinner while a load without a snapshot runs, still with reduced motion', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await page.request.post('/__dev/state', { data: { report: 'missing', refresh: 'slow' } });
    await page.goto('/?repos=acme/gadgets');
    const spinner = page.locator('.board .spinner');
    await expect(page.locator('.board .load-headline')).toHaveText('Reading acme/gadgets: starting');
    await expect(spinner).toHaveCSS('animation-name', 'spin');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(spinner).toHaveCSS('animation-name', 'none');
    await expect(spinner).toHaveCount(0, { timeout: 10_000 });
  });

  test('DATA-24 PANEL-8: live data loads again every 5 minutes while the tab is visible, and a hidden tab waits', async ({ page }) => {
    let loads = 0;
    page.on('request', (request) => { if (request.url().endsWith('/__dev/graphql')) loads += 1; });
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await openBoard(page, { report: 'missing', refresh: 'ok', query: 'repos=acme/gadgets' });
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    expect(loads).toBe(1);
    await page.locator('.source-button').click();
    await expect(page.getByRole('dialog', { name: 'Data source' })).toContainText('It loads again every 5 minutes while this tab is visible.');
    await page.keyboard.press('Escape');

    await page.clock.runFor(4 * MINUTE_MS);
    expect(loads).toBe(1);
    await page.clock.runFor(MINUTE_MS);
    await expect.poll(() => loads).toBe(2);

    // Hidden: the countdown stops.
    const setVisibility = (state: string) => page.evaluate((value) => {
      Object.defineProperty(document, 'visibilityState', { value, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
    await setVisibility('hidden');
    await page.clock.runFor(10 * MINUTE_MS);
    expect(loads).toBe(2);
    // Back after more than 5 minutes: it loads at once.
    await page.clock.setFixedTime(Date.parse(MOCK_NOW) + 11 * MINUTE_MS);
    await setVisibility('visible');
    await expect.poll(() => loads).toBe(3);
  });

  test('SET-22 DATA-24 PANEL-8: Settings sets how often live data loads again, or turns it off', async ({ page }) => {
    let loads = 0;
    page.on('request', (request) => { if (request.url().endsWith('/__dev/graphql')) loads += 1; });
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await openBoard(page, { report: 'missing', refresh: 'ok', query: 'repos=acme/gadgets' });
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    expect(loads).toBe(1);

    await page.getByRole('button', { name: /^Settings/ }).click();
    const interval = page.getByRole('group', { name: 'Load live data again' });
    await expect(interval.getByRole('button', { name: '5 min' })).toHaveAttribute('aria-pressed', 'true');
    await interval.getByRole('button', { name: '2 min' }).click();
    await page.keyboard.press('Escape');
    await page.clock.runFor(2 * MINUTE_MS);
    await expect.poll(() => loads).toBe(2);
    await page.locator('.source-button').click();
    await expect(page.getByRole('dialog', { name: 'Data source' })).toContainText('It loads again every 2 minutes while this tab is visible.');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^Settings/ }).click();
    await interval.getByRole('button', { name: 'Off' }).click();
    await page.keyboard.press('Escape');
    await page.clock.runFor(31 * MINUTE_MS);
    expect(loads).toBe(2);
    await page.locator('.source-button').click();
    await expect(page.getByRole('dialog', { name: 'Data source' })).toContainText('It loads again only on Refresh; automatic loads are off in Settings.');
    // The choice stays in this browser.
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('apihub-pr-board.settings')!).refreshMinutes);
    expect(saved).toBe(0);
  });

  test('DATA-24: a snapshot is not replaced on its own', async ({ page }) => {
    let loads = 0;
    page.on('request', (request) => { if (request.url().endsWith('/__dev/graphql')) loads += 1; });
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await openBoard(page, { report: 'typical' });
    await page.clock.runFor(11 * MINUTE_MS);
    expect(loads).toBe(0);
    await expect(page.locator('.source-button')).not.toHaveClass(/\blive\b/);
  });

  test('DATA-27: a live load says what it reads and how long it takes, then sums up and goes', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await page.request.post('/__dev/state', { data: { report: 'missing', refresh: 'paced' } });
    await page.goto('/?' + ALL + '&repos=acme/widgets,acme/gadgets');
    // In the empty table: the spinner, the step, each repository being read, and the clock.
    const inTable = page.locator('.board .load-status');
    await expect(inTable.locator('.spinner')).toBeVisible();
    // A screen reader hears that the load started, not each step.
    await expect(page.locator('.load-announcer')).toHaveText('Loading pull requests from GitHub');
    await expect(inTable.locator('.load-headline')).toHaveText(/^Reading repositories: \d of 2 done, \d+ pull requests so far$/);
    await expect(inTable.locator('.load-lines li').first()).toHaveText(/^acme\/(widgets|gadgets): (starting|\d+ of \d+ pull requests)$/);
    await page.clock.setFixedTime(Date.parse(MOCK_NOW) + 2500);
    await expect(inTable.locator('.elapsed')).toHaveText('2.5 s');
    // Then a summary in the corner over the rows, gone after a few seconds.
    const summary = page.locator('.load-status.floating.finished');
    await expect(summary).toHaveText(/^✓Loaded 84 pull requests from 2 repositories\s*in 2\.5 s$/, { timeout: 10_000 });
    await expect(page.locator('.load-announcer')).toHaveText('Loaded 84 pull requests from 2 repositories in 2.5 s');
    await expect(rows(page)).toHaveCount(84);
    await expect(summary).toHaveCount(0, { timeout: 8000 });
  });

  test('DATA-27: Refresh over a full table shows its status in a corner and leaves the rows in place', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
    await openBoard(page, { report: 'typical', refresh: 'paced', query: ALL });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    const corner = page.locator('.load-status.floating');
    await expect(corner.locator('.load-headline')).toHaveText(/^Reading acme\/widgets: (starting|\d+ of \d+ pull requests)$/);
    await expect(rows(page)).toHaveCount(36);
    await expect(corner).toHaveClass(/(^| )finished( |$)/, { timeout: 10_000 });
  });
});
