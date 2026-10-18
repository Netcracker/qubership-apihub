/**
 * Auto-generated screenshot tests for JSON Schema Suite/Object And Validations/Object stories.
 * Regenerate: node bin/generate-json-schema-suite-tests.mjs (from packages/api-doc-viewer).
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-object'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

const TEST_IDS: string[] = [
  'case-001-type-only',
  'case-002-header',
  'case-003-description',
  'case-004-header-description',
  'case-005-properties',
  'case-006-header-properties',
  'case-007-description-properties',
  'case-008-header-description-properties',
  'case-009-additional-properties',
  'case-010-header-additional-properties',
  'case-011-description-additional-properties',
  'case-012-header-description-additional-properties',
  'case-013-properties-additional-properties',
  'case-014-header-properties-additional-properties',
  'case-015-description-properties-additional-properties',
  'case-016-header-description-properties-additional-properties',
  'case-017-additional-info',
  'case-018-header-additional-info',
  'case-019-description-additional-info',
  'case-020-header-description-additional-info',
  'case-021-properties-additional-info',
  'case-022-header-properties-additional-info',
  'case-023-description-properties-additional-info',
  'case-024-header-description-properties-additional-info',
  'case-025-additional-properties-additional-info',
  'case-026-header-additional-properties-additional-info',
  'case-027-description-additional-properties-additional-info',
  'case-028-header-description-additional-properties-additional-info',
  'case-029-properties-additional-properties-additional-info',
  'case-030-header-properties-additional-properties-additional-info',
  'case-031-description-properties-additional-properties-additional-info',
  'case-032-header-description-properties-additional-properties-additional-info',
  'case-033-additional-properties-true',
  'case-034-additional-properties-false',
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
