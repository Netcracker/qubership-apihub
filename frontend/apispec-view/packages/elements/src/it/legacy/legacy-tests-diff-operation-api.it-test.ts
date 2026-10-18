/**
 * Screenshot tests for Legacy tests - DiffOperationAPI stories (DiffOperationApi.stories.tsx).
 * Each story is switched to the response code / media type with the major change first.
 */
import { StoryPage } from '../service/story-page'
import { ViewComponent } from '../service/view-component'
import { storyPage } from '../service/storybook-service'
import { switchToChangedSections } from '../../web-components/__stories__/helpers/switch-to-changed-sections'

describe('Legacy tests', () => {
  describe('DiffOperationAPI', () => {
    let story: StoryPage
    let component: ViewComponent

    beforeEach(async () => {
      await jestPuppeteer.resetPage()
    })

    it('case-1', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-1')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-2', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-2')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-3', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-3')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-4', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-4')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-5', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-5')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-6', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-6')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-7', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-7')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-8', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-8')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-9', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-9')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-10', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-10')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-11', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-11')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-12', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-12')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-13', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-13')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-14', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-14')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-15', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-15')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-16', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-16')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-17', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-17')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-18', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-18')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-19', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-19')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-20', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-20')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-21', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-21')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-22', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-22')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-23', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-23')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-24', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-24')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-25', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-25')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-26', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-26')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-27', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-27')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-28', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-28')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-29', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-29')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-30', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-30')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })

    it('case-31', async () => {
      story = await storyPage(page, 'legacy-tests-diff-operation-api--case-31')
      component = await story.viewComponent()
      await page.evaluate(switchToChangedSections)
      expect(await component.captureScreenshot()).toMatchImageSnapshot()
    })
  })
})
