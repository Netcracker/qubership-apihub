import { Meta, StoryFn } from '@storybook/html-vite'
import { generateContentByPrefix, storyArgsFunc } from 'stories/common'
import { EVENT_SELECTION_CHANGE, SelectionChangeData } from 'main/component'

enum ProhibteStage {
  NONE,
  PREVENT_DEFAULT,
  CHANGE_SELECTION_PROPERTY
}

export default {
  title: 'Synthetic/Selection',
  argTypes: {
    prohibitSelection: {
      name: 'Prohibit selection',
      control: {
        type: 'radio',
        labels: {
          [ProhibteStage.NONE]: 'None',
          [ProhibteStage.PREVENT_DEFAULT]: 'Prevent default',
          [ProhibteStage.CHANGE_SELECTION_PROPERTY]: 'Change selection property',
        },
      },
      options: [
        ProhibteStage.NONE, ProhibteStage.PREVENT_DEFAULT, ProhibteStage.CHANGE_SELECTION_PROPERTY,
      ],
    },
  },
  args: {
    prohibitSelection: ProhibteStage.NONE,
  },
} satisfies Meta<StoryArgs>

type StoryArgs = {
  prohibitSelection: ProhibteStage;
}

const CONTENT = generateContentByPrefix('key')

let preventListener: (ev: CustomEvent<SelectionChangeData>) => void = () => console.warn('Not installed')
let changeListener: (ev: CustomEvent<SelectionChangeData>) => void = () => console.warn('Not installed')

export const ProhibitSelection: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  switch (args.prohibitSelection) {
    case ProhibteStage.NONE: {
      component.removeEventListener(EVENT_SELECTION_CHANGE, preventListener)
      component.removeEventListener(EVENT_SELECTION_CHANGE, changeListener)
      break
    }
    case ProhibteStage.PREVENT_DEFAULT: {
      component.addEventListener(EVENT_SELECTION_CHANGE, preventListener)
      component.removeEventListener(EVENT_SELECTION_CHANGE, changeListener)
      break
    }
    case ProhibteStage.CHANGE_SELECTION_PROPERTY: {
      component.removeEventListener(EVENT_SELECTION_CHANGE, preventListener)
      component.addEventListener(EVENT_SELECTION_CHANGE, changeListener)
      break
    }
  }
}, baseContext => {
  baseContext.component.content = CONTENT
  preventListener = ev => {
    ev.preventDefault()
  }
  changeListener = ev => {
    baseContext.component.selectedObjects = ev.detail.oldValue
  }
  return baseContext
})

