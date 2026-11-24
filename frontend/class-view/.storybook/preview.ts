import type { Preview } from '@storybook/html-vite'

const preview: Preview = {}

export default preview

export const parameters = {
  layout: 'fullscreen',
  options: {
    storySort: {
      method: 'alphabetical',
      order: [
        ['Real', '*'],
        ['Synthetic', '*']
      ],
    }
  }
}
