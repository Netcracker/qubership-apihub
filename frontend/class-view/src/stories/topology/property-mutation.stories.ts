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

import { Meta, StoryFn } from '@storybook/html'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateContent,
  generateLeafPropertyObject,
  generatePropertiesGroupObject,
  LEAF_PROPERTY_SUFFIX,
  PROPERTIES_GROUP_SUFFIX,
  storyArgsFunc,
} from 'stories/common'

enum NameStage {
  EMPTY,
  SHORT,
  LONG,
  CUSTOM
}

const NAME_BY_STAGE: Record<NameStage, string> = {
  [NameStage.EMPTY]: '',
  [NameStage.SHORT]: 'short name',
  [NameStage.LONG]: 'long name long name long name long name long name long name long name',
  [NameStage.CUSTOM]: '',
}

export default {
  title: 'Synthetic/Topology',
  argTypes: {
    required: {
      name: 'Required',
      control: 'boolean',
    },
    propertyName: {
      name: 'Property name',
      control: {
        type: 'radio',
        labels: {
          [NameStage.EMPTY]: 'Empty',
          [NameStage.SHORT]: 'Short',
          [NameStage.LONG]: 'Long',
          [NameStage.CUSTOM]: 'Custom',
        },
      },
      options: [
        NameStage.EMPTY, NameStage.SHORT, NameStage.LONG, NameStage.CUSTOM,
      ],
    },
    propertyCustomName: {
      name: 'Property custom name',
      control: {
        type: 'text',
      },
      if: { arg: 'propertyName', eq: NameStage.CUSTOM },
    },
    deprecated: {
      name: 'Deprecated',
      control: {
        type: 'boolean',
      },
    },
    propertyType: {
      name: 'Property type name',
      control: {
        type: 'radio',
        labels: {
          [NameStage.EMPTY]: 'Empty',
          [NameStage.SHORT]: 'Short',
          [NameStage.LONG]: 'Long',
          [NameStage.CUSTOM]: 'Custom',
        },
      },
      options: [
        NameStage.EMPTY, NameStage.SHORT, NameStage.LONG, NameStage.CUSTOM,
      ],
    },
    propertyCustomType: {
      name: 'Property custom name',
      control: {
        type: 'text',
      },
      if: { arg: 'propertyType', eq: NameStage.CUSTOM },
    },
    propertyTypeDeprecated: {
      name: 'Property type deprecated',
      control: {
        type: 'boolean',
      },
    },
  },
  args: {
    required: false,
    propertyName: NameStage.EMPTY,
    deprecated: false,
    propertyCustomName: 'custom text',
    propertyType: NameStage.EMPTY,
    propertyCustomType: 'custom text',
    propertyTypeDeprecated: false,
  },
} satisfies Meta<StoryArgs>

type StoryArgs = {
  required: boolean
  propertyName: NameStage
  propertyCustomName: string
  propertyType: NameStage
  propertyCustomType: string
  deprecated: boolean,
  propertyTypeDeprecated: boolean,
}

export const PropertyMutation: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  component.content = generateContent({
    classes: [
      generateClassObject('1' + CLASS_SUFFIX, {
        properties: [
          generateLeafPropertyObject('1' + LEAF_PROPERTY_SUFFIX, {
            name: args.propertyCustomName ? args.propertyCustomName : NAME_BY_STAGE[args.propertyName],
            deprecated: args.deprecated,
            propertyType: args.propertyCustomType ? args.propertyCustomType : NAME_BY_STAGE[args.propertyType],
            propertyTypeDeprecated: args.propertyTypeDeprecated,
            required: args.required,
          }),
        ],
      }),
      generateClassObject('2' + CLASS_SUFFIX, {
        properties: [
          generatePropertiesGroupObject('2' + PROPERTIES_GROUP_SUFFIX, {
            properties: [
              generateLeafPropertyObject('2' + LEAF_PROPERTY_SUFFIX, {
                name: args.propertyCustomName ? args.propertyCustomName : NAME_BY_STAGE[args.propertyName],
                deprecated: args.deprecated,
                propertyType: args.propertyCustomType ? args.propertyCustomType : NAME_BY_STAGE[args.propertyType],
                propertyTypeDeprecated: args.propertyTypeDeprecated,
                required: args.required,
              }),
            ],
          }),
        ],
      }),
    ],
  })
}, baseContext => {
  return baseContext
})
