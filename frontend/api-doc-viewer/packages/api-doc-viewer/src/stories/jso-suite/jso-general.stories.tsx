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

import { JsoViewer } from '@apihub/components/JsoViewer/JsoViewer';
import type { Meta, StoryObj } from '@storybook/react';

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'JSO Suite/General',
  component: JsoViewer,
  parameters: {},
  argTypes: {
    source: {
      control: 'object'
    },
    supportJsonSchema: {
      control: 'boolean'
    }
  },
  args: {
    source: {},
    supportJsonSchema: true,
  }
} satisfies Meta<typeof JsoViewer>;

export default meta;

type Story = StoryObj<typeof meta>

export const PrimitiveProperties: Story = {
  args: {
    source: {
      string: 'string',
      number: 123,
      boolean: true,
      null: null,
    },
  }
}

export const PrimitiveObjectProperty: Story = {
  args: {
    source: {
      object: {
        string: 'string',
        number: 123,
        boolean: true,
        null: null,
      },
    },
  }
}

export const PrimitiveArrayProperty: Story = {
  args: {
    source: {
      array: [1, 2, 3],
    },
  }
}

export const NestedObjectProperty: Story = {
  args: {
    source: {
      rootObject: {
        nestedObject: {
          string: 'string',
          number: 123,
          boolean: true,
          null: null,
        },
      },
    },
  }
}

export const NestedArrayProperty: Story = {
  args: {
    source: {
      array: [
        { string: 'string' },
        {
          object: {
            number: 123,
          },
        },
        [1, 2, 3],
      ]
    },
  }
}

export const AllKindsOfObjectProperties: Story = {
  args: {
    source: {
      rootObject: {
        string: 'string',
        plainArray: [1, 2, 3],
        nestedObject: {
          number: 123,
        },
        nestedArray: [
          { boolean: true },
          {
            object: {
              null: null,
            },
          },
        ],
      },
    },
  }
}

export const AllKindsOfArrayItems: Story = {
  args: {
    source: {
      array: [
        'string',
        { number: 123 },
        { nestedObject: { boolean: true } },
        [1, '222', { null: null }]
      ],
    },
  }
}

export const PrimitivePropAndPrimitiveSchema: Story = {
  args: {
    source: {
      string: 'string',
      schema: {
        type: 'string',
        minLength: 1,
        maxLength: 10,
        enum: ['a', 'b', 'c'],
        default: 'a',
        examples: ['a', 'b', 'c'],
        description: 'A string property',
      },
    },
  }
}

export const PrimitivePropAndObjectSchema: Story = {
  args: {
    source: {
      string: 'string',
      schema: {
        type: 'object',
        properties: {
          string: { type: 'string', description: 'A string property' },
          number: { type: 'number', description: 'A number property' },
        },
      },
    },
  }
}

export const PrimitivePropAndArraySchema: Story = {
  args: {
    source: {
      string: 'string',
      schema: {
        type: 'array',
        items: { type: 'string', description: 'A string property' },
      },
    },
  }
}

export const PrimitivePropAndCombinerSchema: Story = {
  args: {
    source: {
      string: 'string',
      schema: {
        oneOf: [
          {
            type: 'string',
            description: 'A string property',
          },
          {
            type: 'number',
            description: 'A number property',
          },
        ],
      },
    },
  }
}

export const ObjectPropAndPrimitiveSchema: Story = {
  args: {
    source: {
      object: {
        string: 'string',
      },
      schema: {
        type: 'string',
        description: 'A string property',
      }
    },
  }
}

export const ArrayPropAndPrimitiveSchema: Story = {
  args: {
    source: {
      array: [
        'string',
      ],
      schema: {
        type: 'string',
        description: 'A string property',
      }
    },
  }
}

// ---

export const SecondLevelPrimitivePropAndPrimitiveSchema: Story = {
  args: {
    source: {
      string: 'string',
      schema: {
        type: 'string',
        minLength: 1,
        maxLength: 10,
        enum: ['a', 'b', 'c'],
        default: 'a',
        examples: ['a', 'b', 'c'],
        description: 'A string property',
      },
    },
    initialLevel: 1,
  }
}

export const SecondLevelPrimitivePropAndObjectSchema: Story = {
  args: {
    source: {
      string: 'string',
      schema: {
        type: 'object',
        properties: {
          string: { type: 'string', description: 'A string property' },
          number: { type: 'number', description: 'A number property' },
        },
      },
    },
    initialLevel: 1,
  }
}

export const SecondLevelPrimitivePropAndArraySchema: Story = {
  args: {
    source: {
      string: 'string',
      schema: {
        type: 'array',
        items: { type: 'string', description: 'A string property' },
      },
    },
    initialLevel: 1,
  }
}

export const SecondLevelPrimitivePropAndCombinerSchema: Story = {
  args: {
    source: {
      string: 'string',
      schema: {
        oneOf: [
          {
            type: 'string',
            description: 'A string property',
          },
          {
            type: 'number',
            description: 'A number property',
          },
        ],
      },
    },
    initialLevel: 1,
  }
}

export const SecondLevelObjectPropAndPrimitiveSchema: Story = {
  args: {
    source: {
      object: {
        string: 'string',
      },
      schema: {
        type: 'string',
        description: 'A string property',
      }
    },
    initialLevel: 1,
  }
}

export const SecondLevelArrayPropAndPrimitiveSchema: Story = {
  args: {
    source: {
      array: [
        'string',
      ],
      schema: {
        type: 'string',
        description: 'A string property',
      }
    },
    initialLevel: 1,
  }
}
