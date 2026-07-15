/**
 * Screenshot tests for JSO Diffs Suite - stringJsonSchema stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Diffs Suite - stringJsonSchema', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('13.1-stringJsonSchema-add-primitive-json-schema', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringjsonschema--case-13-1-string-json-schema-add-primitive-json-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('13.3-stringJsonSchema-remove-primitive-json-schema', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringjsonschema--case-13-3-string-json-schema-remove-primitive-json-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('14.1-stringJsonSchema-description-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringjsonschema--case-14-1-string-json-schema-description-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('14.2-stringJsonSchema-enum-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringjsonschema--case-14-2-string-json-schema-enum-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('14.3-stringJsonSchema-minLength-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringjsonschema--case-14-3-string-json-schema-min-length-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('14.4-stringJsonSchema-maxLength-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringjsonschema--case-14-4-string-json-schema-max-length-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('14.5-stringJsonSchema-pattern-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringjsonschema--case-14-5-string-json-schema-pattern-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('14.6-stringJsonSchema-format-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringjsonschema--case-14-6-string-json-schema-format-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('14.7-stringJsonSchema-default-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringjsonschema--case-14-7-string-json-schema-default-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('14.8-stringJsonSchema-examples-changed', async () => {
    story = await storyPage(
      page,
      'jso-diffs-suite-stringjsonschema--case-14-8-string-json-schema-examples-changed'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
