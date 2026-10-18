/**
 * Screenshot tests for DDL API Suite/E2E Scenarios stories.
 * Edit together with src/stories/ddlapi-suite/e2e-scenarios-samples.stories.tsx.
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'

const META_ID = 'ddlapi-suite-e2e-scenarios'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const STORY_IDS: string[] = [
  'users',
  'employees',
  'projects',
  'employees-projects',
  'users-plus-idx',
  'petstore',
  'no-heading-with-table-name',
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
