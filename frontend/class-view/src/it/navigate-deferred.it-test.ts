import { ViewComponent } from './service/view-component'
import { StoryPage } from './service/story-page'
import { storyPage } from './service/storybook-service'

describe('Navigation Deferred Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
    story = await storyPage(page, 'synthetic-navigate--deferred-apply')
    component = await story.viewComponent()
  })

  afterEach(async () => {
    await story?.close()
  })

  it('Basic navigate', async () => {
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    const navigateTo = await story.embeddedOptionsControl('Navigate To')
    await navigateTo.check('Class')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await navigateTo.check("Class's property")
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await navigateTo.check('Group')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await navigateTo.check("Group's property")
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await navigateTo.check('Relation')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await navigateTo.check('Non-existent')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Navigate options', async () => {
    const animation = await story.textControl('Navigate option. Animation duration')
    const insets = await story.embeddedOptionsControl('Navigate option. Insets')
    const navigateTo = await story.embeddedOptionsControl('Navigate To')

    await animation.fill('0', false)
    await insets.check('Left: 50', false)
    await navigateTo.check('Class')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
