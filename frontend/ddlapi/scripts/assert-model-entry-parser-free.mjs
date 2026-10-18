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

/**
 * Regression guard for the model/parser split.
 *
 * The package root ('.') is the ddlapi data model and must stay parser-free:
 * importing it must never pull in pgsql-parser / pgsql-deparser / libpg-query
 * (the SQL parser + WASM). That stack lives only behind the './parser' entry.
 * Every model-only consumer in the stack (api-unifier, api-diff, api-doc-viewer,
 * api-processor's light root, the UI main thread) relies on this, so a leak here
 * is the highest-impact regression possible.
 *
 * This script checks both the ESM (index.js, walking any reachable chunks) and CJS
 * (index.cjs) model entries, and asserts the parser entry DOES reference the parser
 * as a positive control. Run after `vite build` (wired as `postbuild`).
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')

const MODEL_ESM = 'index.js'
const MODEL_CJS = 'index.cjs'
const PARSER_ESM = 'parser.js'

const PARSER_MARKERS = ['pgsql-parser', 'pgsql-deparser', 'libpg-query']

const RELATIVE_IMPORT = /(?:from\s*|import\s*\(?)\s*["'](\.\/[^"']+\.m?js)["']/g

/** Collect every chunk reachable by static/dynamic import from an ESM entry. */
function reachableChunks(entry) {
  const seen = new Set()
  const stack = [entry]
  while (stack.length) {
    const file = stack.pop()
    if (seen.has(file)) continue
    seen.add(file)
    const full = resolve(dist, file)
    if (!existsSync(full)) continue
    for (const m of readFileSync(full, 'utf8').matchAll(RELATIVE_IMPORT)) {
      stack.push(m[1].replace(/^\.\//, ''))
    }
  }
  return seen
}

function markersIn(file) {
  const full = resolve(dist, file)
  if (!existsSync(full)) return []
  const code = readFileSync(full, 'utf8')
  return PARSER_MARKERS.filter((marker) => code.includes(marker))
}

function fail(message) {
  console.error(`\n✗ model-entry parser-free check FAILED:\n  ${message}\n`)
  process.exit(1)
}

if (!existsSync(resolve(dist, MODEL_ESM))) {
  fail(`model entry ${MODEL_ESM} not found in dist — run the build first`)
}

// 1) The model ESM entry's reachable graph must be parser-free.
const offenders = []
for (const chunk of reachableChunks(MODEL_ESM)) {
  const found = markersIn(chunk)
  if (found.length) offenders.push(`${chunk} references ${found.join(', ')}`)
}

// 2) The model CJS entry (self-contained) must be parser-free too.
const cjsFound = markersIn(MODEL_CJS)
if (cjsFound.length) offenders.push(`${MODEL_CJS} references ${cjsFound.join(', ')}`)

if (offenders.length) {
  const detail = offenders.join('\n  ')
  fail(`the model root pulls in the SQL parser. Move the offending import to ./parser:\n  ${detail}`)
}

// 3) Positive control: the parser entry MUST reference the parser, otherwise the
//    split collapsed (or the layout changed) and the checks above are meaningless.
if (!markersIn(PARSER_ESM).length) {
  fail(`parser entry ${PARSER_ESM} no longer references the parser — split or layout changed`)
}

console.log('✓ model root is parser-free; parser is confined to the ./parser entry')
