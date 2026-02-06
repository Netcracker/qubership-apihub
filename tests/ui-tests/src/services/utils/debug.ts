/**
 * Force test retry for testing retry logic.
 * Fails on first run (retry === 0) to trigger retry, passes on subsequent runs.
 *
 * @param testInfo - Playwright test info object
 */
export const forceRetryForTesting = (testInfo: { retry: number }): void => {
  if (testInfo.retry === 0) {
    throw new Error('Temporary failure to test retry logic')
  }
}
