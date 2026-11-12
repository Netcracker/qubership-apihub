import { Meta } from '@storybook/html-vite'
import { CLASS_SUFFIX, generateClassObject, generateContent, Template } from 'stories/common'

export default {
  title: 'Synthetic/Content',
} satisfies Meta

const CONTENT = generateContent({
  classes: [
    generateClassObject(`1${CLASS_SUFFIX}`)
  ]
})

export const EmptyClass = Template.bind({})

EmptyClass.args = {
  content: CONTENT
}
