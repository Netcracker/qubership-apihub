import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { exit } from 'process'

if (import.meta.dirname.split(path.sep).at(-2) !== 'elements') {
  exit() 
}
console.log('Generate stories')

const COMPATIBILITY_SUITE_STORIES_PATH = `./src/web-components/__stories__/compatibility-suite`
const { getCompatibilitySuites, TEST_SPEC_TYPE_OPEN_API } = await import('@netcracker/qubership-apihub-compatibility-suites')

const toPascalCase = str =>
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map(x => x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase())
    .join('')

const printFileHeader = (suiteId) => {
  return `import '../../index'
import { Meta, StoryObj } from '@storybook/react/*'
import { StoryComponent, getStoryArgs, OpenapiCompatibilitySuiteStoryArgs } from '@stoplight/elements/web-components/__stories__/helpers/compatibility-suite-utils'
import { TEST_SPEC_TYPE_OPEN_API } from '@netcracker/qubership-apihub-compatibility-suites'

const meta: Meta<OpenapiCompatibilitySuiteStoryArgs> = {
  title: 'openapi-compatibility-suite/${suiteId}',
}

export default meta
type Story = StoryObj<typeof meta>
`
}

const printStory = (suiteId, testId) => {
  const storyName = toPascalCase(testId)
  return `export const ${storyName}: Story = {
  name: '${testId}',
  render: StoryComponent,
  args: getStoryArgs(TEST_SPEC_TYPE_OPEN_API, '${suiteId}', '${testId}'),
}
`
}

const printStoryFile = (suiteId, testIds) => {
  return `${printFileHeader(suiteId)}
${testIds.map(testId => printStory(suiteId, testId)).join('\n')}
`
}

const EXCLUDED_SUITE_IDS = ['human-readable']

const printStoryFiles = () => {
  return [...getCompatibilitySuites(TEST_SPEC_TYPE_OPEN_API).entries()]
    .filter(([suiteId]) => !EXCLUDED_SUITE_IDS.includes(suiteId))
    .map(([suiteId, testIds]) => [suiteId, printStoryFile(suiteId, testIds)])
}

if (!existsSync(COMPATIBILITY_SUITE_STORIES_PATH)) {
  mkdirSync(COMPATIBILITY_SUITE_STORIES_PATH)
}

for (let [suiteId, value] of printStoryFiles()) {
  writeFileSync(
    `${COMPATIBILITY_SUITE_STORIES_PATH}/${suiteId}.generated.stories.tsx`,
    value,
  )
}
