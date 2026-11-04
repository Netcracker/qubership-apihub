import type { Page } from '@playwright/test';
import { ALL, expect, openBoard, rows, test } from './helpers.ts';

const NOTES_KEY = 'apihub-pr-board.notes';
const PR_KEY = 'acme/widgets#206';

async function seedNotes(page: Page, notes: unknown) {
  await page.addInitScript(([key, value]) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem(key, value);
    sessionStorage.setItem('seeded', '1');
  }, [NOTES_KEY, JSON.stringify(notes)]);
}

async function openPr206(page: Page) {
  await openBoard(page, { report: 'typical', query: ALL + '&q=' + encodeURIComponent('#206') });
  await expect(rows(page)).toHaveCount(1);
  return rows(page).first();
}

const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), NOTES_KEY);

test.describe('notes', () => {
  test('NOTE-3 NOTE-4 NOTE-2: the icon shows on hover, the note is written in Markdown, previewed, and kept', async ({ page }) => {
    const row = await openPr206(page);
    const icon = row.getByRole('button', { name: 'Add a note for PR #206' });
    await page.mouse.move(0, 0);
    await expect(icon).toHaveCSS('opacity', '0');
    await row.hover();
    await expect(icon).toHaveCSS('opacity', '1');
    await icon.click();
    const panel = page.getByRole('dialog', { name: 'Notes for PR #206' });
    const editor = panel.getByRole('textbox', { name: 'Note in Markdown' });
    await expect(editor).toBeFocused();
    await editor.fill('## Promised\n- [ ] fix the tests\n- [x] rebase');
    await panel.getByRole('button', { name: 'Preview' }).click();
    await expect(panel.getByRole('heading', { name: 'Promised' })).toBeVisible();
    await expect(panel.locator('.note-preview input[type="checkbox"]')).toHaveCount(2);
    await panel.getByRole('button', { name: 'Close' }).click();
    const saved = row.getByRole('button', { name: 'Notes for PR #206' });
    await page.mouse.move(0, 0);
    await expect(saved).toHaveCSS('opacity', '1');
    await page.reload();
    await page.getByRole('button', { name: 'Notes for PR #206' }).click();
    await expect(page.getByRole('dialog', { name: 'Notes for PR #206' }).getByRole('heading', { name: 'Promised' })).toBeVisible();
    expect((await stored(page))[PR_KEY].text).toBe('## Promised\n- [ ] fix the tests\n- [x] rebase');
  });

  test('NOTE-4: Escape saves the draft, and clearing the note removes it', async ({ page }) => {
    const row = await openPr206(page);
    await row.hover();
    await row.getByRole('button', { name: 'Add a note for PR #206' }).click();
    await page.getByRole('textbox', { name: 'Note in Markdown' }).fill('Waiting for review');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Notes for PR #206' })).toHaveCount(0);
    expect((await stored(page))[PR_KEY].text).toBe('Waiting for review');
    await row.getByRole('button', { name: 'Notes for PR #206' }).click();
    const panel = page.getByRole('dialog', { name: 'Notes for PR #206' });
    await expect(panel.locator('.note-preview')).toHaveText('Waiting for review');
    await panel.getByRole('button', { name: 'Edit' }).click();
    await panel.getByRole('textbox', { name: 'Note in Markdown' }).fill('');
    await page.keyboard.press('Escape');
    expect(await stored(page)).toEqual({});
    await expect(row.getByRole('button', { name: 'Add a note for PR #206' })).toBeAttached();
  });

  test('NOTE-2: notes from the per-day version open as one document', async ({ page }) => {
    await seedNotes(page, { [PR_KEY]: [{ date: '2026-10-27', asked: true, text: 'Fix the tests by noon' }] });
    const row = await openPr206(page);
    await row.getByRole('button', { name: 'Notes for PR #206' }).click();
    const preview = page.getByRole('dialog', { name: 'Notes for PR #206' }).locator('.note-preview');
    await expect(preview).toHaveText('2026-10-27 ✓ Fix the tests by noon');
    await expect(preview.locator('strong')).toHaveText('2026-10-27');
  });

  test('NOTE-9 SEC-4: the preview drops scripts and handlers, like comments', async ({ page, pageErrors }) => {
    await seedNotes(page, { [PR_KEY]: { text: 'Safe <script>window.hacked = 1</script><img src="x" onerror="window.hacked = 1">', updatedAt: '2026-10-28T10:00:00.000Z' } });
    const row = await openPr206(page);
    await row.getByRole('button', { name: 'Notes for PR #206' }).click();
    const preview = page.getByRole('dialog', { name: 'Notes for PR #206' }).locator('.note-preview');
    await expect(preview).toContainText('Safe');
    expect(await preview.innerHTML()).not.toMatch(/<script|onerror/i);
    expect(await page.evaluate(() => (window as { hacked?: number }).hacked)).toBeUndefined();
    expect(pageErrors).toEqual([]);
  });

  test('NOTE-7: note: finds PRs by the text of their note', async ({ page }) => {
    await seedNotes(page, { [PR_KEY]: { text: 'Flaky tests on CI', updatedAt: '2026-10-28T10:00:00.000Z' } });
    await openBoard(page, { report: 'typical', query: ALL + '&q=' + encodeURIComponent('note:flaky') });
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().getByRole('link', { name: '#206', exact: true })).toBeVisible();
  });

  test('NOTE-2: a note written in another tab shows here and is not lost when this tab writes', async ({ page, context }) => {
    const row = await openPr206(page);
    const other = await context.newPage();
    await other.goto('/?' + ALL + '&q=' + encodeURIComponent('#203'));
    const otherRow = other.locator('.board > tbody > tr').first();
    await otherRow.hover();
    await otherRow.getByRole('button', { name: 'Add a note for PR #203' }).click();
    await other.getByRole('textbox', { name: 'Note in Markdown' }).fill('Written in the other tab');
    await other.keyboard.press('Escape');
    // This tab loaded before; it writes its own note, and both stay.
    await row.hover();
    await row.getByRole('button', { name: 'Add a note for PR #206' }).click();
    await page.getByRole('textbox', { name: 'Note in Markdown' }).fill('Written here');
    await page.keyboard.press('Escape');
    const notes = await stored(page);
    expect(Object.keys(notes).sort()).toEqual(['acme/widgets#203', 'acme/widgets#206']);
    // The other tab hears about this tab's note.
    await other.goto('/?' + ALL + '&q=' + encodeURIComponent('#206'));
    await expect(other.getByRole('button', { name: 'Notes for PR #206' })).toBeAttached();
    await other.close();
  });

  test('NOTE-2: while storage refuses notes, a deleted note stays deleted when another note changes', async ({ page }) => {
    await seedNotes(page, {
      'acme/widgets#206': { text: 'Old note', updatedAt: '2026-10-27T10:00:00.000Z' },
      'acme/widgets#203': { text: 'Other note', updatedAt: '2026-10-27T10:00:00.000Z' },
    });
    await openBoard(page, { report: 'typical', query: ALL });
    // The storage is full from now on.
    await page.evaluate((key) => {
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name: string, value: string) {
        if (name === key) throw new DOMException('full', 'QuotaExceededError');
        setItem.call(this, name, value);
      };
    }, NOTES_KEY);
    const note = page.getByRole('textbox', { name: 'Note in Markdown' });
    await page.getByRole('button', { name: 'Notes for PR #206' }).click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await note.fill('');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Notes for PR #206' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Notes for PR #203' }).click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await note.fill('Other note, changed');
    await expect(page.getByRole('alert')).toHaveText("Not saved: this browser's storage is full or blocked.");
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Notes for PR #206' })).toHaveCount(0);
  });
});
