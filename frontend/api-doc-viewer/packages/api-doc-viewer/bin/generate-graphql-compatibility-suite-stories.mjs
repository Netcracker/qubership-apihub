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

const fileName = path.resolve('./../..').split('\\').pop()
if (fileName === 'node_modules') {
  exit()
}

const { getCompatibilitySuites, TEST_SPEC_TYPE_GRAPH_QL } = await import('@netcracker/qubership-apihub-compatibility-suites')

const COMPATIBILITY_SUITE_STORIES_PATH = `./src/stories/graphql-compatibility-suite`

const toPascalCase = str =>
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map(x => x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase())
    .join('')

const printFileHeader = (suiteId) => {
  return `import '../../index'
import type { Meta, StoryObj } from '@storybook/react'
import { getStoryArgs, GraphQLCompatibilitySuiteStoryArgs, GraphQLStoryComponent } from '../utils/compatibility-suite-utils'
import { TEST_SPEC_TYPE_GRAPH_QL } from '@netcracker/qubership-apihub-compatibility-suites'

const meta: Meta<GraphQLCompatibilitySuiteStoryArgs> = {
  title: 'graphql-compatibility-suite/${suiteId}',
}

export default meta
type Story = StoryObj<typeof meta>
`
}

const printStory = (suiteId, testId) => {
  const storyName = toPascalCase(testId)
  return `export const ${storyName}: Story = {
  name: '${testId}',
  render: GraphQLStoryComponent,
  args: getStoryArgs(TEST_SPEC_TYPE_GRAPH_QL, '${suiteId}', '${testId}'),
}
`
}

const printStoryFile = (suiteId, testIds) => {
  return `${printFileHeader(suiteId)}
${testIds.map(testId => printStory(suiteId, testId)).join('\n')}
`
}

const printStoryFiles = () => {
  return [...getCompatibilitySuites(TEST_SPEC_TYPE_GRAPH_QL).entries()].map(([suiteId, testIds]) => [suiteId, printStoryFile(suiteId, testIds)])
}

if (!existsSync(COMPATIBILITY_SUITE_STORIES_PATH)) {
  mkdirSync(COMPATIBILITY_SUITE_STORIES_PATH, { recursive: true })
}

for (let [suiteId, value] of printStoryFiles()) {
  writeFileSync(
    `${COMPATIBILITY_SUITE_STORIES_PATH}/${suiteId}.generated.stories.tsx`,
    value,
  )
}
