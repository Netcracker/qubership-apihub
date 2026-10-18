/**
 * Screenshot tests for JSO Diffs Suite - objectJsonSchema stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Diffs Suite - objectJsonSchema', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('13.2-objectJsonSchema-add-complex-json-schema', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectjsonschema--case-13-2-object-json-schema-add-complex-json-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('13.4-objectJsonSchema-remove-complex-json-schema', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectjsonschema--case-13-4-object-json-schema-remove-complex-json-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('15.1-objectJsonSchema-description-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectjsonschema--case-15-1-object-json-schema-description-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('15.2-objectJsonSchema-title-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectjsonschema--case-15-2-object-json-schema-title-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('15.3-objectJsonSchema-title-added', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectjsonschema--case-15-3-object-json-schema-title-added'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('15.4-objectJsonSchema-title-removed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectjsonschema--case-15-4-object-json-schema-title-removed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('15.5-objectJsonSchema-examples-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectjsonschema--case-15-5-object-json-schema-examples-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('15.6-objectJsonSchema-property-added', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectjsonschema--case-15-6-object-json-schema-property-added'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('15.7-objectJsonSchema-property-removed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectjsonschema--case-15-7-object-json-schema-property-removed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('15.8-objectJsonSchema-required-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-objectjsonschema--case-15-8-object-json-schema-required-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
