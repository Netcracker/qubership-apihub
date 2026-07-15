/**
 * Auto-generated screenshot tests for DDL API Suite/Column Constraints stories.
 * Regenerate: npm run generate-tests (from packages/api-doc-viewer).
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'

const META_ID = 'ddlapi-suite-column-constraints'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const TEST_IDS: string[] = [
  'foreign-key',
  'foreign-key-custom-schema',
  'foreign-key-not-null',
  'foreign-key-unique',
  'foreign-key-unique-not-null',
  'generated-bigserial',
  'generated-expression',
  'generated-expression-not-null',
  'generated-identity',
  'generated-identity-primary-key',
  'generated-serial',
  'generated-smallserial',
  'no-constraints',
  'not-null',
  'primary-key',
  'primary-key-foreign-key',
  'primary-key-foreign-key-not-null',
  'primary-key-not-null',
  'serial-primary-key',
  'unique',
  'unique-not-null',
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
