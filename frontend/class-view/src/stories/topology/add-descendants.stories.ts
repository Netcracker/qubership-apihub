import { Meta, StoryFn } from '@storybook/html-vite'
import { ContentObject } from 'main/domain'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateIncludePropertiesGroupRelation,
  generateLeafPropertyObject,
  generatePropertiesGroupObject,
  generatePropertyToClassRelation,
  LEAF_PROPERTY_SUFFIX,
  PROPERTIES_GROUP_SUFFIX,
  range,
  storyArgsFunc
} from 'stories/common'

export default {
  title: 'Synthetic/Topology',
  argTypes: {
    layers: {
      name: 'Layers',
      control: { type: 'range', min: 0, max: 10, step: 1 },
    }
  },
  args: {
    layers: 1
  }
} satisfies Meta<StoryArgs>

type StoryArgs = {
  layers: number;
}

function generate(layers: number): ContentObject {
  let classes = [
    generateClassObject('0' + CLASS_SUFFIX, {
      properties: [
        generateLeafPropertyObject('0' + LEAF_PROPERTY_SUFFIX),
        generatePropertiesGroupObject('0' + PROPERTIES_GROUP_SUFFIX)
      ]
    })
  ]
  let relation = [
    ...range(1, 10).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: '0' + LEAF_PROPERTY_SUFFIX,
        referenceClassKey: `1${index}${CLASS_SUFFIX}`
      }))),
    ...range(1, 10).map(index => (
      generateIncludePropertiesGroupRelation({
        propertyGroupKey: '0' + PROPERTIES_GROUP_SUFFIX,
        includedClassKey: `1${index}${CLASS_SUFFIX}`
      }))),
  ]
  for (let i = 1; i <= layers; i++) {
    const newClasses = [
      ...range(1, 10).map(index => (
        generateClassObject(`${i}${index}${CLASS_SUFFIX}`, {
          properties: [
            generateLeafPropertyObject(`${i}${index}${LEAF_PROPERTY_SUFFIX}`),
            generatePropertiesGroupObject(`${i}${index}${PROPERTIES_GROUP_SUFFIX}`)
          ]
        }))),
    ]
    const newRelation = [
      ...range(1, 10).map(index => (
        generatePropertyToClassRelation({
          leafPropertyKey: `${i}${index}${LEAF_PROPERTY_SUFFIX}`,
          referenceClassKey: `${i + 1}${index}${CLASS_SUFFIX}`
        }))),
      ...range(1, 10).map(index => (
        generateIncludePropertiesGroupRelation({
          propertyGroupKey: `${i}${index}${PROPERTIES_GROUP_SUFFIX}`,
          includedClassKey: `${i + 1}${index}${CLASS_SUFFIX}`
        }))),
    ]
    classes = [...classes, ...newClasses]
    relation = [...relation, ...newRelation]
  }
  return {
    classes: classes,
    relations: relation
  }
}

export const AddDescendants: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  component.content = generate(args.layers)
}, baseContext => {
  return baseContext
})
