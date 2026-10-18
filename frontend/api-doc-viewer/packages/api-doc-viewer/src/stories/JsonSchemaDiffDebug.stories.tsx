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

import { JsonSchemaDiffsViewer } from '@apihub/components/JsonSchemaViewer/JsonSchemaDiffsViewer';
import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff';
import { isObject } from '@netcracker/qubership-apihub-json-crawl';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { prepareJsonDiffSchema, REQUEST_BODY_TARGET } from './preprocess';
import { parseYamlSource } from './utils/parse-yaml-source';

type StoryArgs = ComponentProps<typeof JsonSchemaDiffsViewer> & {
  beforeSchemaText: string
  afterSchemaText: string
  beforeComponentsText?: string
  afterComponentsText?: string
}

const DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Debug/Json Schema Diff Viewer',
  component: JsonSchemaDiffsViewer,
  parameters: {},
  argTypes: {
    beforeSchemaText: {
      control: 'text',
    },
    afterSchemaText: {
      control: 'text',
    },
    beforeComponentsText: {
      control: 'text',
    },
    afterComponentsText: {
      control: 'text',
    },
    schema: {
      control: { disable: true },
      table: { disable: true },
    },
    diffMetaKeys: {
      control: { disable: true },
      table: { disable: true },
    },
  },
  args: {
    beforeSchemaText: '',
    afterSchemaText: '',
    beforeComponentsText: '',
    afterComponentsText: '',
    diffMetaKeys: DIFF_META_KEYS,
    hideUnchangedNodes: false,
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>

export const Debug: Story = {
  args: {
    beforeSchemaText: '',
    afterSchemaText: '',
    beforeComponentsText: '',
    afterComponentsText: '',
    expandedDepth: 2,
    diffMetaKeys: DIFF_META_KEYS,
    hideUnchangedNodes: false,
  },
  render: (args) => {
    const {
      beforeSchemaText,
      afterSchemaText,
      beforeComponentsText,
      afterComponentsText,
      ...viewerArgs
    } = args

    const beforeSchema = parseYamlSource(beforeSchemaText)
    const afterSchema = parseYamlSource(afterSchemaText)
    const beforeComponents = beforeComponentsText ? parseYamlSource(beforeComponentsText) : undefined
    const afterComponents = afterComponentsText ? parseYamlSource(afterComponentsText) : undefined

    const schema = prepareJsonDiffSchema({
      beforeSchema,
      afterSchema,
      beforeAdditionalComponents: isObject(beforeComponents) ? beforeComponents : undefined,
      afterAdditionalComponents: isObject(afterComponents) ? afterComponents : undefined,
      target: REQUEST_BODY_TARGET,
    })

    console.log(beforeSchemaText)
    console.log(afterSchemaText)
    console.debug('Prepared diff schema:', schema)

    return <JsonSchemaDiffsViewer {...viewerArgs} schema={schema} />
  },
}

