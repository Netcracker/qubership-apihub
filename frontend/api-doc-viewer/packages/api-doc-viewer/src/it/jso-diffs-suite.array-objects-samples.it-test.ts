/**
 * Screenshot tests for JSO Diffs Suite - arrayObjects stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Diffs Suite - arrayObjects', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('10.1-arrayObjects-array-objects-to-string', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayobjects--case-10-1-array-objects-array-objects-to-string'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('10.2-arrayObjects-array-objects-to-number', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayobjects--case-10-2-array-objects-array-objects-to-number'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('10.3-arrayObjects-array-objects-to-boolean', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayobjects--case-10-3-array-objects-array-objects-to-boolean'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('10.4-arrayObjects-array-objects-to-null', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayobjects--case-10-4-array-objects-array-objects-to-null'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('10.5-arrayObjects-array-objects-to-object-primitive-props', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayobjects--case-10-5-array-objects-array-objects-to-object-primitive-props'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('10.6-arrayObjects-array-objects-to-object-props-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayobjects--case-10-6-array-objects-array-objects-to-object-props-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('10.7-arrayObjects-array-objects-to-object-props-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayobjects--case-10-7-array-objects-array-objects-to-object-props-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('10.8-arrayObjects-array-objects-to-object-all-prop-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayobjects--case-10-8-array-objects-array-objects-to-object-all-prop-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('10.9-arrayObjects-array-objects-to-array-primitives', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayobjects--case-10-9-array-objects-array-objects-to-array-primitives'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('10.10-arrayObjects-array-objects-to-array-items-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayobjects--case-10-10-array-objects-array-objects-to-array-items-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('10.11-arrayObjects-array-objects-to-array-all-item-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayobjects--case-10-11-array-objects-array-objects-to-array-all-item-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
