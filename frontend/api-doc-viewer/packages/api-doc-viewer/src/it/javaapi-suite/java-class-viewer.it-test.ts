/**
 * Screenshot tests for Java API Suite/Java Class Viewer stories.
 * Edit together with src/stories/javaapi-suite/java-class-viewer.stories.tsx.
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJavaClassViewer } from '../service/viewer-waits'

const META_ID = 'javaapi-suite-java-class-viewer'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const STORY_IDS: string[] = [
  'class-with-fields-constructor-and-methods',
  'class-with-nested-classes',
  'diff-breaking-and-non-breaking-members',
  'enum-with-constants',
  'interface-with-methods',
  'nested-class',
]

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

for (const storyId of STORY_IDS) {
  it(storyId, async () => {
    const story = await storyPage(page, `${META_ID}--${storyId}`)
    await waitForJavaClassViewer(page)
    const component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `${META_ID}-${storyId}-${counter}`,
    })
  })
}
