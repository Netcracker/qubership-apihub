/**
 * Auto-generated screenshot tests for Async API Suite 2 Message Content stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('AsyncAPI Suite 2 - Message Content', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  async function waitForHtmlRenderingComplete() {
    await page.waitForFunction(() => document.readyState === 'complete')
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  }

  async function switchToSecondBindingOption() {
    await page.click('[data-testid="binding-1"]')
    await page.waitForSelector('[data-testid="binding-1-content"]', { visible: true })
  }

  it('headers', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--headers'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('headers-multi-schema-object', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--headers-multi-schema-object'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('extensions', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('bindings-one-option', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--bindings-one-option'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('bindings-two-options-selected-first', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--bindings-two-options-selected-first'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('bindings-two-options-selected-second', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--bindings-two-options-selected-second'
    )
    component = await story.viewComponent()
    await switchToSecondBindingOption()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('payload', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--payload'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('payload-multi-schema-object', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--payload-multi-schema-object'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('headers-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--headers-extensions'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('headers-bindings-one-option', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--headers-bindings-one-option'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('headers-payload', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--headers-payload'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('extensions-bindings-one-option', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--extensions-bindings-one-option'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('extensions-payload', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--extensions-payload'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('bindings-one-option-payload', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--bindings-one-option-payload'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it.skip('edge-case-broken-ref-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-content--edge-case-broken-ref-bindings'
    )
    component = await story.viewComponent()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
