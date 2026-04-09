/**
 * Auto-generated screenshot tests for Async API Suite 2 Message Operation stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('AsyncAPI Suite 2 - Message Operation', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  async function waitForHtmlRenderingComplete() {
    await page.waitForFunction(() => document.readyState === 'complete')
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  }

  async function switchToOperationSection() {
    await page.click('[data-testid="message-operation"]')
    await page.waitForSelector('[data-testid="message-operation-section"]', { visible: true })
  }

  async function switchToSecondBindingOption() {
    await page.click('[data-testid="binding-1"]')
    await page.waitForSelector('[data-testid="binding-1-content"]', { visible: true })
  }

  it('operation-id', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--operation-id'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('title', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--title'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('description', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--description'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('summary', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--summary'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('extensions', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--extensions'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('bindings-one-option', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--bindings-one-option'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('bindings-two-options-selected-first', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--bindings-two-options-selected-first'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('bindings-two-options-selected-second', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--bindings-two-options-selected-second'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await switchToSecondBindingOption()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('description-summary', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--description-summary'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('description-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--description-extensions'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('description-bindings-one-option', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--description-bindings-one-option'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('extensions-bindings-one-option', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--extensions-bindings-one-option'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it.skip('edge-case-broken-ref-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-operation--edge-case-broken-ref-bindings'
    )
    component = await story.viewComponent()
    await switchToOperationSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
