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
  OptionalMembers,
  PropertiesGroupObject,
  PropertyObject,
  RelationObject,
} from 'main/domain'
import {
  generateClassObject,
  generateContent,
  generateLeafPropertyObject,
  generatePropertiesGroupObject,
  generatePropertyToClassRelation,
  range,
  storyArgsFunc,
} from 'stories/common'
import {
  NAVIGATION_OPTION_ARGS,
  NAVIGATION_OPTION_ARGS_TYPE,
  NavigationOptionConfiguration,
} from 'stories/navigate/navigate'
import { DomainObject, NavigateOptions } from 'main/component'

enum NavigateSide {
  NONE,
  LEFT,
  RIGHT,
  BOTH
}

export default {
  title: 'Synthetic/Navigate',
  argTypes: {
    navigateIncludeClass: {
      name: 'Navigate include class',
      control: 'boolean',
      defaultValue: false,
    },
    navigateIncludeClassSProperty: {
      name: 'Navigate include class\'s property',
      control: 'boolean',
      defaultValue: false,
    },
    navigateIncludeGroup: {
      name: 'Navigate include group',
      control: 'boolean',
      defaultValue: false,
    },
    navigateIncludeGroupSProperty: {
      name: 'Navigate include group\'s property',
      control: 'boolean',
      defaultValue: false,
    },
    navigateIncludeRelation: {
      name: 'Navigate include relation',
      control: 'boolean',
      defaultValue: false,
    },
    ...NAVIGATION_OPTION_ARGS_TYPE,
    callNavigateToAt: {
      name: 'Call `Navigate To` at',
      control: {
        type: 'radio',
        labels: {
          [NavigateSide.NONE]: 'None',
          [NavigateSide.LEFT]: 'Left group',
          [NavigateSide.RIGHT]: 'Right group',
          [NavigateSide.BOTH]: 'Both group',
        },
      },
      options: [
        NavigateSide.NONE,
        NavigateSide.LEFT,
        NavigateSide.RIGHT,
        NavigateSide.BOTH,
      ],
    },
  },
  args: {
    navigateIncludeClass: false,
    navigateIncludeClassSProperty: false,
    navigateIncludeGroup: false,
    navigateIncludeGroupSProperty: false,
    navigateIncludeRelation: false,
    callNavigateToAt: NavigateSide.NONE,
    ...NAVIGATION_OPTION_ARGS,
  },
} satisfies Meta<StoryArgs>

type StoryArgs = {
  navigateIncludeClass: boolean;
  navigateIncludeClassSProperty: boolean;
  navigateIncludeGroup: boolean;
  navigateIncludeGroupSProperty: boolean;
  navigateIncludeRelation: boolean
  callNavigateToAt: NavigateSide;
} & NavigationOptionConfiguration

const LEFT_ENTITY_PREFIX = 'l'
const RIGHT_ENTITY_PREFIX = 'r'

const LEFT_GROUP_PROPERTY: LeafPropertyObject = generateLeafPropertyObject(LEFT_ENTITY_PREFIX + 'lpg')

const RIGHT_GROUP_PROPERTY: LeafPropertyObject = generateLeafPropertyObject(RIGHT_ENTITY_PREFIX + 'lpg')

const LEFT_PROPERTY: LeafPropertyObject = generateLeafPropertyObject(LEFT_ENTITY_PREFIX + 'lp')

const RIGHT_PROPERTY: LeafPropertyObject = generateLeafPropertyObject(RIGHT_ENTITY_PREFIX + 'lp')

const LEFT_GROUP: PropertiesGroupObject<LeafPropertyObject> = generatePropertiesGroupObject(LEFT_ENTITY_PREFIX + 'pg', { properties: [LEFT_GROUP_PROPERTY] })

const RIGHT_GROUP: PropertiesGroupObject<LeafPropertyObject> = generatePropertiesGroupObject(RIGHT_ENTITY_PREFIX + 'pg', { properties: [RIGHT_GROUP_PROPERTY] })

const LEFT_GROUPS: PropertiesGroupObject<LeafPropertyObject>[] = [
  ...range(1, 25).map(index => (
    generatePropertiesGroupObject(
      index + 'pg',
    ))),
]

const LEFT_CLASS: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject(LEFT_ENTITY_PREFIX + 'c', { properties: [LEFT_GROUP, LEFT_PROPERTY, ...LEFT_GROUPS] })

