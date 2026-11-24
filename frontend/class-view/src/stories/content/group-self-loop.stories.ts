import { Meta } from '@storybook/html-vite'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateContent,
  generateIncludePropertiesGroupRelation,
  generatePropertiesGroupObject,
  PROPERTIES_GROUP_SUFFIX,
  range,
  Template
} from 'stories/common'

export default {
  title: 'Synthetic/Content',
} satisfies Meta

const GROUP_TO_CLASS = 10

const CONTENT = generateContent({
  classes: [
    generateClassObject(`1${CLASS_SUFFIX}`, {
      properties: [
        ...range(1, GROUP_TO_CLASS).map(index => (
          generatePropertiesGroupObject(`1${index}${PROPERTIES_GROUP_SUFFIX}`)
        )),
      ]
    })
  ],
  relations: [
    ...range(1, GROUP_TO_CLASS).map(index => (
      generateIncludePropertiesGroupRelation({
        propertyGroupKey: `1${index}${PROPERTIES_GROUP_SUFFIX}`,
        includedClassKey: `1${CLASS_SUFFIX}`
      }))),
  ]
})

export const GroupSelfLoop = Template.bind({})

GroupSelfLoop.args = {
  content: CONTENT
}
