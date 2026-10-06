/**
 * Screenshot test for JSON Schema Suite circular $ref story.
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-circular-ref'
const TEST_ID = 'cycled'
const SNAPSHOTS_DIR = path.resolve(__dirname, '__image_snapshots__')

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

it(TEST_ID, async () => {
  const story = await storyPage(page, `${META_ID}--${TEST_ID}`)
  await waitForJsonSchemaViewer(page)
  const component = await story.viewComponent()
  expect(await component.captureScreenshot()).toMatchImageSnapshot({
    customSnapshotsDir: SNAPSHOTS_DIR,
    customSnapshotIdentifier: `${META_ID}-${TEST_ID}`,
  })
})
