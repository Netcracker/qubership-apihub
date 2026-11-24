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
  Template
} from 'stories/common'

export default {
  title: 'Synthetic/Layout',
} satisfies Meta

const CONTENT = generateContent({
  classes: [
    generateClassObject(`11${CLASS_SUFFIX}`, {
      properties: [
        generateLeafPropertyObject(`111${LEAF_PROPERTY_SUFFIX}`),
        generateLeafPropertyObject(`112${LEAF_PROPERTY_SUFFIX}`),
      ]
    }),
    generateClassObject(`21${CLASS_SUFFIX}`, {
      properties: [
        generateLeafPropertyObject(`211${LEAF_PROPERTY_SUFFIX}`),
      ]
    }),
    generateClassObject(`22${CLASS_SUFFIX}`, {
      properties: [
        generateLeafPropertyObject(`221${LEAF_PROPERTY_SUFFIX}`),
      ]
    }),
    generateClassObject(`31${CLASS_SUFFIX}`, {
      properties: [
        generatePropertiesGroupObject(`311${PROPERTIES_GROUP_SUFFIX}`),
      ]
    }),
    generateClassObject(`32${CLASS_SUFFIX}`, {
      properties: [
        generatePropertiesGroupObject(`321${PROPERTIES_GROUP_SUFFIX}`),
      ]
    }),
    generateClassObject(`41${CLASS_SUFFIX}`),
    generateClassObject(`42${CLASS_SUFFIX}`),
  ],
  relations: [
    generatePropertyToClassRelation({
      leafPropertyKey: `111${LEAF_PROPERTY_SUFFIX}`,
      referenceClassKey: `21${CLASS_SUFFIX}`,
      primary: true
    }),
    generatePropertyToClassRelation({
      leafPropertyKey: `211${LEAF_PROPERTY_SUFFIX}`,
      referenceClassKey: `31${CLASS_SUFFIX}`,
    }),
    generateIncludePropertiesGroupRelation({
      propertyGroupKey: `311${PROPERTIES_GROUP_SUFFIX}`,
      includedClassKey: `41${CLASS_SUFFIX}`,
      primary: true
    }),
    generatePropertyToClassRelation({
      leafPropertyKey: `112${LEAF_PROPERTY_SUFFIX}`,
      referenceClassKey: `22${CLASS_SUFFIX}`
    }),
    generatePropertyToClassRelation({
      leafPropertyKey: `221${LEAF_PROPERTY_SUFFIX}`,
      referenceClassKey: `32${CLASS_SUFFIX}`,
    }),
    generateIncludePropertiesGroupRelation({
      propertyGroupKey: `321${PROPERTIES_GROUP_SUFFIX}`,
      includedClassKey: `42${CLASS_SUFFIX}`,
    }),
  ]
})

export const PrimaryLinks = Template.bind({})

PrimaryLinks.args = {
  content: CONTENT
}
