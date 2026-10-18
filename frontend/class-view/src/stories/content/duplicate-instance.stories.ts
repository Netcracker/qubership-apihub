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
  generatePropertiesGroupObject,
  LEAF_PROPERTY_SUFFIX,
  PROPERTIES_GROUP_SUFFIX,
  Template
} from 'stories/common'
import { ClassObject, DefaultDomainMeta, LeafPropertyObject, PropertiesGroupObject, PropertyObject } from 'main/domain'

export default {
  title: 'Synthetic/Content',
} satisfies Meta

const GROUP_PROPERTY: LeafPropertyObject = generateLeafPropertyObject(`1${LEAF_PROPERTY_SUFFIX}`)

const CLASS_PROPERTY: LeafPropertyObject = generateLeafPropertyObject(`2${LEAF_PROPERTY_SUFFIX}`)

const GROUP: PropertiesGroupObject<LeafPropertyObject> = generatePropertiesGroupObject(`1${PROPERTIES_GROUP_SUFFIX}`, {
  properties: [
    GROUP_PROPERTY,
    GROUP_PROPERTY,
  ]
})

const CLASS: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject(`1${CLASS_SUFFIX}`, {
  properties: [
    GROUP,
    GROUP,
    CLASS_PROPERTY,
    CLASS_PROPERTY,
  ]
})

const CONTENT = generateContent({
  classes: [
    CLASS,
    CLASS
  ]
})

export const DuplicateInstance = Template.bind({})

DuplicateInstance.args = {
  content: CONTENT
}
