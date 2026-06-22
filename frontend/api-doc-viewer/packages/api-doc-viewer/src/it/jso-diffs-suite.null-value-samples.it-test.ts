/**
 * Screenshot tests for JSO Diffs Suite - nullValue stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Diffs Suite - nullValue', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('4.1-nullValue-null-to-string', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nullvalue--case-4-1-null-value-null-to-string'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.2-nullValue-null-to-number', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nullvalue--case-4-2-null-value-null-to-number'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.3-nullValue-null-to-boolean', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nullvalue--case-4-3-null-value-null-to-boolean'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.4-nullValue-null-to-object-primitive-props', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nullvalue--case-4-4-null-value-null-to-object-primitive-props'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.5-nullValue-null-to-object-props-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nullvalue--case-4-5-null-value-null-to-object-props-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.6-nullValue-null-to-object-props-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nullvalue--case-4-6-null-value-null-to-object-props-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.7-nullValue-null-to-object-all-prop-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nullvalue--case-4-7-null-value-null-to-object-all-prop-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.8-nullValue-null-to-array-primitives', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nullvalue--case-4-8-null-value-null-to-array-primitives'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.9-nullValue-null-to-array-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nullvalue--case-4-9-null-value-null-to-array-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.10-nullValue-null-to-array-items-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nullvalue--case-4-10-null-value-null-to-array-items-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('4.11-nullValue-null-to-array-all-item-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-nullvalue--case-4-11-null-value-null-to-array-all-item-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
