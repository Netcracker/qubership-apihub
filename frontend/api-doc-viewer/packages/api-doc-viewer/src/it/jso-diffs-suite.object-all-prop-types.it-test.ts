/**
 * Screenshot tests for JSO Diffs Suite - objectAllPropTypes stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Diffs Suite - objectAllPropTypes', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('8.1-objectAllPropTypes-object-all-prop-types-to-string', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectallproptypes--case-8-1-object-all-prop-types-object-all-prop-types-to-string'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.2-objectAllPropTypes-object-all-prop-types-to-number', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectallproptypes--case-8-2-object-all-prop-types-object-all-prop-types-to-number'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.3-objectAllPropTypes-object-all-prop-types-to-boolean', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectallproptypes--case-8-3-object-all-prop-types-object-all-prop-types-to-boolean'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.4-objectAllPropTypes-object-all-prop-types-to-null', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectallproptypes--case-8-4-object-all-prop-types-object-all-prop-types-to-null'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.5-objectAllPropTypes-object-all-prop-types-to-object-primitive-props', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectallproptypes--case-8-5-object-all-prop-types-object-all-prop-types-to-object-primitive-props'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.6-objectAllPropTypes-object-all-prop-types-to-object-props-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectallproptypes--case-8-6-object-all-prop-types-object-all-prop-types-to-object-props-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.7-objectAllPropTypes-object-all-prop-types-to-object-props-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectallproptypes--case-8-7-object-all-prop-types-object-all-prop-types-to-object-props-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.8-objectAllPropTypes-object-all-prop-types-to-array-primitives', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectallproptypes--case-8-8-object-all-prop-types-object-all-prop-types-to-array-primitives'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.9-objectAllPropTypes-object-all-prop-types-to-array-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectallproptypes--case-8-9-object-all-prop-types-object-all-prop-types-to-array-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.10-objectAllPropTypes-object-all-prop-types-to-array-items-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectallproptypes--case-8-10-object-all-prop-types-object-all-prop-types-to-array-items-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('8.11-objectAllPropTypes-object-all-prop-types-to-array-all-item-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectallproptypes--case-8-11-object-all-prop-types-object-all-prop-types-to-array-all-item-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
