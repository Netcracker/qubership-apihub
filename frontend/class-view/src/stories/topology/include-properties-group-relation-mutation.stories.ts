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
  generateIncludePropertiesGroupRelation,
  generatePropertiesGroupObject,
  PROPERTIES_GROUP_SUFFIX,
  range,
  storyArgsFunc
} from 'stories/common'

export default {
  title: 'Synthetic/Topology',
  argTypes: {
    primary: {
      name: 'Primary',
      control: 'boolean',
    },
    addGroupRelation: {
      name: 'Add group relation',
      control: 'boolean',
    },
  },
  args: {
    primary: false,
    addGroupRelation: false
  }
} satisfies Meta<StoryArgs>

type StoryArgs = {
  primary: boolean;
  addGroupRelation: boolean;
}

const MAIN_PREFIX = 'main'
const ADDITIONAL_PREFIX = 'additional'

export const IncludePropertiesGroupRelationMutation: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  const relations = [
    generateIncludePropertiesGroupRelation({
      propertyGroupKey: `${MAIN_PREFIX}1${PROPERTIES_GROUP_SUFFIX}`,
      includedClassKey: `${ADDITIONAL_PREFIX}1${CLASS_SUFFIX}`,
      primary: args.primary
    })
  ]

  if (args.addGroupRelation) {
    relations.push(
      generateIncludePropertiesGroupRelation({
        propertyGroupKey: `${MAIN_PREFIX}2${PROPERTIES_GROUP_SUFFIX}`,
        includedClassKey: `${ADDITIONAL_PREFIX}2${CLASS_SUFFIX}`,
        primary: args.primary
      })
    )
  }

  component.content = generateContent({
    classes: [
      ...range(1, 2).map(index => (
        generateClassObject(MAIN_PREFIX + index + CLASS_SUFFIX, {
          properties: [
            generatePropertiesGroupObject(MAIN_PREFIX + index + PROPERTIES_GROUP_SUFFIX)
          ]
        })
      )),
      ...range(1, 2).map(index => (
        generateClassObject(ADDITIONAL_PREFIX + index + CLASS_SUFFIX)
      )),
    ],
    relations: relations
  })
}, baseContext => {
  return baseContext
})
