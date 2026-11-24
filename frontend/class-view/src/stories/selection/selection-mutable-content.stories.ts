import { Meta, StoryFn } from '@storybook/html-vite'
import { generateContentByPrefix, storyArgsFunc } from 'stories/common'
import { HasProperties } from 'main/domain/object/base'
import { DefaultDomainMeta, LeafPropertyObject, PropertiesGroupObject, PropertyObject } from 'main/domain'

enum ChangeContentStage {
  NO_CHANGES,
  OLD_KEYS,
  NEW_KEYS
}

export default {
  title: 'Synthetic/Selection',
  argTypes: {
    changeContent: {
      name: 'Change content',
      control: {
        type: 'radio',
        labels: {
          [ChangeContentStage.NO_CHANGES]: 'No changes',
          [ChangeContentStage.OLD_KEYS]: 'Old keys',
          [ChangeContentStage.NEW_KEYS]: 'New keys',
        },
      },
      options: [
        ChangeContentStage.NO_CHANGES, ChangeContentStage.OLD_KEYS, ChangeContentStage.NEW_KEYS,
      ],
    },
  },
  args: {
    changeContent: ChangeContentStage.NO_CHANGES,
  },
} satisfies Meta<StoryArgs>

type StoryArgs = {
  changeContent: ChangeContentStage;
}

const LEFT_ENTITY_PREFIX = 'l'
const RIGHT_ENTITY_PREFIX = 'r'

export const SelectionMutableContent: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  switch (args.changeContent) {
    case ChangeContentStage.OLD_KEYS: {
      component.content = generateContentByPrefix(LEFT_ENTITY_PREFIX)
      break
    }
    case ChangeContentStage.NEW_KEYS: {
      component.content = generateContentByPrefix(RIGHT_ENTITY_PREFIX)
      break
    }
  }
}, baseContext => {
  const content = generateContentByPrefix(LEFT_ENTITY_PREFIX)
  baseContext.component.content = content
  baseContext.component.selectedObjects = [
    ...content.classes || [],
    ...content.relations || [],
    ...(content.classes || []).flatMap(cl => extractAllProperties(cl)),
  ]
  return baseContext
})

function extractAllProperties<P extends PropertyObject<DefaultDomainMeta>>(hasProperties: HasProperties<P>): P[] {
  const prp = hasProperties.properties || []
  const children = prp
    .filter(value => value.kind === 'group')
    .flatMap(value => extractAllProperties(value as PropertiesGroupObject<LeafPropertyObject>)) as P[]
  return [...prp, ...children]
}
