/**
 * Auto-generated screenshot tests for JSON Schema Suite/Boolean And Validations/Boolean stories.
 * Regenerate: node bin/generate-json-schema-suite-tests.mjs (from packages/api-doc-viewer).
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-boolean'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

const TEST_IDS: string[] = [
  'case-001-type-only',
  'case-002-header',
  'case-003-description',
  'case-004-header-description',
  'case-005-additional-info',
  'case-006-header-additional-info',
  'case-007-description-additional-info',
  'case-008-header-description-additional-info',
]

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

for (const testId of TEST_IDS) {
  it(testId, async () => {
    const story = await storyPage(page, `${META_ID}--${testId}`)
    await waitForJsonSchemaViewer(page)
    const component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `${META_ID}-${testId}-${counter}`,
    })
  })
}
