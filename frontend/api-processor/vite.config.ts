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

import * as path from 'path'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { stampedVersion } from './scripts/build-id.mjs'

const PACKAGE_JSON = path.resolve(__dirname, 'package.json')
const STAMPED_VERSION_MODULE = '\0api-processor-stamped-package'

// The sources import `version` from package.json. The build replaces that module with the version stamped by
// scripts/build-id.mjs, so the ES build reports the same string as the CommonJS one (scripts/stamp-cjs-version.mjs).
// A virtual module, because Vite's JSON plugin would try to parse JavaScript returned for a .json id.
const stampedVersionPlugin: Plugin = {
  name: 'stamped-version',
  enforce: 'pre',
  resolveId(source, importer) {
    if (importer && source.endsWith('package.json') && path.resolve(path.dirname(importer), source) === PACKAGE_JSON) {
      return STAMPED_VERSION_MODULE
    }
    return undefined
  },
  load(id) {
    return id === STAMPED_VERSION_MODULE ? `export const version = ${JSON.stringify(stampedVersion())}` : undefined
  },
}

export default defineConfig({
  plugins: [
    stampedVersionPlugin,
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
