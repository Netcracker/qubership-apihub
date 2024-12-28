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
  DefaultDomainMeta,
  LeafPropertyObject,
  Optional,
  PropertiesGroupObject,
  PropertyObject,
  RelationObject
} from 'main/domain'
import {
  generateClassObject,
  generateContent,
  generateIncludePropertiesGroupRelation,
  generateLeafPropertyObject,
  generatePropertiesGroupObject,
  generatePropertyToClassRelation,
  storyArgsFunc
} from 'stories/common'
import { EVENT_SELECTION_CHANGE, SelectableObject, SelectionChangeData } from 'main/component'
import { useArgs } from '@storybook/client-api'
import { isDefine } from 'main/core/utils'

export default {
  title: 'Synthetic/Selection',
  argTypes: {
    selectClass: {
      name: 'Select class',
      control: 'boolean',
    },
    selectProperty: {
      name: 'Select property',
      control: 'boolean',
    },
    selectGroup: {
      name: 'Select group',
      control: 'boolean',
    },
    selectGroupSProperty: {
      name: 'Select group\'s property',
      control: 'boolean',
    },
    selectPropertySRelation: {
      name: 'Select property\'s relation',
      control: 'boolean',
    },
    selectGroupSRelation: {
      name: 'Select group\'s relation',
      control: 'boolean',
    },
    selectNonExistent: {
      name: 'Select non-existent',
      control: 'boolean',
    }
  },
  args: {
    selectClass: false,
    selectProperty: false,
    selectGroup: false,
    selectGroupSProperty: false,
    selectPropertySRelation: false,
    selectGroupSRelation: false,
    selectNonExistent: false
  }
} satisfies Meta<StoryArgs>

type StoryArgs = {
  selectClass: boolean;
  selectProperty: boolean;
  selectGroup: boolean;
  selectGroupSProperty: boolean;
  selectPropertySRelation: boolean
  selectGroupSRelation: boolean
  selectNonExistent: boolean
}

const GROUP_PROPERTY: LeafPropertyObject = generateLeafPropertyObject('lpg', { name: 'Group property' })

const PROPERTY: LeafPropertyObject = generateLeafPropertyObject('lp', { name: 'Class property' })

const GROUP: PropertiesGroupObject<LeafPropertyObject> = generatePropertiesGroupObject('pg', {
  name: 'Group',
  properties: [GROUP_PROPERTY]
})

const CLASS: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject('c', {
  name: 'Class',
  properties: [GROUP, PROPERTY]
})

const GROUP_CLASS: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject('gc')

const PROPERTY_RELATION: RelationObject<DefaultDomainMeta> = generatePropertyToClassRelation({
  leafPropertyKey: 'lp',
  referenceClassKey: 'c'
})

const GROUP_RELATION: RelationObject<DefaultDomainMeta> = generateIncludePropertiesGroupRelation({
  propertyGroupKey: 'pg',
  includedClassKey: 'gc'
})

const CONTENT = generateContent({
  classes: [CLASS, GROUP_CLASS],
  relations: [PROPERTY_RELATION, GROUP_RELATION]
})

const NON_EXISTENT: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject('non-existent')

let updateArgsCapture: Optional<(arg: Partial<StoryArgs>) => void>
const listener: (event: CustomEvent<SelectionChangeData>) => void = e => {
  if (isDefine(updateArgsCapture)) {
    const newSelection = e.detail.newValue
    updateArgsCapture({
      selectClass: newSelection.includes(CLASS),
      selectProperty: newSelection.includes(PROPERTY),
      selectGroup: newSelection.includes(GROUP),
      selectGroupSProperty: newSelection.includes(GROUP_PROPERTY),
      selectPropertySRelation: newSelection.includes(PROPERTY_RELATION),
      selectGroupSRelation: newSelection.includes(GROUP_RELATION),
    })
  }
}

export const SelectionAPI: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  const selectedObjects: SelectableObject[] = []
  if (args.selectClass) {
    selectedObjects.push(CLASS)
  }
  if (args.selectProperty) {
    selectedObjects.push(PROPERTY)
  }
  if (args.selectGroup) {
    selectedObjects.push(GROUP)
  }
  if (args.selectGroupSProperty) {
    selectedObjects.push(GROUP_PROPERTY)
  }
  if (args.selectPropertySRelation) {
    selectedObjects.push(PROPERTY_RELATION)
  }
  if (args.selectGroupSRelation) {
    selectedObjects.push(GROUP_RELATION)
  }
  if (args.selectNonExistent) {
    selectedObjects.push(NON_EXISTENT)
  }
  component.selectedObjects = selectedObjects
  const [
    , updateArgs
  ] = useArgs()
  updateArgsCapture = updateArgs
}, baseContext => {
  baseContext.component.content = CONTENT
  baseContext.component.addEventListener(EVENT_SELECTION_CHANGE, listener)
  return baseContext
})

