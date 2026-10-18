/**
 * Screenshot tests for JSO Diffs Suite - nodeChangesSummary stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Diffs Suite - nodeChangesSummary', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('16.1-nodeChangesSummary-on-object', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nodechangessummary--case-16-1-node-changes-summary-on-object'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('16.2-nodeChangesSummary-on-array', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nodechangessummary--case-16-2-node-changes-summary-on-array'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
