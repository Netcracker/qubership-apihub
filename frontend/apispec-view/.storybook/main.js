'use strict'
import { dirname, join } from 'path'

const { ProvidePlugin } = require('webpack')

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')

module.exports = {
  stories: ['../src/**/*.stories.{js,jsx,ts,tsx}'],

  addons: [
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-controls'),
    getAbsolutePath('@storybook/addon-toolbars'),
    getAbsolutePath('@storybook/addon-viewport'),
    {
      name: '@storybook/addon-postcss',
      options: {
        postcssLoaderOptions: { implementation: require('postcss') },
      },
    },
    '@storybook/addon-webpack5-compiler-babel',
    '@chromatic-com/storybook',
  ],

  babel: async () => {
    return {
      presets: [
        '@babel/preset-react',
        '@babel/preset-typescript',
        [
          '@babel/preset-env',
          {
            targets: 'last 2 Chrome versions, last 2 Firefox versions, last 1 Safari version',
            modules: 'commonjs',
          },
        ],
      ],
    }
  },

  webpackFinal: config => {
    config.resolve.plugins = config.resolve.plugins || []
    config.resolve.plugins.push(new TsconfigPathsPlugin())

    config.resolve.fallback = {
      stream: false,
      path: false,
      process: false,
    }

    config.resolve.conditionNames = ['require', 'default']

    config.module.rules.push({
      test: /\.m?js/,
      resolve: {
        fullySpecified: false,
      },
    })

    config.module.rules.push({
      test: /\.ya?ml$/,
      use: 'yaml-loader',
    })

    config.plugins.push(
      new ProvidePlugin({
        process: require.resolve('process/browser'),
      }),
    )

    return config
  },

  staticDirs: [{ from: '../src/web-components/__stories__/assets', to: '/assets' }],

  framework: {
    name: getAbsolutePath('@storybook/react-webpack5'),
    options: {},
  },

  docs: {},

  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
}

function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, 'package.json')))
}
