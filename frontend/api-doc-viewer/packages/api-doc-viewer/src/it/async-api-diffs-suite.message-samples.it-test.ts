/**
 * Screenshot tests for Async API Diffs Suite - Message Samples stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('Async API Diffs Suite - Message Samples', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  async function waitForHtmlRenderingComplete() {
    await page.waitForFunction(() => document.readyState === 'complete')
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  }

  it('1.1-message-title-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-1-1-message-title-changed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.2-message-title-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-1-2-message-title-removed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.3-message-title-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-1-3-message-title-added'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.1-message-description-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-1-message-description-changed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.2-message-description-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-2-message-description-removed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.3-message-description-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-3-message-description-added'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.4-message-long-description-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-4-message-long-description-changed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.5-message-long-description-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-5-message-long-description-removed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.6-message-long-description-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-6-message-long-description-added'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.7-message-summary-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-7-message-summary-changed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.8-message-summary-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-8-message-summary-removed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.9-message-summary-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-9-message-summary-added'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.10-message-long-summary-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-10-message-long-summary-changed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.11-message-long-summary-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-11-message-long-summary-removed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.12-message-long-summary-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-12-message-long-summary-added'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.13-message-description-moved-to-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-13-message-description-moved-to-summary'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.14-message-long-description-moved-to-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-14-message-long-description-moved-to-summary'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.15-message-long-description-moved-to-long-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-15-message-long-description-moved-to-long-summary'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.16-message-description-moved-to-long-summary', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-16-message-description-moved-to-long-summary'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.17-message-summary-moved-to-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-17-message-summary-moved-to-description'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.18-message-long-summary-moved-to-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-18-message-long-summary-moved-to-description'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.19-message-long-summary-moved-to-long-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-19-message-long-summary-moved-to-long-description'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('2.20-message-summary-moved-to-long-description', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-2-20-message-summary-moved-to-long-description'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3.1-message-bindings-add-one-more-binding', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-3-1-message-bindings-add-one-more-binding'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3.2-message-bindings-remove-one-of-several-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-3-2-message-bindings-remove-one-of-several-bindings'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3.3-message-bindings-add-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-3-3-message-bindings-add-bindings'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('3.4-message-bindings-remove-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-3-4-message-bindings-remove-bindings'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.1-message-bindings-kafka-bindingVersion-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-4-1-message-bindings-kafka-binding-version-changed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.2-message-bindings-kafka-bindingVersion-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-4-2-message-bindings-kafka-binding-version-removed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.3-message-bindings-kafka-bindingVersion-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-4-3-message-bindings-kafka-binding-version-added'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.1-message-bindings-kafka-internal-jso-changes', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-5-1-message-bindings-kafka-internal-jso-changes'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('6.1-message-x-second-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-6-1-message-x-second-added'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('6.2-message-x-second-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-6-2-message-x-second-removed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('6.3-message-x-second-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-6-3-message-x-second-changed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('6.4-message-x-first-and-x-second-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-6-4-message-x-first-and-x-second-added'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('6.5-message-x-first-and-x-second-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-6-5-message-x-first-and-x-second-removed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('7.1-message-headers-object-schema-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-7-1-message-headers-object-schema-added'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('7.2-message-headers-object-schema-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-7-2-message-headers-object-schema-removed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('7.3-message-headers-description-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-7-3-message-headers-description-changed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('7.4-message-payload-object-schema-added', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-7-4-message-payload-object-schema-added'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('7.5-message-payload-object-schema-removed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-7-5-message-payload-object-schema-removed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('7.6-message-payload-description-changed', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-7-6-message-payload-description-changed'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.1-message-headers-object-schema-added-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-8-1-message-headers-object-schema-added-extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.2-message-headers-object-schema-removed-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-8-2-message-headers-object-schema-removed-extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.3-message-headers-object-schema-changed-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-8-3-message-headers-object-schema-changed-extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.4-message-headers-object-schema-added-property-with-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-8-4-message-headers-object-schema-added-property-with-extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.5-message-headers-object-schema-removed-property-with-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-8-5-message-headers-object-schema-removed-property-with-extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.6-message-payload-object-schema-added-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-8-6-message-payload-object-schema-added-extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.7-message-payload-object-schema-removed-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-8-7-message-payload-object-schema-removed-extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.8-message-payload-object-schema-changed-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-8-8-message-payload-object-schema-changed-extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.9-message-payload-object-schema-added-property-with-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-8-9-message-payload-object-schema-added-property-with-extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.10-message-payload-object-schema-removed-property-with-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-diffs-suite-message-samples--case-8-10-message-payload-object-schema-removed-property-with-extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
