import type { Page } from '@playwright/test';
import { ALL, expect, openBoard, test } from './helpers.ts';

const TOKEN_KEY = 'apihub-pr-board.token';

// Puts a token into the browser before the page loads; the mock accepts any token.
async function withToken(page: Page) {
  await page.addInitScript((key) => localStorage.setItem(key, 'mock-token'), TOKEN_KEY);
}

async function refresh(page: Page, scenario: string) {
  await withToken(page);
  await openBoard(page, { report: 'typical', refresh: scenario, query: ALL });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
}

test.describe('Refresh', () => {
  test('DATA-6 SET-13: Refresh without a token asks for one, then loads live data', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    const tokenField = page.getByRole('dialog', { name: 'Add a GitHub token' }).getByLabel('Token');
    await expect(tokenField).toBeFocused();
    await tokenField.fill('mock-token');
    await page.getByRole('button', { name: 'Save and load' }).click();
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    await expect(page.locator('.source-button')).toHaveClass(/\blive\b/);
    await expect(page.locator('.board > tbody > tr')).toHaveCount(80);
  });

  test('DATA-6: a saved token refreshes at once and reads all pages', async ({ page }) => {
    await refresh(page, 'paginated');
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    await expect(page.locator('.board > tbody > tr')).toHaveCount(80);
  });

  test('DATA-7: Refresh is disabled while it runs', async ({ page }) => {
    await refresh(page, 'slow');
    const button = page.getByRole('button', { name: 'Refreshing…' });
    await expect(button).toBeDisabled();
    await expect(page.locator('.source-button')).toHaveText('live, just now', { timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  });

  test('DATA-14: forbidden projects load with a warning', async ({ page }) => {
    await refresh(page, 'projects-error');
    await expect(page.locator('.banner.warn')).toContainText('Project membership is unavailable for this token');
  });

  test('DATA-15: fewer PRs than totalCount give a warning', async ({ page }) => {
    await refresh(page, 'count-mismatch');
    await expect(page.locator('.banner.warn')).toContainText('GitHub reported 39 open pull requests but returned 36.');
  });

  for (const [scenario, message] of [
    ['unauthorized', 'GitHub rejected the token.'],
    ['server-error', 'GitHub API returned HTTP 502'],
    ['repo-not-found', 'GitHub GraphQL error at repository'],
    ['network', 'Cannot reach api.github.com'],
  ]) {
    test(`DATA-13 TABLE-3: ${scenario} fails with a readable message and keeps the data`, async ({ page }) => {
      await refresh(page, scenario);
      await expect(page.locator('.banner.bad')).toContainText('Refresh failed. ' + message);
      await expect(page.locator('.source-button')).toHaveText('updated just now');
      await expect(page.locator('.board > tbody > tr')).toHaveCount(36);
    });
  }

  test('DATA-8: hidden CI and Last comment columns drop their parts of the query', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('apihub-pr-board.settings', JSON.stringify({ hiddenColumns: ['ci', 'comment'] })));
    const sent: Record<string, unknown>[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/__dev/graphql')) sent.push(JSON.parse(request.postData() || '{}').variables);
    });
    await refresh(page, 'ok');
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.every((v) => v.withChecks === false && v.withComments === false)).toBe(true);
  });

  test('DATA-6 DATA-4: live data from Refresh is not replaced by a snapshot that arrives later', async ({ page }) => {
    await withToken(page);
    await page.request.post('/__dev/state', { data: { report: 'slow', refresh: 'ok' } });
    await page.goto('/?' + ALL);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    // The slow snapshot answers after 3 seconds; the live data must still be on the page after that.
    await page.waitForResponse((response) => response.url().endsWith('/prs.json'));
    await page.waitForTimeout(300);
    await expect(page.locator('.source-button')).toHaveText('live, just now');
  });

  test('DATA-6: rows stay while Refresh runs, and the table keeps its scroll position when the new data arrives', async ({ page }) => {
    await refresh(page, 'slow');
    await expect(page.getByRole('button', { name: 'Refreshing…' })).toBeVisible();
    const wrap = page.locator('.table-wrap');
    await wrap.evaluate((element) => { element.scrollTop = 600; });
    await expect(page.locator('.board > tbody > tr')).toHaveCount(36);
    await expect(page.locator('.board .spinner')).toHaveCount(0);
    await expect(page.locator('.source-button')).toHaveText('live, just now', { timeout: 10_000 });
    await expect(page.locator('.board > tbody > tr')).toHaveCount(80);
    expect(await wrap.evaluate((element) => element.scrollTop)).toBe(600);
  });

  test('DATA-26 RULE-12 TABLE-29 FILTER-18: live data names the viewer, marks the PRs that wait for their review, and counts them', async ({ page }) => {
    await withToken(page);
    await openBoard(page, { report: 'mixed', refresh: 'ok', query: ALL });
    // The snapshot names no viewer, so the tile is not there yet.
    const tile = page.getByRole('group', { name: 'Quick filters' }).getByRole('button', { name: /Review requested/ });
    await expect(tile).toHaveCount(0);
    await expect(page.locator('.review-wrap .mine')).toHaveCount(0);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.source-button')).toHaveText('live, just now');

    const marked = await page.locator('.review-wrap .mine').count();
    const again = await page.locator('.review-wrap .mine.again').count();
    expect(again).toBeGreaterThan(0);
    await expect(tile.locator('.count')).toHaveText(String(marked));
    await expect(tile).toContainText(again + ' again');
    const row = page.locator('.board > tbody > tr').filter({ hasText: 'validate package names on import' });
    await expect(row.getByRole('img', { name: 'Your review is requested again: you reviewed this PR before' })).toBeVisible();
    await expect(row.locator('.mine')).toHaveAttribute('title', 'Your review is requested again: you reviewed this PR before');
    await tile.click();
    await expect(page.locator('.board > tbody > tr')).toHaveCount(marked);
    await page.getByRole('searchbox').fill('review:again');
    await expect(page.locator('.board > tbody > tr')).toHaveCount(again);
    // The token owner shows at the top right, as on GitHub.
    await expect(page.locator('.viewer-badge')).toHaveText(/boris-k/);
    await expect(page.locator('.viewer-badge')).toHaveAttribute('href', 'https://github.com/boris-k');
  });

  test('FILTER-18: a link with the Review requested filter shows every PR until the viewer is known, and keeps the filter', async ({ page }) => {
    await openBoard(page, { report: 'typical', query: ALL + '&quick=mine' });
    await expect(page.locator('.board > tbody > tr')).toHaveCount(36);
    await expect(page).toHaveURL(/[?&]quick=mine(&|$)/);
    // Another tile adds its filter and leaves the waiting one in the address.
    await page.getByRole('group', { name: 'Quick filters' }).getByRole('button', { name: /CI failing/ }).click();
    await expect(page).toHaveURL(/[?&]quick=(ci%2Cmine|mine%2Cci)(&|$)/);
  });
});

