/**
 * Screenshot tests for JSO Diffs Suite - arrayPrimitives stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Diffs Suite - arrayPrimitives', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('9.1-arrayPrimitives-array-primitives-to-string', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayprimitives--case-9-1-array-primitives-array-primitives-to-string'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('9.2-arrayPrimitives-array-primitives-to-number', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayprimitives--case-9-2-array-primitives-array-primitives-to-number'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('9.3-arrayPrimitives-array-primitives-to-boolean', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayprimitives--case-9-3-array-primitives-array-primitives-to-boolean'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('9.4-arrayPrimitives-array-primitives-to-null', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayprimitives--case-9-4-array-primitives-array-primitives-to-null'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('9.5-arrayPrimitives-array-primitives-to-object-primitive-props', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayprimitives--case-9-5-array-primitives-array-primitives-to-object-primitive-props'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('9.6-arrayPrimitives-array-primitives-to-object-props-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayprimitives--case-9-6-array-primitives-array-primitives-to-object-props-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('9.7-arrayPrimitives-array-primitives-to-object-props-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayprimitives--case-9-7-array-primitives-array-primitives-to-object-props-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('9.8-arrayPrimitives-array-primitives-to-object-all-prop-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayprimitives--case-9-8-array-primitives-array-primitives-to-object-all-prop-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('9.9-arrayPrimitives-array-primitives-to-array-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayprimitives--case-9-9-array-primitives-array-primitives-to-array-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('9.10-arrayPrimitives-array-primitives-to-array-items-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayprimitives--case-9-10-array-primitives-array-primitives-to-array-items-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('9.11-arrayPrimitives-array-primitives-to-array-all-item-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayprimitives--case-9-11-array-primitives-array-primitives-to-array-all-item-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
