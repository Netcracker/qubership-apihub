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

import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { Plugin } from 'vite'

// Virtual ids for the rewritten libpg-query Emscripten loader and factory.
const VIRTUAL_WASM_INDEX = '\0libpg-query/wasm/index.js'
const VIRTUAL_EMSCRIPTEN_FACTORY = '\0libpg-query/emscripten-factory'
const EMSCRIPTEN_FACTORY_SPECIFIER = 'virtual:libpg-query-emscripten-factory'

/**
 * Makes ddlapi's `/parser` build self-contained so consumers need no WASM plumbing.
 *
 * libpg-query's Emscripten loader (`wasm/index.js`) does two things that fight a
 * bundler: it imports the Emscripten factory (`libpg-query.js`, a UMD/CJS blob with
 * no ESM default export), and it eagerly calls `PgQueryModule()` with no WASM source,
 * relying on a runtime `locateFile`/fetch/fs lookup of `libpg-query.wasm`.
 *
 * This plugin (applied during ddlapi's own build, where libpg-query is bundled rather
 * than externalized):
 *   1. rewrites the factory import to a virtual module that re-exports the default;
 *   2. inlines `libpg-query.wasm` as base64 and hands the bytes to Emscripten via
 *      `wasmBinary`, so it never touches locateFile/fetch/fs.
 *
 * Result: `@netcracker/qubership-apihub-ddlapi/parser` runs in Node, the browser and
 * Web Workers under any bundler with zero consumer-side configuration.
 */
export function libpgQueryInlineWasmPlugin(packageRoot: string): Plugin {
  const wasmDir = resolve(packageRoot, 'node_modules/libpg-query/wasm')
  const wasmIndexPath = resolve(wasmDir, 'index.js')
  const wasmJsPath = resolve(wasmDir, 'libpg-query.js')
  const wasmBinaryPath = resolve(wasmDir, 'libpg-query.wasm')

  const wasmBase64 = readFileSync(wasmBinaryPath).toString('base64')

  return {
    name: 'libpg-query-inline-wasm',
    enforce: 'pre',
    resolveId(source) {
      if (source === 'libpg-query' || source === 'libpg-query/wasm/index.js') {
        return VIRTUAL_WASM_INDEX
      }
      if (source === EMSCRIPTEN_FACTORY_SPECIFIER) {
        return VIRTUAL_EMSCRIPTEN_FACTORY
      }
      return null
    },
    load(id) {
      if (id === VIRTUAL_WASM_INDEX) {
        const source = readFileSync(wasmIndexPath, 'utf8')
        const patched = source
          .replace(
            "import PgQueryModule from './libpg-query.js';",
            `import PgQueryModule from ${JSON.stringify(EMSCRIPTEN_FACTORY_SPECIFIER)};`,
          )
          .replace(
            'PgQueryModule()',
            'PgQueryModule({ wasmBinary: __ddlapiLibpgWasmBinary })',
          )
        // `atob` is available in browsers, Web Workers and Node >= 16, so the decode
        // is runtime-agnostic. Buffer-from-base64 is intentionally avoided.
        const prelude =
          `const __ddlapiLibpgWasmBinary = Uint8Array.from(atob(${JSON.stringify(wasmBase64)}), (c) => c.charCodeAt(0))\n`
        return prelude + patched
      }
      if (id === VIRTUAL_EMSCRIPTEN_FACTORY) {
        const source = readFileSync(wasmJsPath, 'utf8')
        return `${source}\nexport default PgQueryModule;\n`
      }
      return null
    },
  }
}
