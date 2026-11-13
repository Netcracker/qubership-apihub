import { ViewComponent } from './service/view-component'
import { StoryPage } from './service/story-page'
import { storyPage } from './service/storybook-service'

const ZOOM = 0.5
const VIEWPORT = 100
describe('Viewport API Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
    story = await storyPage(page, 'synthetic-viewport--viewport-api')
    component = await story.viewComponent()
  })

  afterEach(async () => {
    await story?.close()
  })

  it('Change zoom', async () => {
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    const numberControl = await story.numberControl('zoomProperty')
    await numberControl.set(ZOOM)
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Change viewport', async () => {
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    const viewportX = await story.numberControl('viewportX')
    const viewportY = await story.numberControl('viewportY')
    await viewportX.set(VIEWPORT)
    await viewportY.set(VIEWPORT)
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
