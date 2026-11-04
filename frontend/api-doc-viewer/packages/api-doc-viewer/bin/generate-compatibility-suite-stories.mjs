import { writeFileSync } from 'fs'
import {
  collectOpenApiCasesByPairGroup,
  exitIfInsideNodeModules,
  makeFilePrefix,
  makeMetaId,
  makeOpenApiMetaId,
  openApiPairGroupTitle,
  resetDirectory,
  toPascalCase,
} from './compatibility-suite-generation-utils.mjs'

exitIfInsideNodeModules(import.meta.url)

// Dynamic import: must run after exitIfInsideNodeModules because static import breaks the UI component build
const compatibilitySuites = await import('@netcracker/qubership-apihub-compatibility-suites')
const { getCompatibilitySuites, TEST_SPEC_TYPE_GRAPH_QL, TEST_SPEC_TYPE_DDL_API, TEST_SPEC_TYPE_OPEN_API } = compatibilitySuites

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
  {
    specType: TEST_SPEC_TYPE_DDL_API,
    specTypeConst: 'TEST_SPEC_TYPE_DDL_API',
    displayName: 'DDL API',
    storyComponentName: 'DdlStoryComponent',
    storyArgsTypeName: 'DdlCompatibilitySuiteStoryArgs',
    storyArgsGetter: 'getDdlStoryArgs',
  },
]

// OpenAPI: one file per (version-pair group, suite), stories get the version pair of their group.
const OPENAPI_CONFIG = {
  specType: TEST_SPEC_TYPE_OPEN_API,
  specTypeConst: 'TEST_SPEC_TYPE_OPEN_API',
  displayName: 'OpenAPI',
  storyComponentName: 'OpenApiStoryComponent',
  storyArgsTypeName: 'OpenApiCompatibilitySuiteStoryArgs',
  storyArgsGetter: 'getOpenApiStoryArgs',
}

/** One story per case; `versionPair` (OpenAPI) is passed to `getCompatibilitySuite`. */
const printStoryFile = (config, { metaId, title }, cases) => {
  const stories = cases
    .map(({ testId, versionPair }) => {
      const versionPairArg = versionPair ? `, ['${versionPair[0]}', '${versionPair[1]}']` : ''
      return `export const ${toPascalCase(testId)}: Story = {
  name: '${testId}',
  args: ${config.storyArgsGetter}(${config.specTypeConst}, SUITE_ID, '${testId}'${versionPairArg}),
}`
    })
    .join('\n\n')
  const suiteId = title.split('/').pop()

  return `import '../../index'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ${config.storyArgsGetter}, ${config.storyArgsTypeName}, ${config.storyComponentName} } from '${UTILS_IMPORT_PATH}'
import { ${config.specTypeConst} } from '@netcracker/qubership-apihub-compatibility-suites'

const meta: Meta<${config.storyArgsTypeName}> = {
  id: '${metaId}',
  title: '${title}',
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
    const meta = { metaId: makeMetaId(config.specType, suiteId), title: `${config.displayName} Compatibility Suite/${suiteId}` }
    writeFileSync(filePath, printStoryFile(config, meta, testIds.map(testId => ({ testId }))))
  }
  console.log(`Generated ${suites.size} story file(s) for ${config.specType}`)
}

let openApiFiles = 0
for (const [group, suites] of collectOpenApiCasesByPairGroup(compatibilitySuites).entries()) {
  for (const [suiteId, cases] of suites.entries()) {
    const metaId = makeOpenApiMetaId(OPENAPI_CONFIG.specType, group, suiteId)
    const meta = { metaId, title: `${OPENAPI_CONFIG.displayName} Compatibility Suite/${openApiPairGroupTitle(group)}/${suiteId}` }
    writeFileSync(`${STORIES_OUT_DIR}/${metaId}.generated.stories.tsx`, printStoryFile(OPENAPI_CONFIG, meta, cases))
    openApiFiles++
  }
}
console.log(`Generated ${openApiFiles} story file(s) for ${OPENAPI_CONFIG.specType}`)
