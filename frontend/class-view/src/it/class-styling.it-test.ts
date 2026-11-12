import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'

describe('Class styling test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
    story = await storyPage(page, 'synthetic-styling--class-style')
    component = await story.viewComponent()
  })

  afterAll(async () => {
    await story?.close()
  })

  it('Initial styling view', async () => {
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Shape style test', async () => {
    const optionsControl = await story.embeddedOptionsControl('Change shape')
    await optionsControl.check('Round rectangle')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
