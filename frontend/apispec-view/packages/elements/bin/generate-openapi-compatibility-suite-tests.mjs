import { existsSync, mkdirSync, writeFileSync } from 'fs'
import pkg from 'lodash'
import path from 'path'
import { exit } from 'process'

if (import.meta.dirname.split(path.sep).at(-2) !== 'elements') {
  exit()
}
console.log('Generate tests')

const COMPATIBILITY_SUITE_TESTS_PATH = `./src/it/`
const { getCompatibilitySuites, TEST_SPEC_TYPE_OPEN_API } = await import('@netcracker/qubership-apihub-compatibility-suites')

const toPascalCase = str =>
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map(x => x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase())
    .join('')

const printFileHeader = () => {
  return `import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'
`
}

const printTest = (suiteId, testId) => {
  const { kebabCase } = pkg
  return `  it('${testId}', async () => {
    story = await storyPage(page, 'openapi-compatibility-suite-${suiteId}--${kebabCase(testId)}')
    component = await story.viewComponent()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
`
}

const printDescribe = (suiteId, testIds) => {
  return `describe('', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
  })

${testIds.map(testId => printTest(suiteId, testId)).join('\n')}
})
`
}

const printTestFile = (suiteId, testIds) => {
  return `${printFileHeader()}
${printDescribe(suiteId, testIds)}
`
}

const EXCLUDED_SUITE_IDS = ['human-readable']

const printTestFiles = () => {
  return [...getCompatibilitySuites(TEST_SPEC_TYPE_OPEN_API).entries()]
    .filter(([suiteId]) => !EXCLUDED_SUITE_IDS.includes(suiteId))
    .map(([suiteId, testIds]) => [suiteId, printTestFile(suiteId, testIds)])
}

if (
  !existsSync(COMPATIBILITY_SUITE_TESTS_PATH)
) {
  mkdirSync(COMPATIBILITY_SUITE_TESTS_PATH)
}

for (let [suiteId, value] of printTestFiles()) {
  writeFileSync(
    `${COMPATIBILITY_SUITE_TESTS_PATH}/${suiteId}.generated.it-test.ts`,
    value,
  )
}
