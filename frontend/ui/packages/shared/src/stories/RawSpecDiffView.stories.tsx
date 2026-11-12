import type { Meta, StoryObj } from '@storybook/react-vite'
import { RawSpecDiffView } from '../components/RawSpecDiffView'
import { toYaml } from '../utils/specifications'
import { openapiChangedSample, openapiSample } from './samples/openapi-samples'
import { GRAPHQL_SPEC_TYPE, OPENAPI_3_0_SPEC_TYPE } from '../utils/specs'
import { GRAPHQL_FILE_EXTENSION, YAML_FILE_EXTENSION } from '../utils/files'
import { fullHeight } from './commons/decorators'
import { graphqlChangedSample, graphqlSample } from './samples/graphql-samples'
import { toFormattedJsonString } from '../utils/strings'

const meta: Meta<typeof RawSpecDiffView> = {
  component: RawSpecDiffView,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [fullHeight],
}

export default meta
type Story = StoryObj<typeof meta>

const YAML_DIFFS_BEFORE = toYaml(openapiSample)
const YAML_DIFFS_AFTER = toYaml(openapiChangedSample)
export const YamlDiffsStory: Story = {
  name: 'YAML',
  args: {
    beforeValue: YAML_DIFFS_BEFORE ?? undefined,
    afterValue: YAML_DIFFS_AFTER ?? undefined,
    type: OPENAPI_3_0_SPEC_TYPE,
    extension: YAML_FILE_EXTENSION,
  },
}

export const GraphqlDiffsStory: Story = {
  name: 'GraphQL',
  args: {
    beforeValue: toFormattedJsonString(graphqlSample),
    afterValue: toFormattedJsonString(graphqlChangedSample),
    type: GRAPHQL_SPEC_TYPE,
    extension: GRAPHQL_FILE_EXTENSION,
  },
}

const FULLY_ADDED_AFTER = toYaml(openapiSample)
export const FullyAddedStory: Story = {
  name: 'Fully Added',
  args: {
    beforeValue: '',
    afterValue: FULLY_ADDED_AFTER ?? undefined,
    type: OPENAPI_3_0_SPEC_TYPE,
    extension: YAML_FILE_EXTENSION,
  },
}

const FULLY_REMOVED_BEFORE = toYaml(openapiSample)
export const FullyRemovedStory: Story = {
  name: 'Fully Removed',
  args: {
    beforeValue: FULLY_REMOVED_BEFORE ?? undefined,
    afterValue: '',
    type: OPENAPI_3_0_SPEC_TYPE,
    extension: YAML_FILE_EXTENSION,
  },
}

