/**
 * Screenshot tests for JSO Diffs Suite - stringValue stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Diffs Suite - stringValue', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('1.1-stringValue-string-to-number', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringvalue--case-1-1-string-value-string-to-number'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.2-stringValue-string-to-boolean', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringvalue--case-1-2-string-value-string-to-boolean'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.3-stringValue-string-to-null', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringvalue--case-1-3-string-value-string-to-null'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.4-stringValue-string-to-object-primitive-props', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringvalue--case-1-4-string-value-string-to-object-primitive-props'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.5-stringValue-string-to-object-props-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringvalue--case-1-5-string-value-string-to-object-props-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.6-stringValue-string-to-object-props-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringvalue--case-1-6-string-value-string-to-object-props-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.7-stringValue-string-to-object-all-prop-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringvalue--case-1-7-string-value-string-to-object-all-prop-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.8-stringValue-string-to-array-primitives', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringvalue--case-1-8-string-value-string-to-array-primitives'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.9-stringValue-string-to-array-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringvalue--case-1-9-string-value-string-to-array-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.10-stringValue-string-to-array-items-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringvalue--case-1-10-string-value-string-to-array-items-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('1.11-stringValue-string-to-array-all-item-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringvalue--case-1-11-string-value-string-to-array-all-item-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
