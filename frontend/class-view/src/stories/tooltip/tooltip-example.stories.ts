import { Meta, StoryFn } from '@storybook/html-vite'
import {
  CLASS_SUFFIX,
  generateClassObject,
  generateContent,
  generateLeafPropertyObject,
  generatePropertiesGroupObject,
  LEAF_PROPERTY_SUFFIX,
  PROPERTIES_GROUP_SUFFIX,
  storyArgsFunc
} from 'stories/common'

export default {
  title: 'Synthetic/Tooltip',
} satisfies Meta

const CONTENT = generateContent({
  classes: [
    generateClassObject('1' + CLASS_SUFFIX),
    generateClassObject('2' + CLASS_SUFFIX, {
      name: 'class naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaame',
      properties: [
        generateLeafPropertyObject('21' + LEAF_PROPERTY_SUFFIX, {
          name: 'property name',
          propertyType: 'array',
          required: true,
        }),
        generateLeafPropertyObject('22' + LEAF_PROPERTY_SUFFIX, {
          name: 'property naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaame',
          propertyType: 'array',
          required: true,
        }),
        generateLeafPropertyObject('23' + LEAF_PROPERTY_SUFFIX, {
          name: 'property',
          propertyType: 'numbereeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeer',
          required: true,
        }),
        generateLeafPropertyObject('24' + LEAF_PROPERTY_SUFFIX, {
          name: 'property naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaame',
          propertyType: 'numbereeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeer',
          required: true,
        }),
        generatePropertiesGroupObject('21' + PROPERTIES_GROUP_SUFFIX, {
          name: 'group name',
        }),
        generatePropertiesGroupObject('22' + PROPERTIES_GROUP_SUFFIX, {
          name: 'group naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaame',
          properties: [
            generateLeafPropertyObject('221' + LEAF_PROPERTY_SUFFIX, {
              name: 'property name',
              propertyType: 'array',
              required: true,
            }),
            generateLeafPropertyObject('222' + LEAF_PROPERTY_SUFFIX, {
              name: 'property naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaame',
              propertyType: 'array',
              required: true,
            }),
            generateLeafPropertyObject('223' + LEAF_PROPERTY_SUFFIX, {
              name: 'property',
              propertyType: 'numbereeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeer',
              required: true,
            }),
            generateLeafPropertyObject('224' + LEAF_PROPERTY_SUFFIX, {
              name: 'property naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaame',
              propertyType: 'numbereeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeer',
              required: true,
            }),
          ]
        })
      ]
    }),
  ]
})

export const TooltipExample: StoryFn = storyArgsFunc(() => {

}, baseContext => {
  baseContext.component.content = CONTENT
  return baseContext
})
