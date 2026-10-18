/**
 * Screenshot tests for DDL API Suite/Bugs stories.
 * Edit together with src/stories/ddlapi-suite/bugs.stories.tsx.
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForDdlTableViewer } from '../service/viewer-waits'

const META_ID = 'ddlapi-suite-bugs'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const STORY_IDS: string[] = [
  'bug-foreign-key',
]

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

for (const storyId of STORY_IDS) {
  it(storyId, async () => {
    const story = await storyPage(page, `${META_ID}--${storyId}`)
    await waitForDdlTableViewer(page)
    const component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `${META_ID}-${storyId}-${counter}`,
    })
  })
}
