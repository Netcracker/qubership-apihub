import { ViewComponent } from './service/view-component'
import { StoryPage } from './service/story-page'
import { storyPage } from './service/storybook-service'

describe('Include Properties Group Relation Mutation Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
    story = await storyPage(page, 'synthetic-topology--include-properties-group-relation-mutation')
    component = await story.viewComponent()
  })

  afterEach(async () => {
    await story?.close()
  })

  it('Change primary', async () => {
    const booleanControl = await story.booleanControl('Primary')
    await booleanControl.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Add group relation', async () => {
    const booleanControl = await story.booleanControl('Add group relation')
    await booleanControl.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
