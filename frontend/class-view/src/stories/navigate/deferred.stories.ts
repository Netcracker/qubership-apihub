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
import { NavigateOptions } from 'main/component'

enum NavigateTarget {
  NONE,
  CLASS,
  CLASSES_PROPERTY,
  GROUP,
  GROUPS_PROPERTY,
  RELATION,
  NON_EXISTENT
}

export default {
  title: 'Synthetic/Navigate',
  argTypes: {
    ...NAVIGATION_OPTION_ARGS_TYPE,
    navigateToTarget: {
      name: 'Navigate To',
      control: {
        type: 'radio',
        labels: {
          [NavigateTarget.NONE]: 'None',
          [NavigateTarget.CLASS]: 'Class',
          [NavigateTarget.CLASSES_PROPERTY]: 'Class\'s property',
          [NavigateTarget.GROUP]: 'Group',
          [NavigateTarget.GROUPS_PROPERTY]: 'Group\'s property',
          [NavigateTarget.RELATION]: 'Relation',
          [NavigateTarget.NON_EXISTENT]: 'Non-existent',
        },
      },
      options: [
        NavigateTarget.NONE, NavigateTarget.CLASS, NavigateTarget.CLASSES_PROPERTY, NavigateTarget.GROUP, NavigateTarget.GROUPS_PROPERTY, NavigateTarget.RELATION, NavigateTarget.NON_EXISTENT,
      ],
    },
  },
  args: {
    navigateToTarget: NavigateTarget.NONE,
    ...NAVIGATION_OPTION_ARGS,
  },
} satisfies Meta<StoryArgs>

type StoryArgs = {
  navigateToTarget: NavigateTarget;
} & NavigationOptionConfiguration

const BASE_ENTITY_PREFIX = '1'

const GROUP_PROPERTY: LeafPropertyObject = generateLeafPropertyObject(BASE_ENTITY_PREFIX + 'lpg')

const PROPERTY: LeafPropertyObject = generateLeafPropertyObject(BASE_ENTITY_PREFIX + 'lp')

const GROUP: PropertiesGroupObject<LeafPropertyObject> = generatePropertiesGroupObject(BASE_ENTITY_PREFIX + 'pg', { properties: [GROUP_PROPERTY] })

const GROUPS: PropertiesGroupObject<LeafPropertyObject>[] = [
  ...range(2, 25).map(index => (
    generatePropertiesGroupObject(
      index + 'pg',
    ))),
]

const CLASS: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject(BASE_ENTITY_PREFIX + 'c', { properties: [GROUP, PROPERTY, ...GROUPS] })

const ADDITIONAL_CLASSES: ClassObject<PropertyObject<DefaultDomainMeta>>[] = [
  ...range(2, 6).map(index => (
    generateClassObject(
      index + 'c',
      { properties: [generateLeafPropertyObject(index + 'lp')] },
    ))),
]

const RELATIONS: RelationObject<DefaultDomainMeta>[] = [
  ...range(1, 6).map(index => (generatePropertyToClassRelation({
    leafPropertyKey: `${index}lp`,
    referenceClassKey: `${index + 1}c`,
  }))),
]
const CONTENT = generateContent({ classes: [CLASS, ...ADDITIONAL_CLASSES], relations: [...RELATIONS] })

const NON_EXISTENT: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject('non-existent')

export const DeferredApply: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  const options: OptionalMembers<NavigateOptions> = {
    insets: args.navigateOptionInsets,
  }
  component.animationDuration = args.navigateOptionAnimationDuration
  component.content = CONTENT
  switch (args.navigateToTarget) {
    case NavigateTarget.CLASS:
      component.selectedObjects = [CLASS]
      component.navigateTo([CLASS], options)
      break
    case NavigateTarget.CLASSES_PROPERTY:
      component.selectedObjects = [PROPERTY]
      component.navigateTo([PROPERTY], options)
      break
    case NavigateTarget.GROUP:
      component.selectedObjects = [GROUP]
      component.navigateTo([GROUP], options)
      break
    case NavigateTarget.GROUPS_PROPERTY:
      component.selectedObjects = [GROUP_PROPERTY]
      component.navigateTo([GROUP_PROPERTY], options)
      break
    case NavigateTarget.RELATION:
      component.selectedObjects = [CONTENT.relations![0]]
      component.navigateTo([CONTENT.relations![0]], options)
      break
    case NavigateTarget.NON_EXISTENT:
      component.selectedObjects = [NON_EXISTENT]
      component.navigateTo([NON_EXISTENT], options)
      break
    default:
    case NavigateTarget.NONE:
  }
}, baseContext => {
  baseContext.component.content = CONTENT
  return baseContext
})