const RIGHT_CLASS: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject(RIGHT_ENTITY_PREFIX + 'c', { properties: [RIGHT_GROUP, RIGHT_PROPERTY] })

const ADDITIONAL_CLASSES: ClassObject<PropertyObject<DefaultDomainMeta>>[] = [
  ...range(1, 6).map(index => (
    generateClassObject(
      index + 'c',
      { properties: [generateLeafPropertyObject(index + 'lp')] },
    ))),
]

const LEFT_RELATION: RelationObject<DefaultDomainMeta> = generatePropertyToClassRelation({
  leafPropertyKey: `llp`,
  referenceClassKey: `1c`,
})

const RIGHT_RELATION: RelationObject<DefaultDomainMeta> = generatePropertyToClassRelation({
  leafPropertyKey: `6lp`,
  referenceClassKey: `rc`,
})

const RELATIONS: RelationObject<DefaultDomainMeta> [] = [
  LEFT_RELATION,
  ...range(1, 6).map(index => (generatePropertyToClassRelation({
    leafPropertyKey: `${index}lp`,
    referenceClassKey: `${index + 1}c`,
  }))),
  RIGHT_RELATION
]

const CONTENT = generateContent({
  classes: [LEFT_CLASS, ...ADDITIONAL_CLASSES, RIGHT_CLASS],
  relations: [...RELATIONS],
})

export const StaticApply: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  const options: OptionalMembers<NavigateOptions> = {
    insets: args.navigateOptionInsets,
  }
  switch (args.callNavigateToAt) {
    case NavigateSide.LEFT: {
      const toNavigateLeft: DomainObject[] = []
      if (args.navigateIncludeClass) {
        toNavigateLeft.push(LEFT_CLASS)
      }
      if (args.navigateIncludeClassSProperty) {
        toNavigateLeft.push(LEFT_PROPERTY)
      }
      if (args.navigateIncludeGroup) {
        toNavigateLeft.push(LEFT_GROUP)
      }
      if (args.navigateIncludeGroupSProperty) {
        toNavigateLeft.push(LEFT_GROUP_PROPERTY)
      }
      if (args.navigateIncludeRelation) {
        toNavigateLeft.push(LEFT_RELATION)
      }
      if (toNavigateLeft.length > 0) {
        component.navigateTo(toNavigateLeft, options)
      }
      break
    }
    case NavigateSide.RIGHT: {
      const toNavigateRight: DomainObject[] = []
      if (args.navigateIncludeClass) {
        toNavigateRight.push(RIGHT_CLASS)
      }
      if (args.navigateIncludeClassSProperty) {
        toNavigateRight.push(RIGHT_PROPERTY)
      }
      if (args.navigateIncludeGroup) {
        toNavigateRight.push(RIGHT_GROUP)
      }
      if (args.navigateIncludeGroupSProperty) {
        toNavigateRight.push(RIGHT_GROUP_PROPERTY)
      }
      if (args.navigateIncludeRelation) {
        toNavigateRight.push(RIGHT_RELATION)
      }
      if (toNavigateRight.length > 0) {
        component.navigateTo(toNavigateRight, options)
      }
      break
    }
    case NavigateSide.BOTH: {
      const toNavigate: DomainObject[] = []
      if (args.navigateIncludeClass) {
        toNavigate.push(LEFT_CLASS)
        toNavigate.push(RIGHT_CLASS)
      }
      if (args.navigateIncludeClassSProperty) {
        toNavigate.push(LEFT_PROPERTY)
        toNavigate.push(RIGHT_PROPERTY)
      }
      if (args.navigateIncludeGroup) {
        toNavigate.push(LEFT_GROUP)
        toNavigate.push(RIGHT_GROUP)
      }
      if (args.navigateIncludeGroupSProperty) {
        toNavigate.push(LEFT_GROUP_PROPERTY)
        toNavigate.push(RIGHT_GROUP_PROPERTY)
      }
      if (args.navigateIncludeRelation) {
        toNavigate.push(LEFT_RELATION)
        toNavigate.push(RIGHT_RELATION)
      }
      if (toNavigate.length > 0) {
        component.animationDuration = args.navigateOptionAnimationDuration
        component.navigateTo(toNavigate, options)
      }
      break
    }
    default:
    case NavigateSide.NONE:
  }
}, baseContext => {
  baseContext.component.content = CONTENT
  return baseContext
})
