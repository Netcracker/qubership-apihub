import path from 'path'
import { exit } from 'process'
import { fileURLToPath } from 'url'

// Prevent running generators from an installed package in node_modules.
// We only generate when executing from the repo workspace at: packages/elements/bin/*
const __filename = fileURLToPath(import.meta.url)
const binDir = path.dirname(__filename) // .../packages/elements/bin
const elementsDir = path.dirname(binDir) // .../packages/elements
if (path.basename(elementsDir) !== 'elements') {
  exit()
}

const { default: kebabCase } = await import('lodash/kebabCase.js')
const { storyMetaId, writeOpenApiGeneratedFilesByPairGroup } = await import(
  './compatibility-suite-generation-utils.mjs'
)

console.log('Generate tests')

const COMPATIBILITY_SUITE_TESTS_PATH = 'src/it'

const printFileHeader = () => {
  return `import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'
`
}

const printTest = (suiteId, testId, group) => {
  const metaId = storyMetaId(group, suiteId)
  return `  it('${testId}', async () => {
    story = await storyPage(page, '${metaId}--${kebabCase(testId)}')
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
`
}

const printDescribe = (suiteId, group, stories) => {
  const tests = stories.map((s) => printTest(suiteId, s.testId, group))
  return `describe('${storyMetaId(group, suiteId)}', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

${tests.join('\n')}
})
`
}

const printTestFile = (suiteId, group, stories) => {
  return `${printFileHeader()}
${printDescribe(suiteId, group, stories)}
`
}

const { totalFiles, groupCount } = writeOpenApiGeneratedFilesByPairGroup(
  COMPATIBILITY_SUITE_TESTS_PATH,
  (suiteId, group) => `${storyMetaId(group, suiteId)}.generated.it-test.ts`,
  (suiteId, group, stories) => printTestFile(suiteId, group, stories),
)

console.log(`Generated ${totalFiles} test files across ${groupCount} groups`)
