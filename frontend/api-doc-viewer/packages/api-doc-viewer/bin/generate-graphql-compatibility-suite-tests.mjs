/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { exit } from 'process'
import path from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import pkg from 'lodash'

function goUpLevels(startPath, levels) {
  let current = startPath
  for (let i = 0; i < levels; i++) {
    current = path.dirname(current)
  }
  return current
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const resolvedPath = path.resolve(goUpLevels(__dirname, 3))

if (path.basename(resolvedPath) === 'node_modules') {
  exit()
}

const { getCompatibilitySuites, TEST_SPEC_TYPE_GRAPH_QL } = await import('@netcracker/qubership-apihub-compatibility-suites')

const COMPATIBILITY_SUITE_TESTS_PATH = `./src/it/`

const printFileHeader = () => {
  return `import { StoryPage } from './service/story-page'
import { ViewComponent } from './service/view-component'
import { storyPage } from './service/storybook-service'
`
}

const printTest = (suiteId, testId) => {
  const { kebabCase } = pkg

  // todo: remove after fix this suites, specks are not correct
  if (['apply-schema-directive-to-input-object', 'apply-schema-directive-to-union'].includes(testId)) {
    return ''
  }

  return `  it('${testId}', async () => {
    story = await storyPage(page, 'graphql-compatibility-suite-${suiteId}--${kebabCase(testId)}')
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

const printTestFiles = () => {
  return [...getCompatibilitySuites(TEST_SPEC_TYPE_GRAPH_QL).entries()].map(([suiteId, testIds]) => [suiteId, printTestFile(suiteId, testIds)])
}

if (
  !existsSync(COMPATIBILITY_SUITE_TESTS_PATH)
) {
  mkdirSync(COMPATIBILITY_SUITE_TESTS_PATH, { recursive: true })
}

for (let [suiteId, value] of printTestFiles()) {
  writeFileSync(
    `${COMPATIBILITY_SUITE_TESTS_PATH}/${suiteId}.generated.it-test.ts`,
    value,
  )
}
