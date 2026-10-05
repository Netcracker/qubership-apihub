import { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  addons: [
    '@storybook/addon-links',
    '@storybook/addon-docs'
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  core: {
    disableTelemetry: true,
  },

  typescript: {
    reactDocgen: 'react-docgen-typescript'
  }
}
export default config
