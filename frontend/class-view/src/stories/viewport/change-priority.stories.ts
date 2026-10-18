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
  DefaultDomainMeta, Duration,
  Key,
  Optional,
  PropertyObject,
  RelationObject,
} from 'main/domain'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateLeafPropertyObject,
  generatePropertyToClassRelation,
  LEAF_PROPERTY_SUFFIX,
  range,
  storyArgsFunc,
} from 'stories/common'
import { useArgs } from '@storybook/client-api'
import { isDefine } from 'main/core/utils'
import { DEFAULT_ANIMATION_DURATION } from 'main/defaults'

enum Action {
  NONE,
  ACTION,
}

let updateArgsCapture: Optional<(arg: Partial<StoryArgs>) => void>

export default {
  title: 'Synthetic/Viewport',
  argTypes: {
    activateZoomChange: {
      name: 'Activate zoom change',
      control: 'boolean',
    },
    activateContentChange: {
      name: 'Activate content change',
      control: 'boolean',
    },
    activateNavigateChange: {
      name: 'Activate navigate change',
      control: 'boolean',
    },
    animationDuration: {
      name: 'Animation duration',
      control: { type: 'number', min: 0, max: 5000, step: 50 },
    },
    action: {
      name: 'Do action',
      control: {
        type: 'radio',
        labels: {
          [Action.NONE]: 'None',
          [Action.ACTION]: 'Action',
        },
      },
      options: [
        Action.NONE, Action.ACTION,
      ],
    },
  },
  args: {
    animationDuration: DEFAULT_ANIMATION_DURATION,
    activateZoomChange: false,
    activateContentChange: false,
    activateNavigateChange: false,
    action: Action.NONE,
  },
} satisfies Meta<StoryArgs>

type StoryArgs = {
  animationDuration: Duration,
  activateZoomChange: boolean,
  activateContentChange: boolean,
  activateNavigateChange: boolean,
  action: Action
}

function generateContent(keyPrefix: Key): ContentObject {
  let classes: ClassObject<PropertyObject<DefaultDomainMeta>>[] = []
  let relations: RelationObject<DefaultDomainMeta>[] = []
  for (let i = 0; i <= 10; i++) {
    const newClasses: ClassObject<PropertyObject<DefaultDomainMeta>>[] = [
      ...range(1, 10).map(index => (
        generateClassObject(
          keyPrefix + i + index + CLASS_SUFFIX,
          { properties: [generateLeafPropertyObject(keyPrefix + i + index + LEAF_PROPERTY_SUFFIX)] },
        ))),
    ]
    const newRelation = [
      ...range(1, 10).map(index => (generatePropertyToClassRelation({
        leafPropertyKey: keyPrefix + i + index + LEAF_PROPERTY_SUFFIX,
        referenceClassKey: `${keyPrefix}${i + 1}${index}${CLASS_SUFFIX}`,
      }))),
    ]
    classes = [...classes, ...newClasses]
    relations = [...relations, ...newRelation]
  }
  return {
    classes: classes,
    relations: relations,
  }
}

export const ChangePriority: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  const [
    , updateArgs,
  ] = useArgs()
  updateArgsCapture = updateArgs

  if (args.action == Action.ACTION) {
    component.animationDuration = args.animationDuration
    if (args.activateZoomChange) {
      component.zoom = 0.5
    }
    if (args.activateContentChange) {
      component.content = generateContent(Math.random().toString())
    }
    if (args.activateNavigateChange) {
      component.navigateTo([component.content.classes![0]])
    }
    setTimeout(() => {
      if (isDefine(updateArgsCapture)) {
        updateArgsCapture({
          action: Action.NONE,
        })
      }
    }, 1)

  }
}, baseContext => {
  baseContext.component.content = generateContent(Math.random().toString())
  return baseContext
})
