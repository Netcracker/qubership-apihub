import { Meta, StoryFn } from '@storybook/html-vite'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateContent,
  generateIncludePropertiesGroupRelation,
  generatePropertiesGroupObject,
  PROPERTIES_GROUP_SUFFIX,
  range,
  storyArgsFunc
} from 'stories/common'

export default {
  title: 'Synthetic/Topology',
  argTypes: {
    primary: {
      name: 'Primary',
      control: 'boolean',
    },
    addGroupRelation: {
      name: 'Add group relation',
      control: 'boolean',
    },
  },
  args: {
    primary: false,
    addGroupRelation: false
  }
} satisfies Meta<StoryArgs>

type StoryArgs = {
  primary: boolean;
  addGroupRelation: boolean;
}

const MAIN_PREFIX = 'main'
const ADDITIONAL_PREFIX = 'additional'

export const IncludePropertiesGroupRelationMutation: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  const relations = [
    generateIncludePropertiesGroupRelation({
      propertyGroupKey: `${MAIN_PREFIX}1${PROPERTIES_GROUP_SUFFIX}`,
      includedClassKey: `${ADDITIONAL_PREFIX}1${CLASS_SUFFIX}`,
      primary: args.primary
    })
  ]

  if (args.addGroupRelation) {
    relations.push(
      generateIncludePropertiesGroupRelation({
        propertyGroupKey: `${MAIN_PREFIX}2${PROPERTIES_GROUP_SUFFIX}`,
        includedClassKey: `${ADDITIONAL_PREFIX}2${CLASS_SUFFIX}`,
        primary: args.primary
      })
    )
  }

  component.content = generateContent({
    classes: [
      ...range(1, 2).map(index => (
        generateClassObject(MAIN_PREFIX + index + CLASS_SUFFIX, {
          properties: [
            generatePropertiesGroupObject(MAIN_PREFIX + index + PROPERTIES_GROUP_SUFFIX)
          ]
        })
      )),
      ...range(1, 2).map(index => (
        generateClassObject(ADDITIONAL_PREFIX + index + CLASS_SUFFIX)
      )),
    ],
    relations: relations
  })
}, baseContext => {
  return baseContext
})
