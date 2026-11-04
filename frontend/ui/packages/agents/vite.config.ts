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
import Unfonts from 'unplugin-fonts/vite'
import { visualizer as bundleVisualizer } from 'rollup-plugin-visualizer'
import createVersionJsonFilePlugin from '../../vite-plugins/create-version-json'
import { appStampedVersion } from '../../vite-plugins/app-version'
import removeMswFromDistPlugin from '../../vite-plugins/remove-msw-from-dist'

// The entry point of a running APIHUB: the UI nginx (port 8081 of the Docker Compose stacks, also when the backend
// runs from the IDE) or the ingress of local Kubernetes. Not the backend itself: nginx strips the extension prefixes
// such as /api-linter and forwards them to their services.
// const proxyServer = 'https://qubership-apihub.localtest.me'
const proxyServer = 'http://host.docker.internal:8081'

// The legacy Express mock of `pnpm dev:backend`, the proxy target outside proxy mode (`pnpm dev:frontend`).
// TODO(ui): remove it with the mock once MSW covers its routes; every prefix then goes to proxyServer.
const devServer = 'http://localhost:3003'

// Node globals that some dependencies read in the browser. Rolldown imports the polyfill into each module that uses
// one; `process` and `buffer` resolve to the polyfills through resolve.alias. For example, adm-zip 0.6.0 in the build
// worker reads `process` on load, and without the polyfill publishing fails with "process is not defined".
const injectNodeGlobals = { Buffer: ['buffer', 'Buffer'] as [string, string], process: 'process' }

export default defineConfig(({ mode }) => {
  const isProxyMode = mode === 'proxy'
  const proxyOptions = { target: isProxyMode ? proxyServer : devServer, changeOrigin: true, secure: false }
  // Bundle-size analysis is opt-in via `npm run build:analyze` (which passes `--mode analyze`).
  // It is kept out of the default build because generating the report holds the full module graph
  // in memory and renders an HTML treemap, which inflates build memory and time — the portal CI
  // build has hit the Node heap limit during this phase.
  // Note: a custom mode does NOT make this a non-production build. Vite derives `isProduction`
  // from NODE_ENV, and `vite build` defaults NODE_ENV to 'production' regardless of `--mode`.
  const analyzeBundle = mode === 'analyze'

  return {
    base: !isProxyMode ? '/agents' : '',
    // The version of the app, `<version>+<build id>`: the bundle reads it as `__APP_VERSION__` and version.json carries
    // the same string.
    define: { __APP_VERSION__: JSON.stringify(appStampedVersion('agents')) },
    plugins: [
      react(),
      ...(analyzeBundle ? [bundleVisualizer()] : []),
      monacoEditor({
        languageWorkers: ['editorWorkerService', 'json'],
        customWorkers: [{
          label: 'yaml',
          entry: 'monaco-yaml/yaml.worker',
        }, {
          label: 'graphql',
          entry: 'monaco-graphql/dist/graphql.worker',
        }],
        // The plugin's default distPath is join(root, outDir, base, 'monacoeditorwork'), and
        // this app sets base to '/agents'. So the workers were emitted to
        // dist/agents/monacoeditorwork while index.html asks for
        // /agents/monacoeditorwork/... — one segment too deep, and the Dockerfile serves
        // dist at /agents, so all four workers 404 in the deployed image.
        //
        // ui-portal is unaffected only because its base is '/', which makes the same join a
        // no-op. Dropping base here gives both apps the same layout.
        customDistPath: (root, buildOutDir) => path.join(root, buildOutDir, 'monacoeditorwork'),
      }),
      Unfonts({
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
      removeMswFromDistPlugin(),
    ],
    optimizeDeps: {
      // api-processor is a workspace package linked from outside node_modules, and Vite pre-bundles a linked package
      // only for the specifiers listed here. An entry that is not listed is served as is, rolldownOptions below does
      // not apply to it, and the browser fails with "process is not defined" or "Buffer is not defined". Each entry
      // point is listed on its own: the build worker imports PackageVersionBuilder from /processor.
      include: [
        '@netcracker/qubership-apihub-api-processor',
        '@netcracker/qubership-apihub-api-processor/processor',
      ],
      // `define` maps `global`, which some dependencies read, to `globalThis`.
      rolldownOptions: {
        transform: {
          define: { global: 'globalThis' },
          inject: injectNodeGlobals,
        },
      },
    },
    resolve: {
      // Path aliases come from tsconfig.json. Vite resolves them itself, including in worker bundles.
      tsconfigPaths: true,
      // Only substitutions that no tsconfig declares are listed here. Array form rather than
      // object form because the icons entry below matches on a pattern, which the object form
      // cannot express.
      alias: [
        { find: 'buffer', replacement: require.resolve('buffer/') },
        { find: 'process', replacement: require.resolve('process/browser') },
        // Use browser-compatible version of AsyncAPI parser
        { find: '@asyncapi/parser', replacement: '@asyncapi/parser/browser' },
        {
          /* @mui/icons-material has no "exports" map, so a deep import such as
             '@mui/icons-material/InfoOutlined' resolves to the CommonJS file at the
             package root rather than to esm/. Rolldown then applies Node-style CJS
             interop to it - __toESM(mod, isNodeMode) - which forces `default` to the
             whole exports object instead of honouring the module's own __esModule
             marker. The imported icon therefore arrives as { default: icon }, and
             `styled(InfoOutlinedIcon)` in ui-shared renders that object:

               Minified React error #130 (element type is invalid, got: object)

             Pointing the deep icon imports at esm/ removes the CJS interop from the
             path entirely rather than depending on how a bundler resolves it.
             Anchored so an already-resolved 'esm/...' path is not rewritten again. */
          find: /^@mui\/icons-material\/(?!esm\/)(.+)$/,
          replacement: '@mui/icons-material/esm/$1',
        },
      ],
    },
    worker: {
      format: 'es',
      // Worker bundles do not read build.rolldownOptions.
      rolldownOptions: { transform: { inject: injectNodeGlobals } },
    },
    build: {
      emptyOutDir: true,
      // Gzip-compressing every chunk just to print its size costs build time on a bundle this large,
      // so it is skipped by default. It is genuinely useful when analyzing the bundle, so it is
      // enabled together with the visualizer under `npm run build:analyze`.
      reportCompressedSize: analyzeBundle,
      rolldownOptions: {
        input: {
          app: resolve(__dirname, 'index.html'),
        },
        transform: { inject: injectNodeGlobals },
      },
    },
    server: {
      open: '/login',
      proxy: {
        // Vite matches the keys as path prefixes in order, so '/api' also covers the extensions at '/api-linter' and
        // '/apihub-nc'. A prefix with another target goes before it.
        '/api': proxyOptions,
        '/agents-backend': proxyOptions,
      },
    },
  }
})
