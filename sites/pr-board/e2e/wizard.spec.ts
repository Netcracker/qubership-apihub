import { ALL, expect, firstVisit, openBoard, test } from './helpers.ts';

test.describe('setup wizard', () => {
  test('SET-21: a first visit offers the wizard in a card, each choice applies at once with a picture, and Done closes it', async ({ page }) => {
    await firstVisit(page);
    await openBoard(page, { report: 'typical', query: ALL });
    const wizard = page.getByRole('dialog', { name: 'Set up your board' });
    // The board shows first; the wizard waits behind a small card.
    await expect(wizard).toHaveCount(0);
    const invite = page.getByRole('complementary', { name: 'New here?' });
    await expect(invite).toContainText('Take a short tour');
    await invite.getByRole('button', { name: 'Take the tour' }).click();
    await expect(invite).toHaveCount(0);
    await expect(wizard).toContainText('Step 1 of 5');
    const themes = wizard.getByRole('group', { name: 'Theme' });
    await expect(themes.getByRole('button')).toHaveCount(3);
    for (const [name, hint] of [['System', 'Follows the light or dark setting of your system.'], ['Light', 'Dark text on a light background.'],
      ['Dark', 'Light text on a dark background.']]) {
      await expect(themes.getByRole('button', { name, exact: true })).toHaveAccessibleDescription(hint);
    }
    await expect(themes.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
    // Focus starts on the card picked, and Tab stays in the wizard.
    await expect(themes.getByRole('button', { name: 'System' })).toBeFocused();
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
    expect(await wizard.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    // A click outside does not close it.
    await page.mouse.click(5, 5);
    await expect(wizard).toBeVisible();
    // System shows the light and the dark board together; Light and Dark show their own.
    await expect(themes.locator('.theme-light')).toHaveCount(2);
    await expect(themes.locator('.theme-dark')).toHaveCount(2);
    await themes.getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(themes.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');

    await wizard.getByRole('button', { name: 'Next' }).click();
    await expect(wizard).toContainText('Step 2 of 5');
    const density = wizard.getByRole('group', { name: 'Row density' });
    // The next pictures draw in the theme just picked.
    await expect(density.locator('.theme-light')).toHaveCount(0);
    await density.getByRole('button', { name: 'Compact' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');

    await wizard.getByRole('button', { name: 'Next' }).click();
    await wizard.getByRole('group', { name: 'Review column' }).getByRole('button', { name: 'Reviewers' }).click();
    await expect(page.locator('.board .reviewers-wrap').first()).toBeAttached();
    await wizard.getByRole('button', { name: 'Back' }).click();
    await expect(wizard).toContainText('Step 2 of 5');
    await wizard.getByRole('button', { name: 'Next' }).click();

    // SET-25: the Reviewers order step offers three ready orders, each with the list it gives.
    await wizard.getByRole('button', { name: 'Next' }).click();
    await expect(wizard).toContainText('Step 4 of 5');
    const reviewerOrder = wizard.getByRole('group', { name: 'Reviewers order' });
    await expect(reviewerOrder.getByRole('button', { name: 'Changes first' })).toHaveAttribute('aria-pressed', 'true');
    await expect(reviewerOrder.getByRole('button', { name: 'Approvals first' }).locator('.vp-login').first()).toHaveText('anna-dev');
    await reviewerOrder.getByRole('button', { name: 'Approvals first' }).click();
    await expect(page.locator('.board .reviewers').first().getByRole('listitem').first().getByRole('img', { name: 'approved' })).toBeVisible();

    // SET-23: the Labels step shows the rows with and without labels, and Hide takes them off the table.
    await wizard.getByRole('button', { name: 'Next' }).click();
    await expect(wizard).toContainText('Step 5 of 5');
    const labels = wizard.getByRole('group', { name: 'Labels' });
    await expect(labels.getByRole('button', { name: 'Show' }).locator('.vp-label').first()).toBeAttached();
    await expect(labels.getByRole('button', { name: 'Hide' }).locator('.vp-label')).toHaveCount(0);
    await expect(page.locator('.board .label-chip').first()).toBeAttached();
    await labels.getByRole('button', { name: 'Hide' }).click();
    await expect(page.locator('.board .label-chip')).toHaveCount(0);
    await wizard.getByRole('button', { name: 'Done' }).click();
    await expect(wizard).toHaveCount(0);

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('apihub-pr-board.settings')!));
    expect([saved.theme, saved.density, saved.reviewColumn, saved.reviewerOrder[0], saved.showLabels]).toEqual(['dark', 'compact', 'list', 'approved', false]);
    await page.reload();
    await expect(page.locator('.board > tbody > tr').first()).toBeVisible();
    await expect(wizard).toHaveCount(0);
    await expect(invite).toHaveCount(0);
    // Settings opens it again; Escape closes it.
    await page.getByRole('button', { name: /^Settings/ }).click();
    await page.getByRole('button', { name: 'Setup wizard' }).click();
    await expect(wizard).toContainText('Step 1 of 5');
    await expect(wizard.getByRole('button', { name: 'Dark' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(wizard).toHaveCount(0);
    // The panel closed when the wizard opened, so focus returns to the Settings button.
    await expect(page.getByRole('button', { name: /^Settings/ })).toBeFocused();
  });

  test('SET-21 SET-18: the card gives way to the token dialog, and Not now answers it for good', async ({ page }) => {
    await firstVisit(page);
    await page.request.post('/__dev/state', { data: { report: 'missing', refresh: 'ok' } });
    await page.goto('/?repos=acme/gadgets');
    const token = page.getByRole('dialog', { name: 'Add a GitHub token' });
    const invite = page.getByRole('complementary', { name: 'New here?' });
    await expect(token).toBeVisible();
    await expect(invite).toHaveCount(0);
    await expect(token.getByLabel('Token')).toBeFocused();
    await token.getByRole('button', { name: 'Not now' }).click();
    await expect(invite).toBeVisible();
    await invite.getByRole('button', { name: 'Not now' }).click();
    await expect(invite).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.banner.warn')).toBeVisible();
    await expect(invite).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Set up your board' })).toHaveCount(0);
  });
});
