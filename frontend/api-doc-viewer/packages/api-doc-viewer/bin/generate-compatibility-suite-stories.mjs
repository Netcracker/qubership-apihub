import { writeFileSync } from 'fs'
import {
  exitIfInsideNodeModules,
  makeFilePrefix,
  makeMetaId,
  resetDirectory,
  toPascalCase,
} from './compatibility-suite-generation-utils.mjs'

exitIfInsideNodeModules(import.meta.url)

// Dynamic import: must run after exitIfInsideNodeModules because static import breaks the UI component build
const { getCompatibilitySuites, TEST_SPEC_TYPE_GRAPH_QL } = await import(
  '@netcracker/qubership-apihub-compatibility-suites'
)

const STORIES_OUT_DIR = './src/stories/compatibility-suite'
const UTILS_IMPORT_PATH = '../utils/compatibility-suite-utils'

const STORY_GENERATION_CONFIGS = [
  {
    specType: TEST_SPEC_TYPE_GRAPH_QL,
    specTypeConst: 'TEST_SPEC_TYPE_GRAPH_QL',
    displayName: 'GraphQL',
    storyComponentName: 'GraphQLStoryComponent',
    storyArgsTypeName: 'GraphQLCompatibilitySuiteStoryArgs',
    storyArgsGetter: 'getGraphQLStoryArgs',
  },
]

const printStoryFile = (config, suiteId, testIds) => {
  const metaId = makeMetaId(config.specType, suiteId)
  const stories = testIds
    .map((testId) => {
      return `export const ${toPascalCase(testId)}: Story = {
  name: '${testId}',
  args: ${config.storyArgsGetter}(${config.specTypeConst}, SUITE_ID, '${testId}'),
}`
    })
    .join('\n\n')

  return `import '../../index'
import type { Meta, StoryObj } from '@storybook/react'
import { ${config.storyArgsGetter}, ${config.storyArgsTypeName}, ${config.storyComponentName} } from '${UTILS_IMPORT_PATH}'
import { ${config.specTypeConst} } from '@netcracker/qubership-apihub-compatibility-suites'

const meta: Meta<${config.storyArgsTypeName}> = {
  id: '${metaId}',
  title: '${config.displayName} Compatibility Suite/${suiteId}',
  render: ${config.storyComponentName},
}

export default meta
type Story = StoryObj<typeof meta>

const SUITE_ID = '${suiteId}'

${stories}
`
}

resetDirectory(STORIES_OUT_DIR)

for (const config of STORY_GENERATION_CONFIGS) {
  const suites = getCompatibilitySuites(config.specType)
  for (const [suiteId, testIds] of suites.entries()) {
    const filePath = `${STORIES_OUT_DIR}/${makeFilePrefix(config.specType)}-${suiteId}.generated.stories.tsx`
    writeFileSync(filePath, printStoryFile(config, suiteId, testIds))
  }
  console.log(`Generated ${suites.size} story file(s) for ${config.specType}`)
}
