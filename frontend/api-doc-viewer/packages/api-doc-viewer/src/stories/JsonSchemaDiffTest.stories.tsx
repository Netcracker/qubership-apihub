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
  title: 'Json Schema Diff Viewer/Test Stories',
  component: JsonSchemaDiffViewer,
  parameters: {},
  argTypes: {},
  args: {
    schema: {}
  }
} satisfies Meta<typeof JsonSchemaDiffViewer>;

export default meta;

type Story = StoryObj<typeof meta>

const DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

export const Test: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {},
      afterSchema: {},
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
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
    metaKeys: DIFF_META_KEYS,
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
    metaKeys: DIFF_META_KEYS,
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
    metaKeys: DIFF_META_KEYS,
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
    metaKeys: DIFF_META_KEYS,
  }
}

export const CycledChanged: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          a: { $ref: '#/components/schemas/A' },
          b: { $ref: '#/components/schemas/A' },
        }
      },
      afterSchema: {
        type: 'object',
        description: 'Test',
        properties: {
          a: { $ref: '#/components/schemas/A' },
          b: { $ref: '#/components/schemas/A' },
        }
      },
      beforeAdditionalComponents: {
        schemas: {
          A: {
            type: 'object',
            properties: {
              c: { $ref: '#/components/schemas/A' }
            }
          }
        }
      },
      afterAdditionalComponents: {
        schemas: {
          A: {
            type: 'object',
            properties: {
              c: { $ref: '#/components/schemas/A' },
              d: {
                type: 'integer',
                description: 'numeric value',
                minimum: 1,
                maximum: 1000,
                exclusiveMaximum: true,
              }
            }
          }
        }
      },
      target: RESPONSE_200_BODY_TARGET,
      circular: true,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const PrimitiveChanged: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'string',
        description: 'Removed description',
        minLength: 1,
        maxLength: 100,
      },
      afterSchema: {
        type: 'string',
        format: 'format',
        maxLength: 55,
      },

      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const ObjectiveHeaderChanged: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          removedProperty: {
            type: 'string',
          },
        }
      },
      afterSchema: {
        type: 'object',
        title: 'Added title',
        properties: {
          addedProperty: {
            type: 'string',
          },
        }
      },

      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const ObjectToArray: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        title: 'ObjectiveType',
        type: 'object',
        description: 'Objective Type',
        properties: {
          id: {
            type: 'string',
            enum: ['1', '2', '3'],
          },
        },
      },
      afterSchema: {
        type: 'array',
        title: 'IterableType',
        description: 'Iterable Type',
        items: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          exclusiveMaximum: true,
        },
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const ExtensionsOnPrimitive: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'string',
        'x-string-extension': 'value',
        'x-integer-extension': 1,
        'x-boolean-extension': true,
        'x-number-extension': 1.0,
        'x-array-extension': [1, 2, 3],
        'x-object-extension': {
          key: 'value',
        },
        'x-removed-extension': 'removed value',
        'x-changed-extension': true,
      },
      afterSchema: {
        type: 'string',
        'x-string-extension': 'value',
        'x-integer-extension': 1,
        'x-boolean-extension': true,
        'x-number-extension': 1.0,
        'x-array-extension': [1, 2, 3],
        'x-object-extension': {
          key: 'value',
        },
        'x-added-extension': 42,
        'x-changed-extension': false,
      },

      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}


