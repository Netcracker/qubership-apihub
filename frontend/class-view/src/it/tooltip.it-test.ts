import { ViewComponent } from './service/view-component'
import { StoryPage } from './service/story-page'
import { storyPage } from './service/storybook-service'

describe('Tooltip Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  afterEach(async () => {
    await story?.close()
  });

  [
    'tooltip-example',
  ].forEach(caseName => {
    it(`Case ${caseName}`, async () => {
      story = await storyPage(page, `synthetic-tooltip--${caseName}`)
      component = await story.viewComponent()
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })
  })
})

