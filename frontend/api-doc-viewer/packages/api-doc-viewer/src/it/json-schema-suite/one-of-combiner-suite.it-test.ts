/**
 * Auto-generated screenshot tests for JSON Schema Suite/One Of Combiner Suite stories.
 * Regenerate: node --experimental-strip-types bin/generate-combiner-suite-tests.mjs
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-one-of-combiner-suite'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

const TEST_IDS: string[] = [
  'case-001-string-schema',
  'case-002-number-schema',
  'case-003-integer-schema',
  'case-004-boolean-schema',
  'case-005-array-schema',
  'case-006-object-schema',
  'case-007-all-types-schema',
  'case-008-string-my-string-null-schema',
  'case-009-string-null-iso-date-time-schema',
  'case-010-string-my-string-iso-date-time-schema',
  'case-011-number-my-number-null-schema',
  'case-012-number-null-iso-date-time-schema',
  'case-013-number-my-number-iso-date-time-schema',
  'case-014-integer-my-integer-null-schema',
  'case-015-integer-null-iso-date-time-schema',
  'case-016-integer-my-integer-iso-date-time-schema',
  'case-017-boolean-my-boolean-null-schema',
  'case-018-boolean-null-iso-date-time-schema',
  'case-019-boolean-my-boolean-iso-date-time-schema',
  'case-020-array-my-array-null-schema',
  'case-021-array-null-iso-date-time-schema',
  'case-022-array-my-array-iso-date-time-schema',
  'case-023-object-my-object-null-schema',
  'case-024-object-null-iso-date-time-schema',
  'case-025-object-my-object-iso-date-time-schema',
  'case-026-string-schema-one-of',
  'case-027-number-schema-one-of',
  'case-028-integer-schema-one-of',
  'case-029-boolean-schema-one-of',
  'case-030-array-schema-one-of',
  'case-031-object-schema-one-of',
  'case-032-string-schema-any-of',
  'case-033-number-schema-any-of',
  'case-034-integer-schema-any-of',
  'case-035-boolean-schema-any-of',
  'case-036-array-schema-any-of',
  'case-037-object-schema-any-of',
  'case-038-string-schema-all-of',
  'case-039-number-schema-all-of',
  'case-040-integer-schema-all-of',
  'case-041-boolean-schema-all-of',
  'case-042-array-schema-all-of',
  'case-043-object-schema-all-of',
  'case-044-string-schema-one-of-one-of',
  'case-045-number-schema-one-of-one-of',
  'case-046-integer-schema-one-of-one-of',
  'case-047-boolean-schema-one-of-one-of',
  'case-048-array-schema-one-of-one-of',
  'case-049-object-schema-one-of-one-of',
  'case-050-string-schema-one-of-any-of',
  'case-051-number-schema-one-of-any-of',
  'case-052-integer-schema-one-of-any-of',
  'case-053-boolean-schema-one-of-any-of',
  'case-054-array-schema-one-of-any-of',
  'case-055-object-schema-one-of-any-of',
  'case-056-string-schema-one-of-all-of',
  'case-057-number-schema-one-of-all-of',
  'case-058-integer-schema-one-of-all-of',
  'case-059-boolean-schema-one-of-all-of',
  'case-060-array-schema-one-of-all-of',
  'case-061-object-schema-one-of-all-of',
  'case-062-string-schema-any-of-one-of',
  'case-063-number-schema-any-of-one-of',
  'case-064-integer-schema-any-of-one-of',
  'case-065-boolean-schema-any-of-one-of',
  'case-066-array-schema-any-of-one-of',
  'case-067-object-schema-any-of-one-of',
  'case-068-string-schema-any-of-any-of',
  'case-069-number-schema-any-of-any-of',
  'case-070-integer-schema-any-of-any-of',
  'case-071-boolean-schema-any-of-any-of',
  'case-072-array-schema-any-of-any-of',
  'case-073-object-schema-any-of-any-of',
  'case-074-string-schema-any-of-all-of',
  'case-075-number-schema-any-of-all-of',
  'case-076-integer-schema-any-of-all-of',
  'case-077-boolean-schema-any-of-all-of',
  'case-078-array-schema-any-of-all-of',
  'case-079-object-schema-any-of-all-of',
  'case-080-string-schema-all-of-one-of',
  'case-081-number-schema-all-of-one-of',
  'case-082-integer-schema-all-of-one-of',
  'case-083-boolean-schema-all-of-one-of',
  'case-084-array-schema-all-of-one-of',
  'case-085-object-schema-all-of-one-of',
  'case-086-string-schema-all-of-any-of',
  'case-087-number-schema-all-of-any-of',
  'case-088-integer-schema-all-of-any-of',
  'case-089-boolean-schema-all-of-any-of',
  'case-090-array-schema-all-of-any-of',
  'case-091-object-schema-all-of-any-of',
  'case-092-string-schema-all-of-all-of',
  'case-093-number-schema-all-of-all-of',
  'case-094-integer-schema-all-of-all-of',
  'case-095-boolean-schema-all-of-all-of',
  'case-096-array-schema-all-of-all-of',
  'case-097-object-schema-all-of-all-of',
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
