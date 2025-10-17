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

import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff';
import type { Meta, StoryObj } from '@storybook/react';
import { JsonSchemaDiffViewer } from '../components/JsonSchemaViewer/JsonSchemaDiffViewer';
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from '../types/LayoutMode';
import { prepareJsonDiffSchema, RESPONSE_200_BODY_TARGET } from './preprocess';

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Json Schema Diff Viewer',
  component: JsonSchemaDiffViewer,
  parameters: {},
  argTypes: {},
  args: {
    schema: {}
  }
} satisfies Meta<typeof JsonSchemaDiffViewer>;

export default meta;

type Story = StoryObj<typeof meta>

export const Test: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {},
      afterSchema: {},
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  }
}

export const RenamedProperty: Story = {
  args: {
    schema: {
      type: 'object',
      properties: {
        newProperty: { type: 'string' },
        anotherProperty: { type: 'string' },
        [DIFF_META_KEY]: {
          newProperty: {
            beforeKey: 'oldProperty',
            afterKey: 'newProperty',
            type: 'annotation',
            action: 'rename',
          }
        }
      }
    },
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  }
}

export const Flags: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        required: ['madeOptional', 'unchangedRequired', 'removedRequired'],
        properties: {
          madeRequired: { type: 'string' },
          madeOptional: { type: 'string' },
          madeReadOnly: { type: 'integer' },
          madeWriteOnly: { type: 'integer' },
          madeDeprecated: { type: 'integer' },
          madeWritable: { type: 'boolean', readOnly: true },
          madeReadable: { type: 'boolean', writeOnly: true },
          madeActual: { type: 'boolean', deprecated: true },
          removedReadOnly: { type: 'number', readOnly: true },
          removedWriteOnly: { type: 'number', writeOnly: true },
          removedRequired: { type: 'number' },
          removed: { type: 'number' },
          unchangedRequired: { type: 'string' },
          unchangedOptional: { type: 'string' },
          unchangedReadOnly: { type: 'string', readOnly: true },
          unchangedWriteOnly: { type: 'string', writeOnly: true },
          unchangedDeprecated: { type: 'string', deprecated: true },
        }
      },
      afterSchema: {
        type: 'object',
        required: ['madeRequired', 'unchangedRequired', 'addedRequired'],
        properties: {
          madeRequired: { type: 'string' },
          madeOptional: { type: 'string' },
          madeReadOnly: { type: 'integer', readOnly: true },
          madeWriteOnly: { type: 'integer', writeOnly: true },
          madeDeprecated: { type: 'integer', deprecated: true },
          madeWritable: { type: 'boolean' },
          madeReadable: { type: 'boolean' },
          madeActual: { type: 'boolean' },
          addedReadOnly: { type: 'number', readOnly: true },
          addedWriteOnly: { type: 'number', writeOnly: true },
          addedRequired: { type: 'number' },
          added: { type: 'number' },
          unchangedRequired: { type: 'string' },
          unchangedOptional: { type: 'string' },
          unchangedReadOnly: { type: 'string', readOnly: true },
          unchangedWriteOnly: { type: 'string', writeOnly: true },
          unchangedDeprecated: { type: 'string', deprecated: true },
        }
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  }
}

export const Enum: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          addedEnum: { type: 'string' },
          removedEnum: { type: 'string', enum: ['value1', 'value2'] },
          addedEnumValue: { type: 'string', enum: ['value1'] },
          removedEnumValue: { type: 'string', enum: ['value1', 'value2'] },
          unchangedEnumValue: { type: 'string', enum: ['value1', 'value2'] },
        }
      },
      afterSchema: {
        type: 'object',
        properties: {
          addedEnum: { type: 'string', enum: ['value1', 'value2'] },
          removedEnum: { type: 'string' },
          addedEnumValue: { type: 'string', enum: ['value1', 'value2'] },
          removedEnumValue: { type: 'string', enum: ['value1'] },
          unchangedEnumValue: { type: 'string', enum: ['value1', 'value2'] },
        }
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  }
}

export const AddMinItemsInArrayProperty: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          option1: {
            type: 'array',
            minItems: 0,
            items: {
              type: 'string',
            },
          },
          option2: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        }
      },
      afterSchema: {
        type: 'object',
        properties: {
          option1: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'string',
            },
          },
          option2: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'string',
            },
          },
        }
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  }
}