import { ViewComponent } from './service/view-component'
import { StoryPage } from './service/story-page'
import { storyPage } from './service/storybook-service'

describe('Property Mutation Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
    story = await storyPage(page, 'synthetic-topology--property-mutation')
    component = await story.viewComponent()
  })

  afterEach(async () => {
    await story?.close()
  })

  it('Change property name', async () => {
    const optionsNameControl = await story.embeddedOptionsControl('Property name')
    await optionsNameControl.check('Short')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await optionsNameControl.check('Long')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Change property type', async () => {
    const optionsNameControl = await story.embeddedOptionsControl('Property type name')
    await optionsNameControl.check('Short')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await optionsNameControl.check('Long')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Change required', async () => {
    const booleanControl = await story.booleanControl('Required')
    await booleanControl.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Change deprecated', async () => {
    const optionsNameControl = await story.embeddedOptionsControl('Property name')
    await optionsNameControl.check('Short')
    const booleanControl = await story.booleanControl('Deprecated')
    await booleanControl.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Change type deprecated', async () => {
    const optionsNameControl = await story.embeddedOptionsControl('Property name')
    await optionsNameControl.check('Short')
    const optionsTypeControl = await story.embeddedOptionsControl('Property type name')
    await optionsTypeControl.check('Short')
    const booleanControl = await story.booleanControl('Property type deprecated')
    await booleanControl.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
