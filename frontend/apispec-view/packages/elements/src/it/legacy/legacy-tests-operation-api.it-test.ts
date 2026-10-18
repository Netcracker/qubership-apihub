/**
 * Screenshot tests for Legacy tests - OperationAPI stories (OperationApi.stories.tsx).
 */
import { StoryPage } from '../service/story-page'
import { ViewComponent } from '../service/view-component'
import { storyPage } from '../service/storybook-service'

describe('Legacy tests', () => {
  describe('OperationAPI', () => {
    let story: StoryPage
    let component: ViewComponent

    beforeEach(async () => {
      await jestPuppeteer.resetPage()
    })

    it('case-1', async () => {
      story = await storyPage(page, 'legacy-tests-operation-api--case-1')
      component = await story.viewComponent()
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-2', async () => {
      story = await storyPage(page, 'legacy-tests-operation-api--case-2')
      component = await story.viewComponent()
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-3', async () => {
      story = await storyPage(page, 'legacy-tests-operation-api--case-3')
      component = await story.viewComponent()
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-4', async () => {
      story = await storyPage(page, 'legacy-tests-operation-api--case-4')
      component = await story.viewComponent()
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-5', async () => {
      story = await storyPage(page, 'legacy-tests-operation-api--case-5')
      component = await story.viewComponent()
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-6', async () => {
      story = await storyPage(page, 'legacy-tests-operation-api--case-6')
      component = await story.viewComponent()
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-7', async () => {
      story = await storyPage(page, 'legacy-tests-operation-api--case-7')
      component = await story.viewComponent()
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-8', async () => {
      story = await storyPage(page, 'legacy-tests-operation-api--case-8')
      component = await story.viewComponent()
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })
  })
})
