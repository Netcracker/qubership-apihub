import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import monacoEditor from 'vite-plugin-monaco-editor'
import path, { resolve } from 'path'
import NodeModulesPolyfill from '@esbuild-plugins/node-modules-polyfill'
import NodeGlobalsPolyfill from '@esbuild-plugins/node-globals-polyfill'
import copy from 'rollup-plugin-copy'
import ignoreDotsOnDevServer from 'vite-plugin-rewrite-all'
import { VitePluginFonts } from 'vite-plugin-fonts'
import { visualizer as bundleVisualizer } from 'rollup-plugin-visualizer'
import inject from '@rollup/plugin-inject'
import monacoWorkerHashPlugin from '../../vite-monaco-worker-hash'
import createVersionJsonFilePlugin from '../../vite-create-version-json'

// const proxyServer = 'https://qubership-apihub-2.localtest.me/'
const proxyServer = 'http://host.docker.internal:8081'
const apiLinterProxyServer = 'http://host.docker.internal:8091'
const devServer = 'http://localhost:3003'

export default defineConfig(({ mode }) => {
  const isProxyMode = mode === 'proxy'
  // Bundle-size analysis is opt-in via `npm run build:analyze` (which passes `--mode analyze`).
  // It is kept out of the default build because generating the report holds the full module graph
  // in memory and renders an HTML treemap, which inflates build memory and time — the portal CI
  // build has hit the Node heap limit during this phase.
  // Note: a custom mode does NOT make this a non-production build. Vite derives `isProduction`
  // from NODE_ENV, and `vite build` defaults NODE_ENV to 'production' regardless of `--mode`.
  const analyzeBundle = mode === 'analyze'

  return {
    plugins: [
      react({ fastRefresh: false }),
      ...(analyzeBundle ? [bundleVisualizer()] : []),
      ignoreDotsOnDevServer(),
      monacoEditor({
        languageWorkers: ['editorWorkerService', 'json'],
        customWorkers: [{
          label: 'yaml',
          entry: 'monaco-yaml/yaml.worker',
        }, {
          label: 'graphql',
          entry: 'monaco-graphql/dist/graphql.worker',
        }],
      }),
      monacoWorkerHashPlugin({ monacoDir: 'dist/monacoeditorwork', htmlPath: 'dist/index.html' }),
      copy({
        targets: [
          {
            src: '../../node_modules/@netcracker/qubership-apihub-apispec-view/dist/index.js',
            dest: 'dist/apispec-view/',
          },
          {
            src: '../../node_modules/@netcracker/qubership-apihub-apispec-view/dist/index.css',
            dest: 'dist/apispec-view/',
          },
          {
            src: '../../node_modules/@netcracker/qubership-apihub-apispec-view/dist/index.js.LICENSE.txt',
            dest: 'dist/apispec-view/',
          },
        ],
        flatten: true,
        hook: 'writeBundle',
      }),
      VitePluginFonts({
        custom: {
          families: [{
            name: 'Inter',
            local: 'Inter',
            src: './public/fonts/*.woff2',
          }],
          display: 'auto',
          preload: true,
          prefetch: false,
          injectTo: 'head-prepend',
        },
      }),
      createVersionJsonFilePlugin(),
    ],
    optimizeDeps: {
      // npm link creates a symlink that points outside node_modules and by default such packages are not optimized.
      // Using "include" here forces listed packages to be optimized.
      // For example, without this setting, esbuildOptions are not being applied to the npm-linked
      // @netcracker/qubership-apihub-api-processor during "npm run proxy", which leads to reference errors
      // like "process is not defined" and "Buffer is not defined".
      include: [
        '@netcracker/qubership-apihub-api-processor',
      ],
      // Keep ddlapi out of esbuild pre-bundling so its self-contained '/parser'
      // (WASM-inlined) stays in the build worker's lazily-loaded chunk rather than
      // being eagerly pre-bundled. Reached only via api-processor/processor.
      exclude: [
        '@netcracker/qubership-apihub-ddlapi',
      ],
      esbuildOptions: {
        plugins: [
          NodeModulesPolyfill(),
          NodeGlobalsPolyfill({
            buffer: true,
            process: true,
          }),
        ],
      },
    },
    resolve: {
      alias: {
        '@apihub/components': path.resolve(__dirname, './src/components/'),
        '@apihub/entities': path.resolve(__dirname, './src/entities/'),
        '@apihub/api-hooks': path.resolve(__dirname, './src/api-hooks/'),
        '@apihub/routes': path.resolve(__dirname, './src/routes/'),
        '@apihub/utils': path.resolve(__dirname, './src/utils/'),
        '@netcracker/qubership-apihub-ui-shared': path.resolve(__dirname, './../shared/src'),
        'buffer': require.resolve('buffer/'),
        '@asyncapi/parser': '@asyncapi/parser/browser', // Use browser-compatible version of AsyncAPI parser
      },
    },
    worker: {
      format: 'es',
    },
    build: {
      emptyOutDir: true,
      // Skip gzip-compressing every chunk just to print its size: costly in memory and time on a large bundle.
      reportCompressedSize: analyzeBundle,
      rollupOptions: {
        input: {
          app: resolve(__dirname, 'index.html'),
        },
        plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
      },
    },
    server: {
      open: '/login',
      proxy: {
        '/playground': {
          target: isProxyMode ? `${proxyServer}/playground` : devServer,
          rewrite: isProxyMode ? path => path.replace(/^\/playground/, '') : undefined,
          changeOrigin: true,
          secure: false,
        },
        // Endpoint prefix related to extension which is equal to "qubership-api-linter" has name defined in following file:
        // https://github.com/Netcracker/qubership-apihub/blob/linter/helm-templates/qubership-apihub/values.yaml#L210
        '/api-linter': {
          target: apiLinterProxyServer,
          rewrite: path => path.replace(/^\/api-linter/, ''),
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: isProxyMode ? `${proxyServer}/api` : devServer,
          rewrite: isProxyMode ? path => path.replace(/^\/api/, '') : undefined,
          changeOrigin: true,
          secure: false,
        },
        '/ws/v1': {
          target: isProxyMode ? `${proxyServer}/ws` : devServer,
          rewrite: isProxyMode ? path => path.replace(/^\/ws/, '') : undefined,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
