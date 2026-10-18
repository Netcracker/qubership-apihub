/**
 * Auto-generated screenshot tests for JSO Suite (General) stories.
 */
import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('JSO Suite (General)', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it('primitive-properties', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--primitive-properties'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('primitive-object-property', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--primitive-object-property'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('primitive-array-property', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--primitive-array-property'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('nested-object-property', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--nested-object-property'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('nested-array-property', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--nested-array-property'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('all-kinds-of-object-properties', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--all-kinds-of-object-properties'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('all-kinds-of-array-items', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--all-kinds-of-array-items'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('primitive-prop-and-primitive-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--primitive-prop-and-primitive-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('primitive-prop-and-object-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--primitive-prop-and-object-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('primitive-prop-and-array-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--primitive-prop-and-array-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('primitive-prop-and-combiner-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--primitive-prop-and-combiner-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('object-prop-and-primitive-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--object-prop-and-primitive-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('array-prop-and-primitive-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--array-prop-and-primitive-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('second-level-primitive-prop-and-primitive-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--second-level-primitive-prop-and-primitive-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('second-level-primitive-prop-and-object-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--second-level-primitive-prop-and-object-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('second-level-primitive-prop-and-array-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--second-level-primitive-prop-and-array-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('second-level-primitive-prop-and-combiner-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--second-level-primitive-prop-and-combiner-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('second-level-object-prop-and-primitive-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--second-level-object-prop-and-primitive-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('second-level-array-prop-and-primitive-schema', async () => {
    story = await storyPage(
      page,
      'jso-suite-general--second-level-array-prop-and-primitive-schema'
    )
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
