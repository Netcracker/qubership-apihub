import * as path from 'path'
import { stampedVersionPlugin } from '@netcracker/qubership-apihub-build-id/vite-plugin'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    // The sources import `version` from package.json; the ES build reports the stamped one, as the CommonJS build
    // does (scripts/stamp-cjs-version.mjs).
    stampedVersionPlugin(__dirname),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    sourcemap: true,
    outDir: './dist/esm',
    minify: false,
    emptyOutDir: true,
    lib: {
      // Two entries: the light root (parser-free) and the heavy '/processor'
      // (the spec-processing engine, which pulls the ddlapi parser). Shared light
      // code is hoisted into a common chunk; the parser/WASM graph stays only in
      // the processor entry's chunks.
      entry: {
        'api-processor': path.resolve(__dirname, 'src/index.ts'),
        'api-processor-engine': path.resolve(__dirname, 'src/processor.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.es.js`,
    },
    rollupOptions: {
      // Keep ddlapi external so the consuming bundler/runtime resolves it and its
      // (self-contained) '/parser' entry — the browser gets ddlapi's WASM-inlined
      // parser build, Node reads it from node_modules. The parser stack (libpg-query
      // etc.) is bundled inside ddlapi/parser, so we never reference it directly here.
      external: [
        '@asyncapi/parser',
        /^@netcracker\/qubership-apihub-ddlapi(\/.*)?$/,
      ],
    },
  },
  resolve: {
    alias: {
      // Use browser-compatible version of AsyncAPI parser
      '@asyncapi/parser': '@asyncapi/parser/browser',
    },
  },
})
