import { ViewComponent } from './service/view-component'
import { StoryPage } from './service/story-page'
import { storyPage } from './service/storybook-service'

describe('Prohibit Selection Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
    story = await storyPage(page, 'synthetic-selection--prohibit-selection')
    component = await story.viewComponent()
  })

  afterEach(async () => {
    await story?.close()
  })

  it('Prevent default', async () => {
    const optionsControl = await story.embeddedOptionsControl('Prohibit selection')
    await optionsControl.check('Prevent default', false)
    await component.clickOnLabel('Class')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Change selection by rollback', async () => {
    const optionsControl = await story.embeddedOptionsControl('Prohibit selection')
    await optionsControl.check('Change selection property', false)
    await component.clickOnLabel('Class')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

})

