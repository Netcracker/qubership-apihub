/**
 * Auto-generated screenshot tests for DDL API Suite/Indexes stories.
 * Regenerate: npm run generate-tests (from packages/api-doc-viewer).
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForDdlTableViewer } from '../service/viewer-waits'

const META_ID = 'ddlapi-suite-indexes'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const TEST_IDS: string[] = [
  'covering-include',
  'expression',
  'nulls-not-distinct',
  'one-column',
  'one-column-unique',
  'partial',
  'two-columns',
  'two-columns-unique',
  'unnamed-index',
  'unnamed-index-unique',
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
