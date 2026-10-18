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
import { resolve } from 'path'
import { builtinModules } from 'module'
import { libpgQueryInlineWasmPlugin } from './vite-libpg-query-inline-wasm.plugin'

// Browser-facing, self-contained build of the '/parser' entry. Unlike the default
// (Node) build, it BUNDLES the parser stack (libpg-query / pgsql-deparser) and inlines
// libpg-query.wasm via the inline-wasm plugin, so browser bundlers (Vite/webpack) need
// no WASM plumbing of their own. Emitted to dist/parser.browser.js and selected via the
// package's `browser`/`import` export conditions; Node uses the externalized parser.cjs.
//
// @pgsql/types is type-only; Node built-ins (referenced only by the dead Node branch of
// the Emscripten loader, never reached in a browser) stay external.
const externalPackages = ['@pgsql/types']
const nodeBuiltins = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)]
const isExternal = (id: string): boolean =>
  nodeBuiltins.includes(id) ||
  externalPackages.some((p) => id === p || id.startsWith(`${p}/`))

export default defineConfig({
  build: {
    target: 'es2020',
    outDir: './dist',
    emptyOutDir: false, // keep the default build's output (index.*, parser.cjs, *.d.ts)
    lib: {
      entry: resolve(__dirname, 'src/parser.ts'),
      fileName: () => 'parser.browser.js',
      formats: ['es'],
    },
    rollupOptions: {
      external: isExternal,
    },
    sourcemap: true,
  },
  plugins: [
    libpgQueryInlineWasmPlugin(__dirname),
  ],
})
