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

import { DefaultDomainMeta, DomainMeta, PropertyObject, RelationObject } from 'main/domain/object/meta'
import { ClassViewComponent } from 'main/component'
import { StoryFn } from '@storybook/html'
import { action } from '@storybook/addon-actions'
import { useChannel } from '@storybook/addons'
import { RESET_STORY_ARGS } from '@storybook/core-events'
import {
  ClassViewApi,
  EVENT_LAYOUT_FINISH,
  EVENT_LAYOUT_START,
  EVENT_SELECTION_CHANGE,
  EVENT_UPDATE_FINISH,
  EVENT_UPDATE_START,
  EVENT_VIEWPORT_CENTER_CHANGE,
  EVENT_ZOOM_CHANGE,
} from 'main/component/class-view-api'
import {
  ClassObject,
  ContentObject,
  IncludePropertiesGroupRelationObject,
  Integer,
  Key,
  LeafPropertyObject,
  PropertiesGroupObject,
  PROPERTY_TYPE_GROUP,
  PROPERTY_TYPE_LEAF,
  PropertyToClassRelationObject,
  RELATION_TYPE_INCLUDE_PROPERTIES_GROUP,
  RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE,
} from 'main/domain'

type StoryArgs<Meta extends DomainMeta> = Pick<ClassViewComponent<Meta>, keyof ClassViewApi<Meta>>

export type StoryContext<Args extends Record<string, unknown>, Meta extends DomainMeta = DefaultDomainMeta> =
  Record<string, unknown>
  & {
  component: ClassViewComponent<Meta>;
  first: boolean;
  lastArgs: Args;
}

export const Template: StoryFn<StoryArgs<DomainMeta>> = (args): HTMLElement => createClassViewComponent(args)

export function storyArgsFunc<
  Args extends Record<string, unknown>,
  Meta extends DomainMeta = DefaultDomainMeta,
  ContextT extends StoryContext<Args, Meta> = StoryContext<Args, Meta>
>(
  storyBodyFunc: (args: Args, component: ClassViewComponent<Meta>, context: ContextT) => HTMLElement | void,
  contextInitializer: (baseContext: StoryContext<Args, Meta>) => ContextT = baseContext => baseContext as ContextT,
): StoryFn<Args> {
  let context: ContextT | undefined
  return (args): HTMLElement => {
    useChannel({
      [RESET_STORY_ARGS]: () => {
        context = undefined
      },
    })
    if (!context) {
      context = contextInitializer({
        first: true,
        component: createClassViewComponent(args),
        lastArgs: args,
      })
    } else {
      Object.assign(context.component, args)
    }
    const result = storyBodyFunc(args, context.component, context) || context.component
    context.first = false
    context.lastArgs = args
    return result
  }
}

function createClassViewComponent<Meta extends DomainMeta>(args: Partial<StoryArgs<Meta>>): ClassViewComponent<Meta> {
  const component: ClassViewComponent<Meta> = new ClassViewComponent()
  component.style.position = 'absolute'
  component.style.top = '0'
  component.style.left = '0'
  component.style.right = '0'
  component.style.bottom = '0'
  let updateStarted = NaN
  let layoutStarted = NaN
  component.addEventListener(EVENT_LAYOUT_START, () => {
    layoutStarted = performance.now()
    action(EVENT_LAYOUT_START)('Started...')
  })
  component.addEventListener(EVENT_LAYOUT_FINISH, () => {
    action(EVENT_LAYOUT_FINISH)(`Finished. ${(performance.now() - layoutStarted).toFixed(2)} ms`)
    layoutStarted = NaN
  })
  component.addEventListener(EVENT_UPDATE_START, () => {
    updateStarted = performance.now()
    action(EVENT_UPDATE_START)('Started...')
  })
  component.addEventListener(EVENT_UPDATE_FINISH, () => {
    action(EVENT_UPDATE_FINISH)(`Finished. ${(performance.now() - updateStarted).toFixed(2)} ms`)
    updateStarted = NaN
  })

  component.addEventListener(EVENT_SELECTION_CHANGE, e => action(EVENT_SELECTION_CHANGE)(e.detail))
  component.addEventListener(EVENT_ZOOM_CHANGE, e => action(EVENT_ZOOM_CHANGE)(e.detail))
  component.addEventListener(EVENT_VIEWPORT_CENTER_CHANGE, e => action(EVENT_VIEWPORT_CENTER_CHANGE)(e.detail))
  component.addEventListener(EVENT_UPDATE_FINISH, () => {
    // for integration tests
    document.dispatchEvent(new CustomEvent(EVENT_UPDATE_FINISH))
  })
  Object.assign(component, args)
  return component
}

