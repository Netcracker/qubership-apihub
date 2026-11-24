/* eslint-disable ui-testing/no-browser-commands-in-tests */
import { test } from '@fixtures'
import type { Page } from '@playwright/test'

/**
 * Makes the saved build config of the package versions point to another previous version and its package.
 *
 * Simulates a version whose previous version package was deleted or is not readable by the user:
 * pass the ID of a package that does not exist.
 */
export const mockPreviousVersionInConfig = async (
  page: Page,
  packageId: string,
  previousVersion: { packageId: string; version: string },
): Promise<void> => {
  await test.step('Mock the version config to refer to another previous version package', async () => {
    await page.route(`**/api/v2/packages/${packageId}/versions/*/config`, async (route) => {
      const response = await route.fetch()
      const config = await response.json()

      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: JSON.stringify({
          ...config,
          previousVersion: previousVersion.version,
          previousVersionPackageId: previousVersion.packageId,
        }),
      })
    })
  })
}

/**
 * Collects the URLs of all requests the page sends from now on.
 *
 * Returns the list that keeps filling, so read it after the actions you check.
 */
export const collectRequestedUrls = (page: Page): string[] => {
  const urls: string[] = []
  page.on('request', (request) => {
    urls.push(request.url())
  })
  return urls
}
