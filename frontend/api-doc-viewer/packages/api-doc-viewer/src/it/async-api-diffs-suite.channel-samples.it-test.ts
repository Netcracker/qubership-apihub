/**
 * Screenshot tests for Async API Diffs Suite - Channel Samples stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('Async API Diffs Suite - Channel Samples', () => {
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

  it('1.1-channel-title-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-1-1-channel-title-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.2-channel-title-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-1-2-channel-title-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.3-channel-title-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-1-3-channel-title-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.1-channel-description-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-1-channel-description-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.2-channel-description-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-2-channel-description-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.3-channel-description-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-3-channel-description-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.4-channel-long-description-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-4-channel-long-description-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.5-channel-long-description-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-5-channel-long-description-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.6-channel-long-description-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-6-channel-long-description-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.7-channel-summary-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-7-channel-summary-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.8-channel-summary-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-8-channel-summary-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.9-channel-summary-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-9-channel-summary-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.10-channel-long-summary-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-10-channel-long-summary-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.11-channel-long-summary-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-11-channel-long-summary-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.12-channel-long-summary-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-12-channel-long-summary-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.13-channel-description-moved-to-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-13-channel-description-moved-to-summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.14-channel-long-description-moved-to-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-14-channel-long-description-moved-to-summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.15-channel-long-description-moved-to-long-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-15-channel-long-description-moved-to-long-summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.16-channel-description-moved-to-long-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-16-channel-description-moved-to-long-summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.17-channel-summary-moved-to-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-17-channel-summary-moved-to-description'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.18-channel-long-summary-moved-to-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-18-channel-long-summary-moved-to-description'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.19-channel-long-summary-moved-to-long-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-19-channel-long-summary-moved-to-long-description'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.20-channel-summary-moved-to-long-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-2-20-channel-summary-moved-to-long-description'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3.1-channel-bindings-add-one-more-binding', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-3-1-channel-bindings-add-one-more-binding'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3.2-channel-bindings-remove-one-of-several-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-3-2-channel-bindings-remove-one-of-several-bindings'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3.3-channel-bindings-add-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-3-3-channel-bindings-add-bindings'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3.4-channel-bindings-remove-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-3-4-channel-bindings-remove-bindings'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.1-channel-bindings-kafka-bindingVersion-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-4-1-channel-bindings-kafka-binding-version-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.2-channel-bindings-kafka-bindingVersion-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-4-2-channel-bindings-kafka-binding-version-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.3-channel-bindings-kafka-bindingVersion-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-4-3-channel-bindings-kafka-binding-version-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.1-channel-bindings-kafka-internal-jso-changes', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-5-1-channel-bindings-kafka-internal-jso-changes'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('6.1-channel-x-second-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-6-1-channel-x-second-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('6.2-channel-x-second-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-6-2-channel-x-second-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('6.3-channel-x-second-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-6-3-channel-x-second-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('6.4-channel-x-first-and-x-second-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-6-4-channel-x-first-and-x-second-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('6.5-channel-x-first-and-x-second-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-samples--case-6-5-channel-x-first-and-x-second-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
