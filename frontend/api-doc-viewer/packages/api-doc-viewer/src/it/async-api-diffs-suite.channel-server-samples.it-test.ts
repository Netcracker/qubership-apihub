/**
 * Screenshot tests for Async API Diffs Suite - Channel Server Samples stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('Async API Diffs Suite - Channel Server Samples', () => {
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

  it('1.1-channel-servers-host-protocol-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-1-channel-servers-host-protocol-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.2-channel-server-description-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-2-channel-server-description-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.3-channel-server-description-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-3-channel-server-description-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.4-channel-server-description-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-4-channel-server-description-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.5-channel-server-long-description-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-5-channel-server-long-description-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.6-channel-server-long-description-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-6-channel-server-long-description-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.7-channel-server-long-description-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-7-channel-server-long-description-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.8-channel-server-summary-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-8-channel-server-summary-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.9-channel-server-summary-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-9-channel-server-summary-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.10-channel-server-summary-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-10-channel-server-summary-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.11-channel-server-long-summary-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-11-channel-server-long-summary-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.12-channel-server-long-summary-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-12-channel-server-long-summary-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.13-channel-server-long-summary-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-13-channel-server-long-summary-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.14-channel-server-description-moved-to-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-14-channel-server-description-moved-to-summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.15-channel-server-long-description-moved-to-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-15-channel-server-long-description-moved-to-summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.16-channel-server-long-description-moved-to-long-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-16-channel-server-long-description-moved-to-long-summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.17-channel-server-description-moved-to-long-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-17-channel-server-description-moved-to-long-summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.18-channel-server-summary-moved-to-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-18-channel-server-summary-moved-to-description'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.19-channel-server-long-summary-moved-to-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-19-channel-server-long-summary-moved-to-description'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.20-channel-server-long-summary-moved-to-long-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-20-channel-server-long-summary-moved-to-long-description'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.21-channel-server-summary-moved-to-long-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-21-channel-server-summary-moved-to-long-description'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.22-channel-servers-description-set', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-22-channel-servers-description-set'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.23-channel-servers-summary-set', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-1-23-channel-servers-summary-set'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.1-channel-servers0-bindings-add-one-more-binding', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-2-1-channel-servers-0-bindings-add-one-more-binding'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.2-channel-servers0-bindings-remove-one-of-several-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-2-2-channel-servers-0-bindings-remove-one-of-several-bindings'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.3-channel-servers0-bindings-add-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-2-3-channel-servers-0-bindings-add-bindings'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.4-channel-servers0-bindings-remove-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-2-4-channel-servers-0-bindings-remove-bindings'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.3-channel-servers-all-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-2-3-channel-servers-all-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.4-channel-servers-all-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-2-4-channel-servers-all-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3.1-channel-servers0-bindings-kafka-bindingVersion-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-3-1-channel-servers-0-bindings-kafka-binding-version-changed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3.2-channel-servers0-bindings-kafka-bindingVersion-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-3-2-channel-servers-0-bindings-kafka-binding-version-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3.3-channel-servers0-bindings-kafka-bindingVersion-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-3-3-channel-servers-0-bindings-kafka-binding-version-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.1-channel-server-bindings-kafka-internal-jso-changes', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-4-1-channel-server-bindings-kafka-internal-jso-changes'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.1-channel-servers-one-item-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-5-1-channel-servers-one-item-removed'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.2-channel-servers-one-item-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-channel-server-samples--case-5-2-channel-servers-one-item-added'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