export const ExtensionsOnObject: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          prop: {
            type: 'string',
            'x-string-extension': 'value',
            'x-integer-extension': 1,
            'x-boolean-extension': true,
            'x-number-extension': 1.0,
            'x-array-extension': [1, 2, 3],
            'x-object-extension': {
              key: 'value',
            },
            'x-removed-extension': 'removed value',
            'x-changed-extension': true,
          }
        }
      },
      afterSchema: {
        type: 'object',
        properties: {
          prop: {
            type: 'string',
            'x-string-extension': 'value',
            'x-integer-extension': 1,
            'x-boolean-extension': true,
            'x-number-extension': 1.0,
            'x-array-extension': [1, 2, 3],
            'x-object-extension': {
              key: 'value',
            },
            'x-added-extension': 42,
            'x-changed-extension': false,
          }
        }
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const ExtensionsWhollyAddedOnObject: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          prop: {
            type: 'string',
          }
        }
      },
      afterSchema: {
        type: 'object',
        properties: {
          prop: {
            type: 'string',
            'x-string-extension': 'value',
            'x-integer-extension': 1,
            'x-boolean-extension': true,
            'x-number-extension': 1.0,
            'x-array-extension': [1, 2, 3],
            'x-object-extension': {
              key: 'value',
            },
            'x-added-extension': 42,
            'x-changed-extension': false,
          }
        }
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const ExtensionsWhollyRemovedOnObject: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          prop: {
            type: 'string',
            'x-string-extension': 'value',
            'x-integer-extension': 1,
            'x-boolean-extension': true,
            'x-number-extension': 1.0,
            'x-array-extension': [1, 2, 3],
            'x-object-extension': {
              key: 'value',
            },
            'x-added-extension': 42,
            'x-changed-extension': false,
          }
        }
      },
      afterSchema: {
        type: 'object',
        properties: {
          prop: {
            type: 'string',
          }
        }
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const AddedPropertyWithExtensions: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          prop: {
            type: 'string',
          }
        }
      },
      afterSchema: {
        type: 'object',
        properties: {
          prop: {
            type: 'string',
          },
          addedProperty: {
            type: 'string',
            'x-string-extension': 'value',
            'x-integer-extension': 1,
            'x-boolean-extension': true,
            'x-number-extension': 1.0,
            'x-array-extension': [1, 2, 3],
            'x-object-extension': {
              key: 'value',
            },
            'x-added-extension': 42,
            'x-changed-extension': false,
          }
        }
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const RemovedPropertyWithExtensions: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          prop: {
            type: 'string',
          },
          addedProperty: {
            type: 'string',
            'x-string-extension': 'value',
            'x-integer-extension': 1,
            'x-boolean-extension': true,
            'x-number-extension': 1.0,
            'x-array-extension': [1, 2, 3],
            'x-object-extension': {
              key: 'value',
            },
            'x-added-extension': 42,
            'x-changed-extension': false,
          }
        }
      },
      afterSchema: {
        type: 'object',
        properties: {
          prop: {
            type: 'string',
          }
        }
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const ExtensionsOnCircularObject: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      circular: true,
      beforeSchema: {
        $ref: '#/components/schemas/A'
      },
      beforeAdditionalComponents: {
        schemas: {
          A: {
            type: 'object',
            properties: {
              prop: { $ref: '#/components/schemas/A' }
            },
            'x-string-extension': 'value',
            'x-integer-extension': 1,
            'x-boolean-extension': true,
            'x-number-extension': 1.0,
            'x-array-extension': [1, 2, 3],
            'x-object-extension': {
              key: 'value',
            },
            'x-removed-extension': 'removed value',
            'x-changed-extension': true,
          }
        }
      },
      afterSchema: {
        $ref: '#/components/schemas/A'
      },
      afterAdditionalComponents: {
        schemas: {
          A: {
            type: 'object',
            properties: {
              prop: {
                $ref: '#/components/schemas/A'
              }
            },
            'x-string-extension': 'value',
            'x-integer-extension': 1,
            'x-boolean-extension': true,
            'x-number-extension': 1.0,
            'x-array-extension': [1, 2, 3],
            'x-object-extension': {
              key: 'value',
            },
            'x-added-extension': 42,
            'x-changed-extension': false,
          }
        }
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const AllConstraintsChanged: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          stringProp: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            pattern: '^[a-z]+$',
            contentMediaType: 'text/plain',
            contentEncoding: 'utf-8',
            enum: ['foo', 'bar'],
            const: 'foo',
            default: 'bar',
            examples: ['hello', 'world'],
          },
          numberProp: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            exclusiveMinimum: true,
            exclusiveMaximum: false,
            multipleOf: 0.5,
            enum: [1.5, 2.5, 3.5],
            const: 1.5,
            default: 2.5,
            examples: [1.5, 2.0],
          },
          integerProp: {
            type: 'integer',
            minimum: 1,
            maximum: 1000,
            exclusiveMinimum: false,
            exclusiveMaximum: true,
            multipleOf: 2,
            enum: [2, 4, 6],
            const: 2,
            default: 4,
            examples: [2, 8],
          },
          booleanProp: {
            type: 'boolean',
            enum: [true, false],
            const: true,
            default: false,
            examples: [true],
          },
          arrayProp: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            uniqueItems: false,
            enum: [[1, 2], [3, 4]],
            const: [1, 2],
            default: [3, 4],
            examples: [[1, 2, 3]],
          },
          objectProp: {
            type: 'object',
            minProperties: 1,
            maxProperties: 5,
            patternProperties: { '^x_': { type: 'string' } },
            propertyNames: { minLength: 1, maxLength: 20 },
            dependencies: { id: ['name'] },
            enum: [{ id: 'a' }],
            const: { id: 'a' },
            default: { id: 'b' },
            examples: [{ id: 'a', name: 'Alice' }],
          },
        },
      },
      afterSchema: {
        type: 'object',
        properties: {
          stringProp: {
            type: 'string',
            minLength: 5,
            maxLength: 200,
            pattern: '^[A-Z]+$',
            contentMediaType: 'application/json',
            contentEncoding: 'base64',
            enum: ['baz', 'qux'],
            const: 'baz',
            default: 'qux',
            examples: ['HELLO', 'WORLD', 'EXAMPLE'],
          },
          numberProp: {
            type: 'number',
            minimum: 10,
            maximum: 500,
            exclusiveMinimum: false,
            exclusiveMaximum: true,
            multipleOf: 2.5,
            enum: [10.5, 20.5, 30.5],
            const: 10.5,
            default: 20.5,
            examples: [12.5, 25.0],
          },
          integerProp: {
            type: 'integer',
            minimum: 5,
            maximum: 500,
            exclusiveMinimum: true,
            exclusiveMaximum: false,
            multipleOf: 5,
            enum: [5, 10, 15],
            const: 5,
            default: 10,
            examples: [10, 100],
          },
          booleanProp: {
            type: 'boolean',
            enum: [false],
            const: false,
            default: true,
            examples: [false],
          },
          arrayProp: {
            type: 'array',
            minItems: 2,
            maxItems: 20,
            uniqueItems: true,
            enum: [[5, 6], [7, 8]],
            const: [5, 6],
            default: [7, 8],
            examples: [[5, 6, 7, 8]],
          },
          objectProp: {
            type: 'object',
            minProperties: 2,
            maxProperties: 10,
            patternProperties: { '^s_': { type: 'integer' } },
            propertyNames: { minLength: 2, maxLength: 30 },
            dependencies: { id: ['name', 'email'] },
            enum: [{ id: 'c', name: 'd' }],
            const: { id: 'c', name: 'd' },
            default: { id: 'e', name: 'f' },
            examples: [{ id: 'c', name: 'Carol', email: 'example@example.com' }],
          },
        },
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  },
}

