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
  generateClassObject,
  generateContent,
  generatePropertiesGroupObject,
  storyArgsFunc,
  StoryContext,
} from 'stories/common'
import { DefaultDomainMeta, Optional } from 'main/domain'
import { isDefine } from 'main/core/utils'

export default {
  title: 'Synthetic/Viewport',
  argTypes: {
    run: {
      name: 'Run infinity zoom change',
      control: {
        type: 'boolean',
      },
    },
  },
  args: {
    run: false,
  },
} satisfies Meta<StoryArgs>

type StoryArgs = {
  run: boolean;
}

interface ThisStoryContext extends StoryContext<StoryArgs, DefaultDomainMeta> {
  interval: Optional<ReturnType<typeof setInterval>>
}

export const Concurrency: StoryFn<StoryArgs> = storyArgsFunc<StoryArgs, DefaultDomainMeta, ThisStoryContext>((args, component, context) => {
  if (args.run) {
    context.interval = setInterval(() => {
      component.zoom = 1 + Math.random()
    }, 25)
  } else if (isDefine(context.interval)) {
    clearInterval(context.interval)
  }

}, baseContext => {
  baseContext.component.content = generateContent({
    classes: [
      generateClassObject('class', {
        properties: [
          generatePropertiesGroupObject('group'),
        ],
      }),
    ],
  })
  return { ...baseContext, interval: undefined }
})
