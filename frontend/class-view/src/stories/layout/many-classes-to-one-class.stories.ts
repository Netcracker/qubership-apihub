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

import { Meta } from '@storybook/html'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateContent,
  generateLeafPropertyObject,
  generatePropertyToClassRelation,
  LEAF_PROPERTY_SUFFIX,
  range,
  Template
} from 'stories/common'

export default {
  title: 'Synthetic/Layout',
} satisfies Meta

const CLASS_HEIR_COUNT = 10

const CONTENT = generateContent({
  classes: [
    generateClassObject(`0${CLASS_SUFFIX}`, {
      properties: [
        generateLeafPropertyObject(`0${LEAF_PROPERTY_SUFFIX}`)
      ]
    }),
    ...range(1, CLASS_HEIR_COUNT).map(index => (
      generateClassObject(`${index}${CLASS_SUFFIX}`))),
  ],
  relations: [
    ...range(1, CLASS_HEIR_COUNT).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `0${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `${index}${CLASS_SUFFIX}`
      })))
  ]
})

export const ManyClassesToOneClass = Template.bind({})

ManyClassesToOneClass.args = {
  content: CONTENT
}
