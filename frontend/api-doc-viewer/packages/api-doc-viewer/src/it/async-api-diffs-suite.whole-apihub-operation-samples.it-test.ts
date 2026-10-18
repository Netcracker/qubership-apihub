/**
 * Screenshot tests for Async API Diffs Suite - Whole Apihub Operation Samples stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('Async API Diffs Suite - Whole Apihub Operation Samples', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  async function waitForHtmlRenderingComplete() {
    await page.waitForFunction(() => document.readyState === 'complete')
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  }

  it('1.1-message-removed-from-operation-channel-and-document', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-whole-apihub-operation-samples--case-1-1-message-removed-from-operation-channel-and-document'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.2-message-added-to-operation-channel-and-document', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-whole-apihub-operation-samples--case-1-2-message-added-to-operation-channel-and-document'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
