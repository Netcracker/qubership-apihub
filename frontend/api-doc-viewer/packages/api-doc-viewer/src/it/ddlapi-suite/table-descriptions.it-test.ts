/**
 * Auto-generated screenshot tests for DDL API Suite/Table Descriptions stories.
 * Regenerate: npm run generate-tests (from packages/api-doc-viewer).
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForDdlTableViewer } from '../service/viewer-waits'

const META_ID = 'ddlapi-suite-table-descriptions'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const TEST_IDS: string[] = [
  'long-description',
  'short-description',
]

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

for (const testId of TEST_IDS) {
  it(testId, async () => {
    const story = await storyPage(page, `${META_ID}--${testId}`)
    await waitForDdlTableViewer(page)
    const component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `${META_ID}-${testId}-${counter}`,
    })
  })
}
