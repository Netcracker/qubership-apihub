import { ViewComponent } from './service/view-component'
import { StoryPage } from './service/story-page'
import { storyPage } from './service/storybook-service'

describe('Viewport Change Priority Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
    story = await storyPage(page, 'synthetic-viewport--change-priority')
    component = await story.viewComponent()
  })

  afterEach(async () => {
    await story?.close()
  })

  it('Activate zoom change', async () => {
    const booleanZoomControl = await story.booleanControl('Activate zoom change')
    await booleanZoomControl.click(false)
    const optionsNameControl = await story.embeddedOptionsControl('Do action')
    await optionsNameControl.check('Action')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Activate content change', async () => {
    const booleanContentControl = await story.booleanControl('Activate content change')
    await booleanContentControl.click(false)
    const optionsNameControl = await story.embeddedOptionsControl('Do action')
    await optionsNameControl.check('Action')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Activate navigate change', async () => {
    const booleanNavigateControl = await story.booleanControl('Activate navigate change')
    await booleanNavigateControl.click(false)
    const optionsNameControl = await story.embeddedOptionsControl('Do action')
    await optionsNameControl.check('Action')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Activate zoom and content change', async () => {
    const booleanZoomControl = await story.booleanControl('Activate zoom change')
    await booleanZoomControl.click(false)
    const booleanContentControl = await story.booleanControl('Activate content change')
    await booleanContentControl.click(false)
    const optionsNameControl = await story.embeddedOptionsControl('Do action')
    await optionsNameControl.check('Action')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Activate zoom and navigate change', async () => {
    const booleanZoomControl = await story.booleanControl('Activate zoom change')
    await booleanZoomControl.click(false)
    const booleanNavigateControl = await story.booleanControl('Activate navigate change')
    await booleanNavigateControl.click(false)
    const optionsNameControl = await story.embeddedOptionsControl('Do action')
    await optionsNameControl.check('Action')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Activate content and navigate change', async () => {
    const booleanContentControl = await story.booleanControl('Activate content change')
    await booleanContentControl.click(false)
    const booleanNavigateControl = await story.booleanControl('Activate navigate change')
    await booleanNavigateControl.click(false)
    const optionsNameControl = await story.embeddedOptionsControl('Do action')
    await optionsNameControl.check('Action')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
