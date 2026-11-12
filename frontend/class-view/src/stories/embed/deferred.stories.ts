import { Meta, StoryFn } from '@storybook/html-vite'
import { ContentObject } from 'main/domain'
import { generateClassObject, storyArgsFunc } from 'stories/common'

export default {
  title: 'Synthetic/Embed',
} satisfies Meta

const CONTENT = {
  classes: [
    generateClassObject('key'),
  ],
} satisfies ContentObject

export const Deferred: StoryFn = storyArgsFunc((_, component) => {
  const div = document.createElement('div')
  div.style.width = '100%'
  div.style.height = '100%'
  div.style.textAlign = 'center'
  div.textContent = 'Wait 10 seconds'
  setTimeout(() => {
    div.textContent = ''
    div.appendChild(component)
  }, 10000)
  return div
}, baseContext => {
  baseContext.component.content = CONTENT
  return baseContext
})
