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

const CLASS_NAME_BY_STAGE: Record<NameStage, string> = {
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
    addGroup: {
      name: 'Add group',
      control: 'boolean',
    },
    className: {
      name: 'Class name',
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
    classCustomName: {
      name: 'Class custom name',
      control: {
        type: 'text',
      },
      if: { arg: 'className', eq: NameStage.CUSTOM },
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
    addGroup: false,
    className: NameStage.EMPTY,
    classCustomName: 'custom text',
    deprecated: false,
  },
} satisfies Meta<StoryArgs>

type StoryArgs = {
  addProperty: boolean
  addGroup: boolean
  className: NameStage
  classCustomName: string
  deprecated: boolean
}

export const ClassMutation: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  const additionalProperty = []

  const leafProperties = [
    generateLeafPropertyObject('21' + LEAF_PROPERTY_SUFFIX),
    generateLeafPropertyObject('22' + LEAF_PROPERTY_SUFFIX),
  ]
  if (args.addProperty) {
    additionalProperty.push(generateLeafPropertyObject('1' + LEAF_PROPERTY_SUFFIX, {}))
    leafProperties.push(generateLeafPropertyObject('23' + LEAF_PROPERTY_SUFFIX))
  }

  const propertiesGroups = [
    generatePropertiesGroupObject('31' + PROPERTIES_GROUP_SUFFIX),
    generatePropertiesGroupObject('32' + PROPERTIES_GROUP_SUFFIX),
  ]
  if (args.addGroup) {
    additionalProperty.push(generatePropertiesGroupObject('1' + PROPERTIES_GROUP_SUFFIX))
    propertiesGroups.push(generatePropertiesGroupObject('23' + PROPERTIES_GROUP_SUFFIX))
  }

  const classes = [
    generateClassObject('1' + CLASS_SUFFIX, {
      name: args.classCustomName ? args.classCustomName : CLASS_NAME_BY_STAGE[args.className],
      deprecated: args.deprecated,
      properties: additionalProperty,
    }),
    generateClassObject('2' + CLASS_SUFFIX, {
      name: args.classCustomName ? args.classCustomName : CLASS_NAME_BY_STAGE[args.className],
      deprecated: args.deprecated,
      properties: leafProperties,
    }),
    generateClassObject('3' + CLASS_SUFFIX, {
      name: args.classCustomName ? args.classCustomName : CLASS_NAME_BY_STAGE[args.className],
      deprecated: args.deprecated,
      properties: propertiesGroups,
    }),
  ]

  component.content = generateContent({
    classes: classes,
  })
}, baseContext => {
  return baseContext
})
