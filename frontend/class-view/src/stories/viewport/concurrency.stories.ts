import { Meta, StoryFn } from '@storybook/html-vite'
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
