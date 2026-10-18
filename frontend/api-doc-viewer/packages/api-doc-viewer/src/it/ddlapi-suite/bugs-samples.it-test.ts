/**
 * Screenshot tests for DDL API Suite/Bugs stories.
 * Edit together with src/stories/ddlapi-suite/bugs-samples.stories.tsx.
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'

const META_ID = 'ddlapi-suite-bugs'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const STORY_IDS: string[] = [
  'bug-foreign-key',
]

async function waitForDdlTableViewer() {
  await page.waitForSelector('[data-testid="ddl-table-viewer"]', { visible: true })
  await page.waitForFunction(() => document.readyState === 'complete')
  await page.evaluate(() => new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  ))
}

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

for (const storyId of STORY_IDS) {
  it(storyId, async () => {
    const story = await storyPage(page, `${META_ID}--${storyId}`)
    await waitForDdlTableViewer()
    const component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `${META_ID}-${storyId}-${counter}`,
    })
  })
}
