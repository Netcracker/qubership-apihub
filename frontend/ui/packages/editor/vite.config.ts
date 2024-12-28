/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

const proxyServer = ''
const devServer = 'http://localhost:3004'
const userView = ''

export default defineConfig(({ mode }) => {
  const isProxyMode = mode === 'proxy'

  return {
    base: !isProxyMode ? '/editor' : '',
    plugins: [
      react({ fastRefresh: false }),
      bundleVisualizer(),
      ignoreDotsOnDevServer(),
      monacoEditor({
        customDistPath: (root, buildOutDir) => {
          return `${root}/${buildOutDir}/monacoeditorwork`
        },
        languageWorkers: ['editorWorkerService', 'json'],
        customWorkers: [{
          label: 'yaml',
          entry: 'monaco-yaml/yaml.worker',
        }, {
          label: 'graphql',
          entry: 'monaco-graphql/dist/graphql.worker',
        }],
      }),
      copy({
        targets: [
          {
            src: '../../node_modules/@netcracker/qubership-apihub-apispec-view/dist/index.js',
            dest: 'dist/apispec-view',
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
    ],
    optimizeDeps: {
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
        '@apihub/hooks': path.resolve(__dirname, './src/hooks/'),
        '@apihub/services': path.resolve(__dirname, './src/services/'),
        '@apihub/utils': path.resolve(__dirname, './src/utils/'),
        '@netcracker/qubership-apihub-ui-shared': path.resolve(__dirname, './../shared/src'),
      },
    },
    worker: {
      format: 'es',
    },
    build: {
      emptyOutDir: true,
      rollupOptions: {
        input: {
          app: resolve(__dirname, 'index.html'),
        },
      },
    },
    server: {
      port: 8000,
      open: `/login?userView=${userView}`,
      proxy: {
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
