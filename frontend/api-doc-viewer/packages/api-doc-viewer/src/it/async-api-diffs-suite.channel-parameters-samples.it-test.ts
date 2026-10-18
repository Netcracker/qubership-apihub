/**
 * Screenshot tests for Async API Diffs Suite - Channel Parameters Samples stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('Async API Diffs Suite - Channel Parameters Samples', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  async function waitForHtmlRenderingComplete() {
    await page.waitForFunction(() => document.readyState === 'complete')
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  }

  async function switchToChannelSection() {
    await page.click('[data-testid="message-channel"]')
    await page.waitForSelector('[data-testid="message-channel-section"]', { visible: true })
  }

  it('1-channel-parameters-two-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-parameters-samples--case-1-channel-parameters-two-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2-channel-parameters-two-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-parameters-samples--case-2-channel-parameters-two-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3-channel-parameters-second-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-parameters-samples--case-3-channel-parameters-second-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4-channel-parameters-second-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-parameters-samples--case-4-channel-parameters-second-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5-channel-parameters-key-renamed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-parameters-samples--case-5-channel-parameters-key-renamed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('6-channel-parameters-fields-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-parameters-samples--case-6-channel-parameters-fields-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('7-channel-parameters-fields-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-parameters-samples--case-7-channel-parameters-fields-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8-channel-parameters-fields-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-parameters-samples--case-8-channel-parameters-fields-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