export const AppendCombinerItem: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          prop: {
            oneOf: [
              { type: 'string' },
            ]
          },
        },
      },
      afterSchema: {
        type: 'object',
        properties: {
          prop: {
            oneOf: [
              { type: 'string' },
              { type: 'integer' },
            ]
          },
        },
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const PopCombinerItem: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          prop: {
            oneOf: [
              { type: 'string' },
              { type: 'integer' },
            ]
          },
        },
      },
      afterSchema: {
        type: 'object',
        properties: {
          prop: {
            oneOf: [
              { type: 'string' },
            ]
          },
        },
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const ChangesInsideFirstCombinerItem: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          prop: {
            oneOf: [
              { type: 'integer', description: 'Default value is 42', examples: [24] },
              { type: 'string' },
            ]
          },
        },
      },
      afterSchema: {
        type: 'object',
        properties: {
          prop: {
            oneOf: [
              { type: 'integer', default: 42, examples: [42] },
              { type: 'string' },
            ]
          },
        },
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}

export const ChangesInsideLastCombinerItem: Story = {
  args: {
    schema: prepareJsonDiffSchema({
      beforeSchema: {
        type: 'object',
        properties: {
          prop: {
            oneOf: [
              { type: 'string' },
              { type: 'integer', description: 'Default value is 42', examples: [24] },
            ]
          },
        },
      },
      afterSchema: {
        type: 'object',
        properties: {
          prop: {
            oneOf: [
              { type: 'string' },
              { type: 'integer', default: 42, examples: [42] },
            ]
          },
        },
      },
      target: RESPONSE_200_BODY_TARGET,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: DIFF_META_KEYS,
  }
}