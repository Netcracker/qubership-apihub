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
  generateIncludePropertiesGroupRelation,
  generateLeafPropertyObject,
  generatePropertiesGroupObject,
  generatePropertyToClassRelation,
  LEAF_PROPERTY_SUFFIX,
  PROPERTIES_GROUP_SUFFIX,
  range,
  Template
} from 'stories/common'

export default {
  title: 'Synthetic/Layout',
} satisfies Meta

const PROPERTIES_TO_CLASS = 6

const CONTENT = generateContent({
  classes: [
    ...range(1, PROPERTIES_TO_CLASS).map(classIndex => (
      generateClassObject(`1${classIndex}${CLASS_SUFFIX}`, {
        properties: [
          ...range(1, PROPERTIES_TO_CLASS).map(index => (generateLeafPropertyObject(`1${classIndex}${index}${LEAF_PROPERTY_SUFFIX}`))),
          generatePropertiesGroupObject(`1${classIndex}${PROPERTIES_GROUP_SUFFIX}`)
        ]
      }))),
    ...range(1, PROPERTIES_TO_CLASS).map(classIndex => (
      generateClassObject(`2${classIndex}${CLASS_SUFFIX}`, {
        properties: [
          generateLeafPropertyObject(`2${classIndex}${LEAF_PROPERTY_SUFFIX}`)
        ]
      }))),
    generateClassObject(`3${CLASS_SUFFIX}`)
  ],
  relations: [
    ...range(1, PROPERTIES_TO_CLASS).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `11${index}${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `2${index}${CLASS_SUFFIX}`
      }))),
    ...range(1, PROPERTIES_TO_CLASS).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `12${index}${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `2${index}${CLASS_SUFFIX}`
      }))),
    ...range(1, PROPERTIES_TO_CLASS).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `13${index}${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `2${index}${CLASS_SUFFIX}`
      }))),
    ...range(1, PROPERTIES_TO_CLASS).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `14${index}${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `2${index}${CLASS_SUFFIX}`
      }))),
    ...range(1, PROPERTIES_TO_CLASS).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `15${index}${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `2${index}${CLASS_SUFFIX}`
      }))),
    ...range(1, PROPERTIES_TO_CLASS).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `16${index}${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `2${index}${CLASS_SUFFIX}`
      }))),
    ...range(1, PROPERTIES_TO_CLASS).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `2${index}${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `3${CLASS_SUFFIX}`
      }))),
    ...range(1, PROPERTIES_TO_CLASS).map(index => (
      generateIncludePropertiesGroupRelation({
        propertyGroupKey: `1${index}${PROPERTIES_GROUP_SUFFIX}`,
        includedClassKey: `3${CLASS_SUFFIX}`,
      }))),
  ]
})

export const CrossConnections = Template.bind({})

CrossConnections.args = {
  content: CONTENT
}
