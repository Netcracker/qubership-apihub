import type { StorybookConfig } from '@storybook/html-vite'

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  staticDirs: [{ from: '../src/stories/assets', to: '/assets' }],
  core: {
    disableTelemetry: true,
  },
}
export default config
