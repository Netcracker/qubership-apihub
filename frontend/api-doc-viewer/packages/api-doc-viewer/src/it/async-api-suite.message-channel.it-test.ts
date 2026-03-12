/**
 * Auto-generated screenshot tests for Async API Suite 2 Message Channel stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('AsyncAPI Suite 2 - Message Channel', () => {
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

  async function switchToSecondBindingOption() {
    await page.click('[data-testid="binding-1"]')
    await page.waitForSelector('[data-testid="binding-1-content"]', { visible: true })
  }

  it('channel-id', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--channel-id'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('title', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--title'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('address', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--address'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('description', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--description'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('summary', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('address-parameters', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--address-parameters'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('address-parameters-with-location', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--address-parameters-with-location'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('extensions', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--extensions'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('bindings-one-option', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--bindings-one-option'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('bindings-two-options-selected-first', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--bindings-two-options-selected-first'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('bindings-two-options-selected-second', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--bindings-two-options-selected-second'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await switchToSecondBindingOption()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('servers-one-server-with-host-and-protocol', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--servers-one-server-with-host-and-protocol'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('servers-one-server-with-host-and-protocol-and-title', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--servers-one-server-with-host-and-protocol-and-title'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('servers-one-server-with-host-and-protocol-and-description', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--servers-one-server-with-host-and-protocol-and-description'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('servers-one-server-with-host-and-protocol-and-summary', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--servers-one-server-with-host-and-protocol-and-summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('servers-one-server-with-host-and-protocol-and-description-and-summary', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--servers-one-server-with-host-and-protocol-and-description-and-summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('servers-one-server-with-host-and-protocol-and-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--servers-one-server-with-host-and-protocol-and-bindings'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('servers-two-servers', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--servers-two-servers'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('servers-two-servers-with-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--servers-two-servers-with-bindings'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('description-summary', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--description-summary'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('description-address-parameters', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--description-address-parameters'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('description-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--description-extensions'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('description-bindings-one-option', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--description-bindings-one-option'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('description-servers-one-server', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--description-servers-one-server'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('address-parameters-extensions', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--address-parameters-extensions'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('address-parameters-bindings-one-option', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--address-parameters-bindings-one-option'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('address-parameters-servers-one-server', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--address-parameters-servers-one-server'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('extensions-bindings-one-option', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--extensions-bindings-one-option'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('extensions-servers-one-server', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--extensions-servers-one-server'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('edge-case-broken-ref-bindings', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--edge-case-broken-ref-bindings'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('edge-case-broken-ref-address-parameter', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--edge-case-broken-ref-address-parameter'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('edge-case-broken-ref-server', async () => {
    story = await storyPage(
      page,
      'async-api-suite-message-channel--edge-case-broken-ref-server'
    )
    component = await story.viewComponent()
    await switchToChannelSection()
    await waitForHtmlRenderingComplete()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
