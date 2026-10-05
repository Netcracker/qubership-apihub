import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import react from '@vitejs/plugin-react'
import monacoEditor from 'vite-plugin-monaco-editor'
import path, { resolve } from 'path'
import copy from 'rollup-plugin-copy'
import Unfonts from 'unplugin-fonts/vite'
import { visualizer as bundleVisualizer } from 'rollup-plugin-visualizer'
import inject from '@rollup/plugin-inject'
import monacoWorkerHashPlugin from '../../vite-monaco-worker-hash'
import createVersionJsonFilePlugin from '../../vite-create-version-json'
import { createRequire } from 'module'

// The three apispec-view assets copied below were addressed by the literal path
// ../../node_modules/@netcracker/qubership-apihub-apispec-view/dist/... , which is
// correct only while node_modules sits two levels up from this package. Resolve the
// package entry point and take the directory beside it instead.
//
// Via the entry point rather than <pkg>/package.json: apispec-view publishes an
// "exports" map listing only "." and "./styles.min.css", so both package.json and the
// deep dist/ subpaths are unreachable by specifier. The entry resolves, and the files
// sit next to it.
const requireFromHere = createRequire(import.meta.url)
// rollup-plugin-copy passes `src` to globby, and globby treats a backslash as an escape
// character - so an absolute Windows path matches nothing, the build still exits 0, and
// the three assets are silently absent from dist. Measured: 431 files instead of 434.
// Posix separators throughout.
const apispecViewDist = path.dirname(requireFromHere.resolve('@netcracker/qubership-apihub-apispec-view'))
  .split(path.sep)
  .join('/')

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
      tsconfigPaths(),
      react({ fastRefresh: false }),
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
      }),
      monacoWorkerHashPlugin({ monacoDir: 'dist/monacoeditorwork', htmlPath: 'dist/index.html' }),
      copy({
        targets: [
          {
            src: `${apispecViewDist}/index.js`,
            dest: 'dist/apispec-view/',
          },
          {
            src: `${apispecViewDist}/index.css`,
            dest: 'dist/apispec-view/',
          },
          {
            src: `${apispecViewDist}/index.js.LICENSE.txt`,
            dest: 'dist/apispec-view/',
          },
        ],
        flatten: true,
        hook: 'writeBundle',
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
    ],
    optimizeDeps: {
      // npm link creates a symlink that points outside node_modules and by default such packages are not optimized.
      // Using "include" here forces listed packages to be optimized.
      // For example, without this setting, rolldownOptions are not being applied to the npm-linked
      // @netcracker/qubership-apihub-api-processor during "npm run proxy", which leads to reference errors
      // like "process is not defined" and "Buffer is not defined".
      include: [
        '@netcracker/qubership-apihub-api-processor',
      ],
      // Vite 8 pre-bundles with Rolldown, not esbuild. It runs esbuild plugins only through a shim
      // whose `initialOptions` throws "Not implemented" on any property but `platform` and `plugins`,
      // so the former @esbuild-plugins polyfills made the dependency scan fail and Vite skipped
      // pre-bundling altogether. Rolldown's own transform options do the same job: `inject` mirrors
      // the production build's inject() below, and `define` keeps the `global` alias the esbuild
      // polyfill used to add. `process` and `buffer` resolve through resolve.alias.
      rolldownOptions: {
        transform: {
          define: { global: 'globalThis' },
          inject: { Buffer: ['buffer', 'Buffer'], process: 'process' },
        },
      },
    },
    resolve: {
      // Path aliases come from tsconfig.json via tsconfigPaths(); only substitutions
      // that no tsconfig declares are listed here. Array form rather than object form
      // because the icons entry below matches on a pattern, which the object form
      // cannot express.
      alias: [
        { find: 'process', replacement: require.resolve('process/browser') },
        { find: 'buffer', replacement: require.resolve('buffer/') },
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

             Pointing the 133 deep icon imports at esm/ removes the CJS interop from
             the path entirely rather than depending on how a bundler resolves it.
             Anchored so an already-resolved 'esm/...' path is not rewritten again. */
          find: /^@mui\/icons-material\/(?!esm\/)(.+)$/,
          replacement: '@mui/icons-material/esm/$1',
        },
      ],
    },
    worker: {
      format: 'es',
      // Worker bundles are a separate rollup pass with their own plugin list.
      // resolve.alias is config-level and applies to them automatically; a resolver
      // plugin is not, so it must be registered here too or aliased imports fail to
      // resolve inside workers only - and nowhere else. Array form, not the function form:
      // vite 4 expects an array here; the callback signature arrived in vite 5.1.
      plugins: [tsconfigPaths()],
    },
    build: {
      emptyOutDir: true,
      // Skip gzip-compressing every chunk just to print its size: costly in memory and time on a large bundle.
      reportCompressedSize: analyzeBundle,
      rollupOptions: {
        input: {
          app: resolve(__dirname, 'index.html'),
        },
        // `optimizeDeps.rolldownOptions` above only covers the dev server's dependency pre-bundling,
        // so the Node globals that browser-unaware dependencies expect have to be injected again
        // for the production build.
        //
        // `process` is needed because adm-zip 0.6.0 reads `process?.versions?.node` at module scope
        // (methods/inflater.js), and `methods/index.js` requires that file unconditionally. Optional
        // chaining does not guard an undeclared binding, so merely importing adm-zip throws
        // `ReferenceError: process is not defined`. It reaches the bundle through api-processor and
        // lands in the lazily-loaded build-worker chunk, which is why only publishing broke.
        plugins: [inject({ Buffer: ['buffer', 'Buffer'], process: 'process', exclude: ['**/*.cjs'] })],
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
