/**
 * Screenshot tests for JSO Diffs Suite - arrayAllItemTypes stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Diffs Suite - arrayAllItemTypes', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('12.1-arrayAllItemTypes-array-all-item-types-to-string', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayallitemtypes--case-12-1-array-all-item-types-array-all-item-types-to-string'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('12.2-arrayAllItemTypes-array-all-item-types-to-number', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayallitemtypes--case-12-2-array-all-item-types-array-all-item-types-to-number'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('12.3-arrayAllItemTypes-array-all-item-types-to-boolean', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayallitemtypes--case-12-3-array-all-item-types-array-all-item-types-to-boolean'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('12.4-arrayAllItemTypes-array-all-item-types-to-null', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayallitemtypes--case-12-4-array-all-item-types-array-all-item-types-to-null'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('12.5-arrayAllItemTypes-array-all-item-types-to-object-primitive-props', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayallitemtypes--case-12-5-array-all-item-types-array-all-item-types-to-object-primitive-props'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('12.6-arrayAllItemTypes-array-all-item-types-to-object-props-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayallitemtypes--case-12-6-array-all-item-types-array-all-item-types-to-object-props-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('12.7-arrayAllItemTypes-array-all-item-types-to-object-props-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayallitemtypes--case-12-7-array-all-item-types-array-all-item-types-to-object-props-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('12.8-arrayAllItemTypes-array-all-item-types-to-object-all-prop-types', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayallitemtypes--case-12-8-array-all-item-types-array-all-item-types-to-object-all-prop-types'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('12.9-arrayAllItemTypes-array-all-item-types-to-array-primitives', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayallitemtypes--case-12-9-array-all-item-types-array-all-item-types-to-array-primitives'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('12.10-arrayAllItemTypes-array-all-item-types-to-array-objects', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayallitemtypes--case-12-10-array-all-item-types-array-all-item-types-to-array-objects'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('12.11-arrayAllItemTypes-array-all-item-types-to-array-items-arrays', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-arrayallitemtypes--case-12-11-array-all-item-types-array-all-item-types-to-array-items-arrays'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
