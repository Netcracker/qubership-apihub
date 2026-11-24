import { Meta } from '@storybook/html-vite'
import { generateContent, Template } from 'stories/common'

export default {
  title: 'Synthetic/Content',
} satisfies Meta

const CONTENT = generateContent({})

export const EmptyContent = Template.bind({})

EmptyContent.args = {
  content: CONTENT
}
