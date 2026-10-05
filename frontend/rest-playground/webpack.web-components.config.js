const path = require('path')
const webpack = require('webpack')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')

// Where monaco-editor actually is, rather than where a flat npm install would put it.
// path.resolve(__dirname, 'node_modules/monaco-editor') is only correct while nothing
// dedupes the package to a parent - it breaks under pnpm's isolated linker and under
// any workspace that hoists. Anchored on package.json because monaco-editor declares
// no "main", only "module": require.resolve('monaco-editor') throws MODULE_NOT_FOUND.
const monacoEditorDir = path.dirname(require.resolve('monaco-editor/package.json'))

module.exports = {
  mode: 'production',
  entry: './src/web-components/index.ts',
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    plugins: [new TsconfigPathsPlugin()],
    fallback: {
      stream: false,
      process: require.resolve('process/browser'),
      querystring: require.resolve('querystring-es3'),
      path: require.resolve('path-browserify'),
      fs: require.resolve('browserify-fs'),
    },
  },
  devtool: 'source-map',
  performance: {
    maxEntrypointSize: 2000000,
    maxAssetSize: 2000000,
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto',
    library: {
      name: 'qubership-apihub-rest-playground',
      type: 'umd',
    },
  },
  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          transpileOnly: true,
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        include: [
          monacoEditorDir,
        ],
      },
      {
        test: /\.(ttf|woff|woff2|eot|otf)$/i,
        type: 'asset/inline',
        include: [
          monacoEditorDir,
        ],
      },
    ],
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
    new webpack.ProvidePlugin({
      process: require.resolve('process/browser'),
    }),
    new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] }),
  ],
}
