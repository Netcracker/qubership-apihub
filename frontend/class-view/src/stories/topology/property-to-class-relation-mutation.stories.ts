import { Meta, StoryFn } from '@storybook/html-vite'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateContent,
  generateLeafPropertyObject,
  generatePropertyToClassRelation,
  LEAF_PROPERTY_SUFFIX,
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
    addPropertyRelation: {
      name: 'Add property relation',
      control: 'boolean',
    },
  },
  args: {
    primary: false,
    addPropertyRelation: false
  }
} satisfies Meta<StoryArgs>

type StoryArgs = {
  primary: boolean;
  addPropertyRelation: boolean;
}

const MAIN_PREFIX = 'main'
const ADDITIONAL_PREFIX = 'additional'

export const PropertyToClassRelationMutation: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  const relations = [
    generatePropertyToClassRelation({
      leafPropertyKey: `${MAIN_PREFIX}1${LEAF_PROPERTY_SUFFIX}`,
      referenceClassKey: `${ADDITIONAL_PREFIX}1${CLASS_SUFFIX}`,
      primary: args.primary
    }),
  ]

  if (args.addPropertyRelation) {
    relations.push(
      generatePropertyToClassRelation({
        leafPropertyKey: `${MAIN_PREFIX}2${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `${ADDITIONAL_PREFIX}2${CLASS_SUFFIX}`,
        primary: args.primary
      })
    )
  }

  component.content = generateContent({
    classes: [
      ...range(1, 2).map(index => (
        generateClassObject(MAIN_PREFIX + index + CLASS_SUFFIX, {
          properties: [
            generateLeafPropertyObject(MAIN_PREFIX + index + LEAF_PROPERTY_SUFFIX),
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
