import { Meta } from '@storybook/html-vite'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateContent,
  generateIncludePropertiesGroupRelation,
  generateLeafPropertyObject,
  generatePropertiesGroupObject,
  generatePropertyToClassRelation,
  LEAF_PROPERTY_SUFFIX,
  PROPERTIES_GROUP_SUFFIX,
  range,
  Template
} from 'stories/common'

export default {
  title: 'Synthetic/Layout',
} satisfies Meta

const PROPERTIES_TO_CLASS = 10
const GROUPS_TO_CLASS = 10
const GROUP_PROPERTIES_TO_CLASS = 10
const PROPERTY_TO_CLASSES = 10

const CONTENT = generateContent({
  classes: [
    generateClassObject(`1${CLASS_SUFFIX}`, {
      properties: [
        ...range(1, PROPERTIES_TO_CLASS).map(index => (generateLeafPropertyObject(`1${index}${LEAF_PROPERTY_SUFFIX}`))),
        generatePropertiesGroupObject(`10${PROPERTIES_GROUP_SUFFIX}`, {
          properties: [
            ...range(1, GROUP_PROPERTIES_TO_CLASS).map(index => (generateLeafPropertyObject(`10${index}${LEAF_PROPERTY_SUFFIX}`))),
          ]
        }),
        ...range(1, GROUPS_TO_CLASS).map(index => (generatePropertiesGroupObject(`1${index}${PROPERTIES_GROUP_SUFFIX}`))),
      ]
    }),
    generateClassObject(`2${CLASS_SUFFIX}`, {
      properties: [
        generateLeafPropertyObject(`2${LEAF_PROPERTY_SUFFIX}`)
      ]
    }),
    ...range(1, PROPERTY_TO_CLASSES).map(index => (
      generateClassObject(`3${index}${CLASS_SUFFIX}`))),
  ],
  relations: [
    ...range(1, PROPERTIES_TO_CLASS).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `1${index}${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `2${CLASS_SUFFIX}`
      }))),
    ...range(1, GROUP_PROPERTIES_TO_CLASS).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `10${index}${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `2${CLASS_SUFFIX}`
      }))),
    ...range(1, GROUPS_TO_CLASS).map(index => (
      generateIncludePropertiesGroupRelation({
        propertyGroupKey: `1${index}${PROPERTIES_GROUP_SUFFIX}`,
        includedClassKey: `2${CLASS_SUFFIX}`,
      }))),
    ...range(1, PROPERTY_TO_CLASSES).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `2${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `3${index}${CLASS_SUFFIX}`
      }))),
  ]
})

export const OneToManyConnection = Template.bind({})

OneToManyConnection.args = {
  content: CONTENT
}
