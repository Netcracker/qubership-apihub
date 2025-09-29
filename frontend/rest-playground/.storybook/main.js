import { ProvidePlugin } from 'webpack'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'

const config = {
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },

  core: {
    disableTelemetry: true,
  },

  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },

  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],

  addons: [
    '@storybook/addon-docs',
    {
      name: '@storybook/addon-postcss',
      options: {
        postcssLoaderOptions: { implementation: require('postcss') },
      },
    },
  ],

  webpackFinal: (config) => {
    // Add TypeScript path resolution
    config.resolve.plugins = config.resolve.plugins || []
    config.resolve.plugins.push(new TsconfigPathsPlugin())

    // Add necessary fallbacks for Node.js modules in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      stream: false,
      path: false,
      process: false,
      tty: false,
      querystring: require.resolve('querystring-es3'),
    }

    // Provide global polyfills
    config.plugins.push(
      new ProvidePlugin({
        process: require.resolve('process/browser'),
      }),
    )

    // Override existing rules to ensure proper TypeScript and JSX handling
    config.module.rules = config.module.rules.filter(
      rule => !(rule.test && rule.test.toString().includes('tsx?')),
    )

    // Add comprehensive TypeScript and JavaScript handling
    config.module.rules.unshift(
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: 'last 2 Chrome versions, last 2 Firefox versions, last 1 Safari version',
                  modules: false,
                }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                ['@babel/preset-typescript', { allowNamespaces: true }],
              ],
            },
          },
        ],
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: 'last 2 Chrome versions, last 2 Firefox versions, last 1 Safari version',
                  modules: false,
                }],
                ['@babel/preset-react', { runtime: 'automatic' }],
              ],
            },
          },
        ],
      },
    )

    // Handle YAML files
    config.module.rules.push({
      test: /\.ya?ml$/,
      type: 'asset/source',
    })

    // Handle ES modules
    config.module.rules.push({
      test: /\.m?js/,
      resolve: {
        fullySpecified: false,
      },
    })

    return config
  },
}

export default config
