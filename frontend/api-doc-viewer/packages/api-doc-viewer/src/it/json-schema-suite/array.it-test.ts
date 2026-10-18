/**
 * Auto-generated screenshot tests for JSON Schema Suite/Array And Validations/Array stories.
 * Regenerate: node bin/generate-json-schema-suite-tests.mjs (from packages/api-doc-viewer).
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-array'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

const TEST_IDS: string[] = [
  'case-001-type-only',
  'case-002-header',
  'case-003-description',
  'case-004-header-description',
  'case-005-items',
  'case-006-header-items',
  'case-007-description-items',
  'case-008-header-description-items',
  'case-009-additional-items',
  'case-010-header-additional-items',
  'case-011-description-additional-items',
  'case-012-header-description-additional-items',
  'case-013-additional-info',
  'case-014-header-additional-info',
  'case-015-description-additional-info',
  'case-016-header-description-additional-info',
  'case-017-items-additional-info',
  'case-018-header-items-additional-info',
  'case-019-description-items-additional-info',
  'case-020-header-description-items-additional-info',
  'case-021-additional-items-additional-info',
  'case-022-header-additional-items-additional-info',
  'case-023-description-additional-items-additional-info',
  'case-024-header-description-additional-items-additional-info',
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
