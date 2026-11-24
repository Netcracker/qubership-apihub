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

const CONTENT = generateContent({
  classes: [
    ...range(1, 3).map(index => (
      generateClassObject(index + CLASS_SUFFIX, {
        properties: [
          generateLeafPropertyObject(index + LEAF_PROPERTY_SUFFIX)
        ]
      }))),
  ],
  relations: [
    generatePropertyToClassRelation({
      leafPropertyKey: `1${LEAF_PROPERTY_SUFFIX}`,
      referenceClassKey: `2${CLASS_SUFFIX}`
    }),
    generatePropertyToClassRelation({
      leafPropertyKey: `2${LEAF_PROPERTY_SUFFIX}`,
      referenceClassKey: `3${CLASS_SUFFIX}`
    }),
    generatePropertyToClassRelation({
      leafPropertyKey: `3${LEAF_PROPERTY_SUFFIX}`,
      referenceClassKey: `1${CLASS_SUFFIX}`
    })
  ]
})

export const BackLoop = Template.bind({})

BackLoop.args = {
  content: CONTENT
}
