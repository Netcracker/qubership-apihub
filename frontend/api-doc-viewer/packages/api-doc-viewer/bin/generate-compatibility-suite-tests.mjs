import { writeFileSync } from 'fs'
import { kebabCase } from 'lodash-es'
import {
  collectOpenApiCasesByPairGroup,
  exitIfInsideNodeModules,
  makeFilePrefix,
  makeMetaId,
  makeOpenApiFilePrefix,
  makeOpenApiMetaId,
  removeGeneratedFiles,
} from './compatibility-suite-generation-utils.mjs'

exitIfInsideNodeModules(import.meta.url)

// Dynamic import: must run after exitIfInsideNodeModules because static import breaks the UI component build
const compatibilitySuites = await import('@netcracker/qubership-apihub-compatibility-suites')
const { getCompatibilitySuites, TEST_SPEC_TYPE_GRAPH_QL, TEST_SPEC_TYPE_DDL_API, TEST_SPEC_TYPE_OPEN_API } = compatibilitySuites

const TESTS_OUT_DIR = './src/it/compatibility-suite'

const TEST_GENERATION_CONFIGS = [
  {
    specType: TEST_SPEC_TYPE_GRAPH_QL,
    // TODO: Migrated from the old generator; original reason for skipping is "specs are not correct". Remove after investigation.
    skipTestIds: new Set([
      'apply-schema-directive-to-input-object',
      'apply-schema-directive-to-union',
    ]),
  },
  {
    specType: TEST_SPEC_TYPE_DDL_API,
    visibleSelector: '[data-testid="ddl-table-diffs-viewer"]',
  },
]

const OPENAPI_VISIBLE_SELECTOR = '[data-testid="openapi-operation-diffs-viewer"]'

// Storybook sanitizes PascalCase export names to kebab-case story IDs.
// We pre-compute kebab-case at generation time (like apispec-view).
// Baselines live per test run (the runner's test-run id = the file prefix):
// `src/it/compatibility-suite/<test-run>/__image_snapshots__/`.
const printTestFile = (testRunId, metaId, testIds, visibleSelector) => {
  const testIdsLiteral = testIds.map(id => `  '${kebabCase(id)}',`).join('\n')
  const visibleSelectorLiteral = visibleSelector === undefined ? 'undefined' : JSON.stringify(visibleSelector)

  return `import path from 'path'
import { storyPage } from '../service/storybook-service'
import { waitForVisibleSelector } from '../service/viewer-waits'

const META_ID = '${metaId}'
const SNAPSHOTS_DIR = path.resolve(__dirname, '${testRunId}', '__image_snapshots__')

const TEST_IDS: string[] = [
${testIdsLiteral}
]

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

for (const testId of TEST_IDS) {
  it(testId, async () => {
    const story = await storyPage(page, \`\${META_ID}--\${testId}\`)
    await waitForVisibleSelector(page, ${visibleSelectorLiteral})
    const component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => \`\${META_ID}-\${testId}-\${counter}\`,
    })
  })
}
`
}

// Only the generated ITs: the folder also holds the committed baselines.
removeGeneratedFiles(TESTS_OUT_DIR, '.generated.it-test.ts')

for (const config of TEST_GENERATION_CONFIGS) {
  const suites = getCompatibilitySuites(config.specType)
  let generated = 0
  for (const [suiteId, testIds] of suites.entries()) {
    if (config.skipSuiteIds?.has(suiteId)) continue
    const metaId = makeMetaId(config.specType, suiteId)
    const filtered = testIds.filter(id => !config.skipTestIds || !config.skipTestIds.has(id))
    const filePath = `${TESTS_OUT_DIR}/${makeFilePrefix(config.specType)}-${suiteId}.generated.it-test.ts`
    writeFileSync(filePath, printTestFile(makeFilePrefix(config.specType), metaId, filtered, config.visibleSelector))
    generated++
  }
  console.log(`Generated ${generated}/${suites.size} test file(s) for ${config.specType}`)
}

// OpenAPI: one file per (version-pair group, suite) = one runner suite of test run
// `openapi-compatibility-suite-<before><after>` (e.g. `-30-31`).
let openApiFiles = 0
for (const [group, suites] of collectOpenApiCasesByPairGroup(compatibilitySuites).entries()) {
  for (const [suiteId, cases] of suites.entries()) {
    const metaId = makeOpenApiMetaId(TEST_SPEC_TYPE_OPEN_API, group, suiteId)
    writeFileSync(
      `${TESTS_OUT_DIR}/${metaId}.generated.it-test.ts`,
      printTestFile(makeOpenApiFilePrefix(TEST_SPEC_TYPE_OPEN_API, group), metaId, cases.map(({ testId }) => testId), OPENAPI_VISIBLE_SELECTOR),
    )
    openApiFiles++
  }
}
console.log(`Generated ${openApiFiles} test file(s) for ${TEST_SPEC_TYPE_OPEN_API}`)
