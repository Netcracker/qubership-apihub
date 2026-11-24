import { Meta } from '@storybook/html-vite'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateContent,
  generateLeafPropertyObject,
  generatePropertiesGroupObject,
  LEAF_PROPERTY_SUFFIX,
  PROPERTIES_GROUP_SUFFIX,
  Template
} from 'stories/common'
import { ClassObject, DefaultDomainMeta, LeafPropertyObject, PropertiesGroupObject, PropertyObject } from 'main/domain'

export default {
  title: 'Synthetic/Content',
} satisfies Meta

const GROUP_PROPERTY: LeafPropertyObject = generateLeafPropertyObject(`1${LEAF_PROPERTY_SUFFIX}`)

const CLASS_PROPERTY: LeafPropertyObject = generateLeafPropertyObject(`2${LEAF_PROPERTY_SUFFIX}`)

const GROUP: PropertiesGroupObject<LeafPropertyObject> = generatePropertiesGroupObject(`1${PROPERTIES_GROUP_SUFFIX}`, {
  properties: [
    GROUP_PROPERTY,
    GROUP_PROPERTY,
  ]
})

const CLASS: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject(`1${CLASS_SUFFIX}`, {
  properties: [
    GROUP,
    GROUP,
    CLASS_PROPERTY,
    CLASS_PROPERTY,
  ]
})

const CONTENT = generateContent({
  classes: [
    CLASS,
    CLASS
  ]
})

export const DuplicateInstance = Template.bind({})

DuplicateInstance.args = {
  content: CONTENT
}
