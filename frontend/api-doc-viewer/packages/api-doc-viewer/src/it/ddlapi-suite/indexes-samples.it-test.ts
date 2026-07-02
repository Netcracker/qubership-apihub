/**
 * Auto-generated screenshot tests for DDL API Suite/Indexes stories.
 * Regenerate: npm run generate-tests (from packages/api-doc-viewer).
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'

const META_ID = 'ddlapi-suite-indexes'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const TEST_IDS: string[] = [
  'covering-include',
  'expression',
  'nulls-not-distinct',
  'one-column',
  'one-column-unique',
  'partial',
  'two-columns',
  'two-columns-unique',
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

for (const testId of TEST_IDS) {
  it(testId, async () => {
    const story = await storyPage(page, `${META_ID}--${testId}`)
    await waitForDdlTableViewer()
    const component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `${META_ID}-${testId}-${counter}`,
    })
  })
}
