import { ViewComponent } from './service/view-component'
import { StoryPage } from './service/story-page'
import { storyPage } from './service/storybook-service'

describe('Content Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  afterEach(async () => {
    await story?.close()
  });

  [
    'duplicate-instance',
    'empty-class',
    'empty-content',
    'group-self-loop',
    'invalid-property-types',
    'invalid-reference',
    'replace-class'
  ].forEach(caseName => {
    it(`Case ${caseName}`, async () => {
      story = await storyPage(page, `synthetic-content--${caseName}`)
      component = await story.viewComponent()

      expect( await component.captureScreenshot()).toMatchImageSnapshot()
    })
  })
})

