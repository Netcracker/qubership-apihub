/**
 * Auto-generated screenshot tests for JSON Schema Suite/Integer Validations Value Range stories.
 * Regenerate: node --experimental-strip-types bin/generate-json-schema-validation-suite-tests.mjs
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-integer-validations-value-range'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

const TEST_IDS: string[] = [
  'case-001-value-range-min-0-inclusive',
  'case-002-value-range-min-1-inclusive',
  'case-003-value-range-min-1-exclusive-oas-30',
  'case-004-value-range-max-0-inclusive',
  'case-005-value-range-max-10-inclusive',
  'case-006-value-range-max-10-exclusive-oas-30',
  'case-007-value-range-min-0-max-10-both-inclusive',
  'case-008-value-range-min-1-max-10-both-inclusive',
  'case-009-value-range-min-0-max-10-max-exclusive-oas-30',
  'case-010-value-range-min-1-max-10-max-exclusive-oas-30',
  'case-011-value-range-min-1-exclusive-max-10-inclusive-oas-30',
  'case-012-value-range-min-1-inclusive-max-10-exclusive-oas-30',
  'case-013-value-range-min-1-exclusive-max-10-exclusive-oas-30',
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
