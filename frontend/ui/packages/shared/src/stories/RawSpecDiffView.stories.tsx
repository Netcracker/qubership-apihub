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

import type { Meta, StoryObj } from '@storybook/react'
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

export const YamlDiffsStory: Story = {
  name: 'YAML',
  args: {
    beforeValue: toYaml(openapiSample),
    afterValue: toYaml(openapiChangedSample),
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

export const FullyAddedStory: Story = {
  name: 'Fully Added',
  args: {
    beforeValue: '',
    afterValue: toYaml(openapiSample),
    type: OPENAPI_3_0_SPEC_TYPE,
    extension: YAML_FILE_EXTENSION,
  },
}

export const FullyRemovedStory: Story = {
  name: 'Fully Removed',
  args: {
    beforeValue: toYaml(openapiSample),
    afterValue: '',
    type: OPENAPI_3_0_SPEC_TYPE,
    extension: YAML_FILE_EXTENSION,
  },
}

