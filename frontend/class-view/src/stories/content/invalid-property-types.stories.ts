import { Meta } from '@storybook/html-vite'
import { Template } from 'stories/common'

export default {
  title: 'Synthetic/Content',
} satisfies Meta

const CONTENT = {
  classes: [
    {
      key: 1,
      name: 2,
      shape: 16,
      properties: [
        {
          key: 3,
          kind: 4,
          name: 5,
          propertyType: 6,
          required: true,
        },
        {
          key: 8,
          kind: 9,
          name: 10,
          properties: [
            {
              key: 11,
              kind: 12,
              name: 13,
              propertyType: 14,
              required: true,
            },
          ],
        },
      ],
    },
  ],
  relations: [
    {
      kind: 15,
      leafPropertyKey: 1,
      referenceClassKey: 3,
      primary: true,
    },
  ],
}

export const InvalidPropertyTypes = Template.bind({})

InvalidPropertyTypes.args = {
  content: CONTENT
}
