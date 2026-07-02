import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'
import { builtinModules } from 'module'
import pkg from './package.json'

// Default build: the model (`index`) and the Node-facing parser (`parser`). The parser
// stack (libpg-query / pgsql-deparser) is EXTERNALIZED here, so under Node the require
// entry resolves them from node_modules and libpg-query reads libpg-query.wasm from disk
// via fs — the proven Node-safe path. The browser-facing, self-contained `parser.browser`
// build (vite.browser.config.ts) bundles + inlines the WASM instead, and is selected via
// the package's `browser` export condition. The model entry imports none of the parser
// stack, so it stays parser-free either way.
const externalPackages = [...Object.keys(pkg.dependencies ?? {})]
const nodeBuiltins = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)]
const isExternal = (id: string): boolean =>
  nodeBuiltins.includes(id) ||
  externalPackages.some((p) => id === p || id.startsWith(`${p}/`))

export default defineConfig({
  build: {
    target: 'node24',
    lib: {
      // Two public entries: the parser-free model (`index`) and the WASM-bearing
      // SQL parser (`parser`). Rollup hoists the shared model code into a common
      // chunk imported by both, so model-only consumers of `index` never pull in
      // anything reachable solely from `parser` (pgsql-parser / libpg-query WASM).
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        parser: resolve(__dirname, 'src/parser.ts'),
      },
      fileName: (format, entryName) => format === 'es' ? `${entryName}.js` : `${entryName}.cjs`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: isExternal,
      output: {
        // Emit `require`-based dynamic imports in the CJS bundle instead of a
        // native `import()`. pgParser.ts lazily `import('pgsql-parser')`; a real
        // `import()` works in production Node but throws under a CommonJS VM
        // (e.g. Jest without --experimental-vm-modules). pgsql-parser ships a CJS
        // entry, so require-based interop is safe and keeps CJS consumers working.
        dynamicImportInCjs: false,
      },
    },
    sourcemap: true,
  },
  plugins: [
    dts({
      include: ['src/**/*'],
      insertTypesEntry: true,
    }),
  ],
})
