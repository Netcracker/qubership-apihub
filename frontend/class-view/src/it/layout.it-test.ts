import { ViewComponent } from './service/view-component'
import { StoryPage } from './service/story-page'
import { storyPage } from './service/storybook-service'

describe('Layout Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  afterEach(async () => {
    await story?.close()
  });

  [
    'back-loop',
    'cross-connections',
    'many-classes-to-one-class',
    'one-to-many-connection',
    'primary-links',
    'property-self-loop'
  ].forEach(caseName => {
    it(`Case ${caseName}`, async () => {
      story = await storyPage(page, `synthetic-layout--${caseName}`)
      component = await story.viewComponent()
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })
  })
})

