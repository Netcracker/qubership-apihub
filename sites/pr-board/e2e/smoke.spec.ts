import { expect, openBoard, test } from './helpers.ts';

test('DATA-2 DATA-4: the board opens with prs.json on the mock repository, without a token or errors', async ({ page, pageErrors }) => {
  await openBoard(page, { query: 'authors=all&draft=all' });
  await expect(page.locator('h1 .repo')).toHaveText('acme/widgets');
  await expect(page.locator('.board > tbody > tr')).toHaveCount(80);
  expect(pageErrors).toEqual([]);
});
