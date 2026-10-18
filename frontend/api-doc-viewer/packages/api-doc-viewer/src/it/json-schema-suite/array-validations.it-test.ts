/**
 * Auto-generated screenshot tests for JSON Schema Suite/Array  Validations stories.
 * Regenerate: node --experimental-strip-types bin/generate-json-schema-validation-suite-tests.mjs
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-array-validations'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

const TEST_IDS: string[] = [
  'case-001-default-arbitrary-array',
  'case-002-example-arbitrary-array',
  'case-003-examples-two-items',
  'case-004-min-items-0',
  'case-005-min-items-2',
  'case-006-max-items-5',
  'case-007-min-items-0-max-items-5',
  'case-008-min-items-2-max-items-5',
  'case-009-unique-items-false',
  'case-010-unique-items-true',
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
