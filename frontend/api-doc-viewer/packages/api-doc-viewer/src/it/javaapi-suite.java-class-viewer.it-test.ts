import { storyPage } from './service/storybook-service'
import { waitForVisibleSelector } from './service/viewer-waits'

describe('Java API Suite - Java Class Viewer', () => {
  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

  it.each([
    'class-with-fields-constructor-and-methods',
    'enum-with-constants',
    'class-with-nested-classes',
    'nested-class',
    'diff-breaking-and-non-breaking-members',
    'interface-with-methods',
    'browse-report',
    'browse-diff',
  ])('%s', async storyName => {
    const story = await storyPage(page, `javaapi-suite-java-class-viewer--${storyName}`)
    await waitForVisibleSelector(page, '[data-testid="java-class-viewer"]')
    const component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
