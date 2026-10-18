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
  ClassObject,
  ContentObject,
  DefaultDomainMeta,
  LeafPropertyObject,
  PropertiesGroupObject,
  PropertyObject
} from 'main/domain'
import { storyArgsFunc } from 'stories/common'

const PROPERTY_ONE: LeafPropertyObject = {
  key: 'property1',
  kind: 'property',
  name: 'property1',
  propertyType: 'number',
}

const PROPERTY_TWO: LeafPropertyObject = {
  key: 'property2',
  kind: 'property',
  name: 'property2',
  propertyType: 'number',
}

const GROUP: PropertiesGroupObject<LeafPropertyObject> = {
  key: 'group',
  kind: 'group',
  name: 'group',
  properties: [
    PROPERTY_TWO,
  ]
}

const CLASS_ONE: ClassObject<PropertyObject<DefaultDomainMeta>> = {
  key: 'class1',
  name: 'class1',
  properties: [
    PROPERTY_ONE,
    GROUP,
  ]
}

const CLASS_TWO: ClassObject<PropertyObject<DefaultDomainMeta>> = {
  key: 'class2',
  name: 'class2',
  properties: [
    PROPERTY_ONE,
    GROUP,
  ]
}

const CONTENT_ONE = {
  classes: [CLASS_ONE]
} satisfies ContentObject

const CONTENT_TWO = {
  classes: [CLASS_TWO]
} satisfies ContentObject

enum ReplaceStage {
  FIRST,
  SECOND,
}

export default {
  title: 'Synthetic/Content',
  argTypes: {
    replaceDevice: {
      name: 'Replace class',
      control: {
        type: 'radio',
        labels: {
          [ReplaceStage.FIRST]: 'Class 1',
          [ReplaceStage.SECOND]: 'Class 2'
        }
      },
      options: [
        ReplaceStage.FIRST, ReplaceStage.SECOND
      ],
      defaultValue: ReplaceStage.FIRST
    }
  }
} satisfies Meta<StoryArgs>

type StoryArgs = {
  replaceDevice: ReplaceStage;
}

export const ReplaceClass: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  switch (args.replaceDevice) {
    case ReplaceStage.FIRST: {
      component.content = CONTENT_ONE
      break
    }
    case ReplaceStage.SECOND: {
      component.content = CONTENT_TWO
      break
    }
  }
}, baseContext => {
  baseContext.component.content = CONTENT_ONE
  return baseContext
})
