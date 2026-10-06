/**
 * Screenshot tests for JSON Schema Suite/Top Level Props Media Types.
 * Edit together with src/stories/json-schema-suite/top-level-props-media-types.stories.tsx
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForJsonSchemaViewer } from '../service/viewer-waits'

const META_ID = 'json-schema-suite-top-level-props-media-types'
const TEST_IDS = ['detailed-mode', 'simple-mode']
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
