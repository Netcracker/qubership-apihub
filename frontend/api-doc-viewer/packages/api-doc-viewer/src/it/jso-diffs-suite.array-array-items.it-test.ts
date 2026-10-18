/**
 * Screenshot tests for JSO Diffs Suite - arrayArrayItems stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Diffs Suite - arrayArrayItems', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('11.1-arrayArrayItems-array-items-arrays-to-string', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayarrayitems--case-11-1-array-array-items-array-items-arrays-to-string'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('11.2-arrayArrayItems-array-items-arrays-to-number', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayarrayitems--case-11-2-array-array-items-array-items-arrays-to-number'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('11.3-arrayArrayItems-array-items-arrays-to-boolean', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayarrayitems--case-11-3-array-array-items-array-items-arrays-to-boolean'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('11.4-arrayArrayItems-array-items-arrays-to-null', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayarrayitems--case-11-4-array-array-items-array-items-arrays-to-null'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('11.5-arrayArrayItems-array-items-arrays-to-object-primitive-props', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayarrayitems--case-11-5-array-array-items-array-items-arrays-to-object-primitive-props'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('11.6-arrayArrayItems-array-items-arrays-to-object-props-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayarrayitems--case-11-6-array-array-items-array-items-arrays-to-object-props-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('11.7-arrayArrayItems-array-items-arrays-to-object-props-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayarrayitems--case-11-7-array-array-items-array-items-arrays-to-object-props-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('11.8-arrayArrayItems-array-items-arrays-to-object-all-prop-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayarrayitems--case-11-8-array-array-items-array-items-arrays-to-object-all-prop-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('11.9-arrayArrayItems-array-items-arrays-to-array-primitives', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayarrayitems--case-11-9-array-array-items-array-items-arrays-to-array-primitives'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('11.10-arrayArrayItems-array-items-arrays-to-array-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayarrayitems--case-11-10-array-array-items-array-items-arrays-to-array-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('11.11-arrayArrayItems-array-items-arrays-to-array-all-item-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayarrayitems--case-11-11-array-array-items-array-items-arrays-to-array-all-item-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
