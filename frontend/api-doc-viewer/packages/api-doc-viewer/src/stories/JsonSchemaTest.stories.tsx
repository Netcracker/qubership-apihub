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

import type { Meta, StoryObj } from '@storybook/react';
import { JsonSchemaViewer } from '../components/JsonSchemaViewer/JsonSchemaViewer';
import { prepareJsonSchema, REQUEST_BODY_TARGET } from './preprocess';

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Json Schema Viewer/Test Stories',
  component: JsonSchemaViewer,
  parameters: {},
  argTypes: {},
  args: {
    schema: {}
  }
} satisfies Meta<typeof JsonSchemaViewer>;

export default meta;

type Story = StoryObj<typeof meta>

export const Cycled: Story = {
  args: {
    schema: prepareJsonSchema({
      schema: {
        type: 'object',
        properties: {
          a: { $ref: '#/components/schemas/A' },
          b: { $ref: '#/components/schemas/A' },
          c: {
            type: 'string'
          },
          d: {
            type: 'object',
            properties: {
              e: { type: 'number' }
            }
          }
        }
      },
      target: REQUEST_BODY_TARGET,
      additionalComponents: {
        schemas: {
          A: {
            type: 'object',
            properties: {
              c: { $ref: '#/components/schemas/A' }
            }
          }
        }
      },
      circular: true,
    })
  }
}

export const ExtensionsFirstLevel: Story = {
  args: {
    schema: prepareJsonSchema({
      target: REQUEST_BODY_TARGET,
      schema: {
        type: 'string',
        format: 'date-time',
        description: 'Date Time in Range',
        'x-min-date': '2026-01-01',
        'x-max-date': '2026-12-31',
      }
    })
  }
}

export const ExtensionsSecondLevel: Story = {
  args: {
    schema: prepareJsonSchema({
      target: REQUEST_BODY_TARGET,
      schema: {
        type: 'object',
        properties: {
          a: {
            type: 'string',
            format: 'date-time',
            description: 'Date Time in Range',
            'x-min-date': '2026-01-01',
            'x-max-date': '2026-12-31',
          }
        }
      }
    })
  }
}

export const MultiLevelExtensionsFirstLevel: Story = {
  args: {
    schema: prepareJsonSchema({
      target: REQUEST_BODY_TARGET,
      schema: {
        type: 'string',
        format: 'date-time',
        description: 'Date Time in Range',
        'x-date': {
          min: '2026-01-01',
          max: '2026-12-31',
        },
        'x-date-time': {
          min: '2026-01-01T00:00:00Z',
          max: '2026-12-31T23:59:59Z',
        },
      }
    })
  }
}

export const MultiLevelExtensionsSecondLevel: Story = {
  args: {
    schema: prepareJsonSchema({
      target: REQUEST_BODY_TARGET,
      schema: {
        type: 'object',
        properties: {
          a: {
            type: 'string',
            format: 'date-time',
            description: 'Date Time in Range',
            'x-date': {
              min: '2026-01-01',
              max: '2026-12-31',
            },
            'x-date-time': {
              min: '2026-01-01T00:00:00Z',
              max: '2026-12-31T23:59:59Z',
            },
          }
        }
      }
    })
  }
}

export const CombinationOfDifferentExtensionsSecondLevel: Story = {
  args: {
    schema: prepareJsonSchema({
      target: REQUEST_BODY_TARGET,
      schema: {
        type: 'array',
        'x-sort-order': 'asc',
        'x-sort-keys': ['date', 'time'],
        items: {
          type: 'string',
          format: 'date-time',
          description: 'Date Time in Range',
          'x-default-timezone': 'UTC',
          'x-allowed-timezones': ['UTC', 'America/New_York', 'Europe/Paris', 'Asia/Tokyo'],
          'x-range': {
            min: {
              date: '2026-01-01',
              time: '00:00:00Z',
            },
            max: {
              date: '2026-12-31',
              time: '23:59:59Z',
            },
          },
        }
      }
    })
  }
}

export const AdditionalPropertiesFalse: Story = {
  args: {
    schema: prepareJsonSchema({
      target: REQUEST_BODY_TARGET,
      schema: {
        type: 'object',
        description: 'Bug with additionalProperties = false',
        additionalProperties: false,
        properties: {
          a: { type: 'string' },
        }
      }
    })
  }
}

export const AdditionalItemsFalse: Story = {
  args: {
    schema: prepareJsonSchema({
      target: REQUEST_BODY_TARGET,
      schema: {
        type: 'array',
        description: 'Bug with additionalItems = false',
        additionalItems: false,
        items: {
          type: 'string',
          description: 'String Item',
        }
      }
    })
  }
}

export const NewLineCharacterInEnum: Story = {
  args: {
    schema: prepareJsonSchema({
      target: REQUEST_BODY_TARGET,
      schema: {
        type: 'string',
        description: 'Bug with new line character in enum',
        enum: ['\n', '\r', '\r\n']
      }
    })
  }
}


export const NonAsciiCharactersInEnum: Story = {
  args: {
    schema: prepareJsonSchema({
      target: REQUEST_BODY_TARGET,
      schema: {
        type: 'string',
        description: 'Bug with new line character in enum',
        enum: ['©', '®', 'µ']
      }
    })
  }
}

export const JsonSchemaInExtensions: Story = {
  args: {
    schema: prepareJsonSchema({
      target: REQUEST_BODY_TARGET,
      schema: {
        type: 'string',
        description: 'Json Schema in extensions',
        'x-json-schema': {
          type: 'string',
          description: 'Json Schema in extensions',
          minLength: 10,
        }
      }
    })
  }
}
