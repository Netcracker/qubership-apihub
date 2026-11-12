import { Meta, StoryFn } from '@storybook/html-vite'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateContent,
  generateLeafPropertyObject,
  generatePropertiesGroupObject,
  LEAF_PROPERTY_SUFFIX,
  PROPERTIES_GROUP_SUFFIX,
  storyArgsFunc,
} from 'stories/common'

enum NameStage {
  EMPTY,
  SHORT,
  LONG,
  CUSTOM
}

const NAME_BY_STAGE: Record<NameStage, string> = {
  [NameStage.EMPTY]: '',
  [NameStage.SHORT]: 'short name',
  [NameStage.LONG]: 'long name long name long name long name long name long name long name',
  [NameStage.CUSTOM]: '',
}

export default {
  title: 'Synthetic/Topology',
  argTypes: {
    addProperty: {
      name: 'Add property',
      control: 'boolean',
    },
    groupName: {
      name: 'Group name',
      control: {
        type: 'radio',
        labels: {
          [NameStage.EMPTY]: 'Empty',
          [NameStage.SHORT]: 'Short',
          [NameStage.LONG]: 'Long',
          [NameStage.CUSTOM]: 'Custom',
        },
      },
      options: [
        NameStage.EMPTY, NameStage.SHORT, NameStage.LONG, NameStage.CUSTOM,
      ],
    },
    groupCustomName: {
      name: 'Group custom name',
      control: {
        type: 'text',
      },
      if: { arg: 'groupName', eq: NameStage.CUSTOM },
    },
    deprecated: {
      name: 'Deprecated',
      control: {
        type: 'boolean',
      },
    },
  },
  args: {
    addProperty: false,
    groupName: NameStage.EMPTY,
    groupCustomName: 'custom text',
    deprecated: false,
  },
} satisfies Meta<StoryArgs>

type StoryArgs = {
  addProperty: boolean;
  groupName: NameStage;
  groupCustomName: string;
  deprecated: boolean;
}

export const PropertiesGroupMutation: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  component.content = generateContent({
    classes: [
      generateClassObject('1' + CLASS_SUFFIX, {
        properties: [
          generatePropertiesGroupObject('1' + PROPERTIES_GROUP_SUFFIX, {
            name: args.groupCustomName ? args.groupCustomName : NAME_BY_STAGE[args.groupName],
            deprecated: args.deprecated,
            properties: args.addProperty ? [generateLeafPropertyObject('1' + LEAF_PROPERTY_SUFFIX)] : [],
          }),
        ],
      }),
      generateClassObject('2' + CLASS_SUFFIX, {
        properties: [
          generatePropertiesGroupObject('2' + PROPERTIES_GROUP_SUFFIX, {
            name: args.groupCustomName ? args.groupCustomName : NAME_BY_STAGE[args.groupName],
            deprecated: args.deprecated,
            properties: args.addProperty ? [
              generateLeafPropertyObject('21' + LEAF_PROPERTY_SUFFIX),
              generateLeafPropertyObject('22' + LEAF_PROPERTY_SUFFIX),
              generateLeafPropertyObject('23' + LEAF_PROPERTY_SUFFIX),
            ] : [
              generateLeafPropertyObject('21' + LEAF_PROPERTY_SUFFIX),
              generateLeafPropertyObject('23' + LEAF_PROPERTY_SUFFIX),
            ],
          }),
        ],
      }),
    ],
  })
}, baseContext => {
  return baseContext
})
