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

const PROPERTIES_TO_CLASS = 10

const CONTENT = generateContent({
  classes: [
    generateClassObject(`1${CLASS_SUFFIX}`, {
      properties: [
        ...range(1, PROPERTIES_TO_CLASS).map(index => (
          generateLeafPropertyObject(`${index}${LEAF_PROPERTY_SUFFIX}`)
        )),
      ]
    })
  ],
  relations: [
    ...range(1, 10).map(index => (
      generatePropertyToClassRelation({
        leafPropertyKey: `${index}${LEAF_PROPERTY_SUFFIX}`,
        referenceClassKey: `1${CLASS_SUFFIX}`
      }))),
  ]
})

export const PropertySelfLoop = Template.bind({})

PropertySelfLoop.args = {
  content: CONTENT
}
