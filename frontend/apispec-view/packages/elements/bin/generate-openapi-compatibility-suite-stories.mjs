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

const { default: camelCase } = await import('lodash/camelCase.js')
const { default: upperFirst } = await import('lodash/upperFirst.js')
const { storyMetaId, writeOpenApiGeneratedFilesByPairGroup } = await import(
  './compatibility-suite-generation-utils.mjs'
)

console.log('Generate stories')

const COMPATIBILITY_SUITE_STORIES_PATH = 'src/web-components/__stories__/compatibility-suite'

const toPascalCase = (str) => upperFirst(camelCase(str))

const printFileHeader = (suiteId, group) => {
  return `import '../../index'
import { Meta, StoryObj } from '@storybook/react/*'
import { StoryComponent, getStoryArgs, OpenapiCompatibilitySuiteStoryArgs } from '@stoplight/elements/web-components/__stories__/helpers/compatibility-suite-utils'
import { TEST_SPEC_TYPE_OPEN_API } from '@netcracker/qubership-apihub-compatibility-suites'

const meta: Meta<OpenapiCompatibilitySuiteStoryArgs> = {
  title: 'OAS Compatibility Suite ${group}/${suiteId}',
  id: '${storyMetaId(group, suiteId)}',
  render: StoryComponent,
}

export default meta
type Story = StoryObj<typeof meta>
`
}

const printStory = (suiteId, testId, openApiVersionPair) => {
  const storyName = toPascalCase(testId)
  const argsCall = openApiVersionPair
    ? `getStoryArgs(TEST_SPEC_TYPE_OPEN_API, '${suiteId}', '${testId}', ['${openApiVersionPair[0]}', '${
      openApiVersionPair[1]
    }'])`
    : `getStoryArgs(TEST_SPEC_TYPE_OPEN_API, '${suiteId}', '${testId}')`

  return `export const ${storyName}: Story = {
  name: '${testId}',
  args: ${argsCall},
}
`
}

const printStoryFile = (suiteId, group, stories) => {
  const storyStrings = stories.map((s) => printStory(suiteId, s.testId, s.openApiVersionPair))
  return `${printFileHeader(suiteId, group)}
${storyStrings.join('\n')}
`
}

const { totalFiles, groupCount } = writeOpenApiGeneratedFilesByPairGroup(
  COMPATIBILITY_SUITE_STORIES_PATH,
  (suiteId, group) => `${storyMetaId(group, suiteId)}.generated.stories.tsx`,
  (suiteId, group, stories) => printStoryFile(suiteId, group, stories),
)

console.log(`Generated ${totalFiles} story files across ${groupCount} groups`)
