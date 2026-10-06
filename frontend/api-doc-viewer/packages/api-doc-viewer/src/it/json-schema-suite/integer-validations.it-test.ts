/**
 * Auto-generated screenshot tests for JSON Schema Suite/Integer  Validations stories.
 * Regenerate: node --experimental-strip-types bin/generate-json-schema-validation-suite-tests.mjs
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-integer-validations'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

const TEST_IDS: string[] = [
  'case-001-default-0',
  'case-002-example-0',
  'case-003-default-1',
  'case-004-example-1',
  'case-005-default-1',
  'case-006-example-1',
  'case-007-examples-0',
  'case-008-examples-1',
  'case-009-examples-minus-1',
  'case-010-examples-minus-1-0-1',
  'case-011-multiple-of-0',
  'case-012-multiple-of-1',
  'case-013-multiple-of-1',
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
