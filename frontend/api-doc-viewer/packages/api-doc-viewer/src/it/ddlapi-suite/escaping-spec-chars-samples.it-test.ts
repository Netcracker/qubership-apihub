/**
 * Auto-generated screenshot tests for DDL API Suite/Escaping Spec Chars stories.
 * Regenerate: npm run generate-tests (from packages/api-doc-viewer).
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'

const META_ID = 'ddlapi-suite-escaping-spec-chars'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const TEST_IDS: string[] = [
  'default-value-backslash',
  'default-value-cr',
  'default-value-crlf',
  'default-value-embedded-single-quotes',
  'default-value-lf',
  'default-value-quoted',
  'default-value-tab',
  'default-value-unicode',
  'generated-expression-composite',
  'generated-expression-quoted',
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
