import { Meta } from '@storybook/html-vite'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateContent,
  generateLeafPropertyObject,
  generatePropertyToClassRelation,
  LEAF_PROPERTY_SUFFIX,
  range,
  Template
} from 'stories/common'

export default {
  title: 'Synthetic/Layout',
} satisfies Meta

const CLASS_HEIR_COUNT = 10

const CONTENT = generateContent({
  classes: [
    generateClassObject(`0${CLASS_SUFFIX}`, {
      properties: [
        generateLeafPropertyObject(`0${LEAF_PROPERTY_SUFFIX}`)
      ]
    }),
    ...range(1, CLASS_HEIR_COUNT).map(index => (
      generateClassObject(`${index}${CLASS_SUFFIX}`))),
  ],
  relations: [
    ...range(1, CLASS_HEIR_COUNT).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `0${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `${index}${CLASS_SUFFIX}`
      })))
  ]
})

export const ManyClassesToOneClass = Template.bind({})

ManyClassesToOneClass.args = {
  content: CONTENT
}
