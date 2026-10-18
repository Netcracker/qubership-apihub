/**
 * Auto-generated screenshot tests for DDL API Suite/Column Types stories.
 * Regenerate: npm run generate-tests (from packages/api-doc-viewer).
 */
import path from 'path'
import { storyPage } from '../service/storybook-service'

const META_ID = 'ddlapi-suite-column-types'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const TEST_IDS: string[] = [
  'bigint',
  'bit',
  'bit-varying',
  'boolean',
  'box',
  'bytea',
  'char',
  'character',
  'character-varying',
  'cidr',
  'circle',
  'date',
  'decimal-precision-scale',
  'domain',
  'double-precision',
  'enum',
  'inet',
  'integer',
  'interval',
  'json',
  'jsonb',
  'line',
  'lseg',
  'macaddr',
  'macaddr-8',
  'money',
  'numeric',
  'numeric-precision-scale',
  'path',
  'point',
  'polygon',
  'real',
  'smallint',
  'text',
  'time',
  'time-precision',
  'time-with-time-zone',
  'timestamp',
  'timestamp-precision',
  'timestamptz',
  'tsquery',
  'tsvector',
  'uuid',
  'varchar',
  'xml',
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
