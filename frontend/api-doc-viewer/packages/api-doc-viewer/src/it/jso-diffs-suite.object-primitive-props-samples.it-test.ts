/**
 * Screenshot tests for JSO Diffs Suite - objectPrimitiveProps stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Diffs Suite - objectPrimitiveProps', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('5.1-objectPrimitiveProps-object-primitive-props-to-string', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectprimitiveprops--case-5-1-object-primitive-props-object-primitive-props-to-string'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.2-objectPrimitiveProps-object-primitive-props-to-number', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectprimitiveprops--case-5-2-object-primitive-props-object-primitive-props-to-number'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.3-objectPrimitiveProps-object-primitive-props-to-boolean', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectprimitiveprops--case-5-3-object-primitive-props-object-primitive-props-to-boolean'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.4-objectPrimitiveProps-object-primitive-props-to-null', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectprimitiveprops--case-5-4-object-primitive-props-object-primitive-props-to-null'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.5-objectPrimitiveProps-object-primitive-props-to-object-props-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectprimitiveprops--case-5-5-object-primitive-props-object-primitive-props-to-object-props-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.6-objectPrimitiveProps-object-primitive-props-to-object-props-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectprimitiveprops--case-5-6-object-primitive-props-object-primitive-props-to-object-props-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.7-objectPrimitiveProps-object-primitive-props-to-object-all-prop-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectprimitiveprops--case-5-7-object-primitive-props-object-primitive-props-to-object-all-prop-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.8-objectPrimitiveProps-object-primitive-props-to-array-primitives', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectprimitiveprops--case-5-8-object-primitive-props-object-primitive-props-to-array-primitives'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.9-objectPrimitiveProps-object-primitive-props-to-array-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectprimitiveprops--case-5-9-object-primitive-props-object-primitive-props-to-array-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.10-objectPrimitiveProps-object-primitive-props-to-array-items-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectprimitiveprops--case-5-10-object-primitive-props-object-primitive-props-to-array-items-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('5.11-objectPrimitiveProps-object-primitive-props-to-array-all-item-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectprimitiveprops--case-5-11-object-primitive-props-object-primitive-props-to-array-all-item-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
