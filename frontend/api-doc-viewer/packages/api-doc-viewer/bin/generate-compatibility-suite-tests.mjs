import { writeFileSync } from 'fs'
import { kebabCase } from 'lodash-es'
import {
  exitIfInsideNodeModules,
  makeFilePrefix,
  makeMetaId,
  resetDirectory,
} from './compatibility-suite-generation-utils.mjs'

exitIfInsideNodeModules(import.meta.url)

// Dynamic import: must run after exitIfInsideNodeModules because static import breaks the UI component build
const { getCompatibilitySuites, TEST_SPEC_TYPE_GRAPH_QL } = await import(
  '@netcracker/qubership-apihub-compatibility-suites'
)

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
]

// Storybook sanitizes PascalCase export names to kebab-case story IDs.
// We pre-compute kebab-case at generation time (like apispec-view).
const printTestFile = (metaId, testIds) => {
  const testIdsLiteral = testIds.map(id => `  '${kebabCase(id)}',`).join('\n')

  return `import path from 'path'
import { storyPage } from '../service/storybook-service'

const META_ID = '${metaId}'
const SNAPSHOTS_DIR = path.resolve(__dirname, '..', '__image_snapshots__')

const TEST_IDS: string[] = [
${testIdsLiteral}
]

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

for (const testId of TEST_IDS) {
  it(testId, async () => {
    const story = await storyPage(page, \`\${META_ID}--\${testId}\`)
    const component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => \`\${META_ID}-\${testId}-\${counter}\`,
    })
  })
}
`
}

resetDirectory(TESTS_OUT_DIR)

for (const config of TEST_GENERATION_CONFIGS) {
  const suites = getCompatibilitySuites(config.specType)
  let generated = 0
  for (const [suiteId, testIds] of suites.entries()) {
    if (config.skipSuiteIds?.has(suiteId)) continue
    const metaId = makeMetaId(config.specType, suiteId)
    const filtered = testIds.filter(id => !config.skipTestIds || !config.skipTestIds.has(id))
    const filePath = `${TESTS_OUT_DIR}/${makeFilePrefix(config.specType)}-${suiteId}.generated.it-test.ts`
    writeFileSync(filePath, printTestFile(metaId, filtered))
    generated++
  }
  console.log(`Generated ${generated}/${suites.size} test file(s) for ${config.specType}`)
}
