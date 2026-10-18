/**
 * Auto-generated screenshot tests for JSON Schema Suite/Boolean  Validations stories.
 * Regenerate: node --experimental-strip-types bin/generate-json-schema-validation-suite-tests.mjs
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-boolean-validations'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

const TEST_IDS: string[] = [
  'case-001-default-false',
  'case-002-default-true',
  'case-003-example-false',
  'case-004-example-true',
  'case-005-examples-false',
  'case-006-examples-true',
  'case-007-examples-true-false',
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
