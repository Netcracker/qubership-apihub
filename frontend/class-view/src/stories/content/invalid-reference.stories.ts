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

import type { Meta } from '@storybook/html'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateContent,
  generateIncludePropertiesGroupRelation,
  generateLeafPropertyObject,
  generatePropertiesGroupObject,
  generatePropertyToClassRelation,
  LEAF_PROPERTY_SUFFIX,
  PROPERTIES_GROUP_SUFFIX,
  Template
} from 'stories/common'

export default {
  title: 'Synthetic/Content',
} satisfies Meta

const CONTENT = generateContent({
  classes: [
    generateClassObject(`1${CLASS_SUFFIX}`, {
      properties: [
        generateLeafPropertyObject(`11${LEAF_PROPERTY_SUFFIX}`, {
          name: 'property1 property->?',
        }),
        generateLeafPropertyObject(`12${LEAF_PROPERTY_SUFFIX}`, {
          name: 'property2 ?->class?',
        }),
        generatePropertiesGroupObject(`11${PROPERTIES_GROUP_SUFFIX}`, {
          name: 'group1 group->?',
          properties: [
            generateLeafPropertyObject(`111${LEAF_PROPERTY_SUFFIX}`, {
              name: 'property1 property->?',
            }),
          ]
        }),
        generatePropertiesGroupObject(`12${PROPERTIES_GROUP_SUFFIX}`, {
          name: 'property11 property->?',
        })
      ]
    })
  ],
  relations: [
    generatePropertyToClassRelation({
      leafPropertyKey: `11${LEAF_PROPERTY_SUFFIX}`,
    }),
    generatePropertyToClassRelation({
      referenceClassKey: `1${CLASS_SUFFIX}`,
    }),
    generatePropertyToClassRelation({
      leafPropertyKey: `111${LEAF_PROPERTY_SUFFIX}`,
    }),
    generateIncludePropertiesGroupRelation({
      propertyGroupKey: `11${PROPERTIES_GROUP_SUFFIX}`,
    }),
    generateIncludePropertiesGroupRelation({
      includedClassKey: `1${CLASS_SUFFIX}`
    }),
  ]
})

export const InvalidReference = Template.bind({})

InvalidReference.args = {
  content: CONTENT
}