test.describe('reviewers list', () => {
  test('SET-20 TABLE-30: the Review column lists the reviewers, a long list folds, and the viewer whose review is due stands out', async ({ page }) => {
    await withToken(page);
    // A Review width dragged for the code layout does not carry over to the list.
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) localStorage.setItem('apihub-pr-board.columns', JSON.stringify({ review: 90 }));
      sessionStorage.setItem('seeded', '1');
    });
    await openBoard(page, { report: 'mixed', refresh: 'ok', query: ALL + '&q=' + encodeURIComponent('publish packages in batches') });
    await page.getByRole('button', { name: /^Settings/ }).click();
    await page.getByRole('group', { name: 'Review column' }).getByRole('button', { name: 'Reviewers' }).click();
    await page.keyboard.press('Escape');
    const row = page.locator('.board > tbody > tr').first();
    const list = row.getByRole('list', { name: 'Reviewers of PR #9408' });
    const reviewHeader = page.locator('.board > thead th').filter({ hasText: /^Review/ });
    expect(Math.round((await reviewHeader.boundingBox())!.width)).toBe(180);
    // Ten lines: the first three show, the rest wait behind a button.
    await expect(list.getByRole('listitem')).toHaveCount(3);
    await expect(list.getByRole('listitem').filter({ hasText: 'farah-ui' }).getByRole('img', { name: 'awaiting review' })).toBeVisible();
    // The name starts with the visible text and says what it opens.
    const more = row.getByRole('button', { name: /^\+7 more\W+all 10 reviewers of PR #9408$/ });
    await expect(more).toBeVisible();
    await expect(row.locator('.reviewer.due')).toHaveCount(0);

    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.source-button')).toHaveText('live, just now');
    // Requested changes come first; the viewer's own request leads the reviews not given yet and stands out.
    await expect(list.getByRole('listitem').first().getByRole('img', { name: 'requested changes' })).toBeVisible();
    const mine = list.getByRole('listitem').nth(1);
    await expect(mine).toHaveClass(/\bdue\b/);
    await expect(mine).toHaveText('boris-k (you)');
    await expect(mine.getByRole('img', { name: 'awaiting review' })).toBeVisible();
    await more.click();
    const all = page.getByRole('dialog', { name: 'All reviewers of PR #9408' });
    await expect(all.getByRole('listitem')).toHaveCount(10);
    for (const [who, state] of [['dara-ops', 'requested changes'], ['chen-li', 'approved'], ['gleb-be', 'review dismissed'], ['@widgets-backend', 'awaiting review']]) {
      await expect(all.getByRole('listitem').filter({ hasText: who }).getByRole('img', { name: state })).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(all).toHaveCount(0);
    // The code view comes back from Settings.
    await page.getByRole('button', { name: /^Settings/ }).click();
    await page.getByRole('group', { name: 'Review column' }).getByRole('button', { name: 'Code' }).click();
    await expect(row.locator('.review-wrap > button')).toBeVisible();
  });
});
