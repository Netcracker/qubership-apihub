import type { Page } from 'puppeteer'

export async function waitForVisibleSelector(page: Page, selector: string | undefined): Promise<void> {
  if (selector === undefined) {
    return
  }

  await page.waitForSelector(selector, { visible: true })
  await page.waitForFunction(() => document.readyState === 'complete')
  await page.evaluate(() =>
    new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  )
}
