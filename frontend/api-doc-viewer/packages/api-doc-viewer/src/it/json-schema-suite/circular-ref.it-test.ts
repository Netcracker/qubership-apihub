/**
 * Screenshot tests for the JSON Schema Suite circular $ref stories.
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-circular-ref'
const TEST_IDS = [
  'cycled',
  'cycled-with-extension',
  'cycled-through-all-of',
  'cycled-through-all-of-with-extension',
]
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

it.each(TEST_IDS)('%s', async (testId) => {
  const story = await storyPage(page, `${META_ID}--${testId}`)
  await waitForJsonSchemaViewer(page)
  const component = await story.viewComponent()
  expect(await component.captureScreenshot()).toMatchImageSnapshot({
    customSnapshotsDir: SNAPSHOTS_DIR,
    customSnapshotIdentifier: `${META_ID}-${testId}`,
  })
})
