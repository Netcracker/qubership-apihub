/**
 * Auto-generated screenshot tests for JSON Schema Suite/Object  Validations stories.
 * Regenerate: node --experimental-strip-types bin/generate-json-schema-validation-suite-tests.mjs
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-object-validations'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

const TEST_IDS: string[] = [
  'case-001-default-empty-object',
  'case-002-default-small-object',
  'case-003-example-empty-object',
  'case-004-example-small-object',
  'case-005-examples-empty-object',
  'case-006-examples-small-object',
  'case-007-examples-two-objects',
  'case-008-min-properties-0',
  'case-009-min-properties-1',
  'case-010-max-properties-1',
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
