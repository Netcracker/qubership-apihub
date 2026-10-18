/**
 * Auto-generated screenshot tests for JSON Schema Suite/String  Validations stories.
 * Regenerate: node --experimental-strip-types bin/generate-json-schema-validation-suite-tests.mjs
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-string-validations'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

const TEST_IDS: string[] = [
  'case-001-default-empty',
  'case-002-example-empty',
  'case-003-default-whitespaces',
  'case-004-example-whitespaces',
  'case-005-default-crlf',
  'case-006-example-crlf',
  'case-007-default-cr',
  'case-008-example-cr',
  'case-009-default-lf',
  'case-010-example-lf',
  'case-011-default-tab',
  'case-012-example-tab',
  'case-013-default-padded',
  'case-014-example-padded',
  'case-015-default-plain',
  'case-016-example-plain',
  'case-017-examples-all-samples',
  'case-018-enum-all-samples',
  'case-019-min-length-0',
  'case-020-min-length-1',
  'case-021-max-length-1',
  'case-022-min-length-0-max-length-1',
  'case-023-min-length-1-max-length-2',
  'case-024-pattern-email',
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