export function range(from: Integer, length: Integer): Integer[] {
  return new Array(length).fill(0).map((_, index) => from + index)
}

export function generatePropertyToClassRelation(
  body: Partial<Omit<PropertyToClassRelationObject, 'kind'>> = {},
): PropertyToClassRelationObject {
  return {
    kind: RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE,
    ...body,
  }
}

export function generateIncludePropertiesGroupRelation(
  body: Partial<Omit<IncludePropertiesGroupRelationObject, 'kind'>> = {},
): IncludePropertiesGroupRelationObject {
  return {
    kind: RELATION_TYPE_INCLUDE_PROPERTIES_GROUP,
    ...body,
  }
}

export function generateLeafPropertyObject(
  key: Key,
  body: Partial<Omit<LeafPropertyObject, 'key' | 'kind'>> = {},
): LeafPropertyObject {
  return {
    key: key,
    kind: PROPERTY_TYPE_LEAF,
    ...body,
  }
}

export function generatePropertiesGroupObject(
  key: Key,
  body: Partial<Omit<PropertiesGroupObject<LeafPropertyObject>, 'key' | 'kind'>> = {},
): PropertiesGroupObject<LeafPropertyObject> {
  return {
    key: key,
    kind: PROPERTY_TYPE_GROUP,
    ...body,
  }
}

export function generateClassObject(
  key: Key,
  body: Partial<Omit<ClassObject<PropertyObject<DefaultDomainMeta>>, 'key'>> = {},
): ClassObject<PropertyObject<DefaultDomainMeta>> {
  return {
    key: key,
    ...body,
  }
}

export function generateContent(
  body: Partial<ContentObject> = {},
): ContentObject {
  return {
    ...body,
  }
}

export const CLASS_SUFFIX = 'class'
export const LEAF_PROPERTY_SUFFIX = 'property'
export const PROPERTIES_GROUP_SUFFIX = 'group'

export function generateContentByPrefix(key: string): ContentObject {

  const groupProperty: LeafPropertyObject = generateLeafPropertyObject(key + 'lpg', { name: 'Group property'})
  const property: LeafPropertyObject = generateLeafPropertyObject(key + 'lp', { name: 'Class property'})
  const group: PropertiesGroupObject<LeafPropertyObject> = generatePropertiesGroupObject(key + 'pg', {
    name: 'Group',
    properties: [groupProperty]
  })
  const classObject: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject(key + 'c', {
    name: 'Class',
    properties: [group, property]
  })
  const groupClass: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject(key + 'gc')
  const propertyRelation: RelationObject<DefaultDomainMeta> = generatePropertyToClassRelation({
    key: `${key}lp-${key}c`,
    leafPropertyKey: `${key}lp`,
    referenceClassKey: `${key}c`,
  })
  const groupRelation: RelationObject<DefaultDomainMeta> = generateIncludePropertiesGroupRelation({
    key: `${key}pg-${key}gc`,
    propertyGroupKey: `${key}pg`,
    includedClassKey: `${key}gc`,
  })
  return generateContent({
    classes: [classObject, groupClass],
    relations: [propertyRelation, groupRelation],
  })
}

