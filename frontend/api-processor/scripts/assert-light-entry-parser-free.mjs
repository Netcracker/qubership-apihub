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
 * Regression guard for the light/heavy split.
 *
 * The package root ('.') must stay parser-free: importing it must never pull in the
 * ddlapi SQL parser (pgsql-parser / libpg-query WASM). That engine lives only behind
 * the '/processor' entry. This script walks the ESM chunk graph reachable from the
 * light entry and fails the build if any reachable chunk references the parser. As a
 * positive control it also asserts the heavy entry DOES reference it, so the check
 * can't silently pass if the bundle layout changes.
 *
 * Run after `vite build` (wired as `postbuild`).
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const distEsm = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/esm')

const LIGHT_ENTRY = 'api-processor.es.js'
const HEAVY_ENTRY = 'api-processor-engine.es.js'

// Markers that indicate the SQL parser graph. The parser-free model root
// ('@netcracker/qubership-apihub-ddlapi' with no subpath) is allowed.
const PARSER_MARKERS = [
  '@netcracker/qubership-apihub-ddlapi/parser',
  'pgsql-parser',
  'libpg-query',
]

const RELATIVE_IMPORT = /(?:from\s*|import\s*\(?)\s*["'](\.\/[^"']+\.m?js)["']/g

/** Collect every chunk file reachable by static/dynamic import from `entry`. */
function reachableChunks(entry) {
  const seen = new Set()
  const stack = [entry]
  while (stack.length) {
    const file = stack.pop()
    if (seen.has(file)) continue
    seen.add(file)
    const full = resolve(distEsm, file)
    if (!existsSync(full)) continue
    const code = readFileSync(full, 'utf8')
    for (const m of code.matchAll(RELATIVE_IMPORT)) {
      stack.push(m[1].replace(/^\.\//, ''))
    }
  }
  return seen
}

function markersIn(file) {
  const full = resolve(distEsm, file)
  if (!existsSync(full)) return []
  const code = readFileSync(full, 'utf8')
  return PARSER_MARKERS.filter((marker) => code.includes(marker))
}

function fail(message) {
  console.error(`\n✗ light-entry parser-free check FAILED:\n  ${message}\n`)
  process.exit(1)
}

if (!existsSync(resolve(distEsm, LIGHT_ENTRY))) {
  fail(`light entry ${LIGHT_ENTRY} not found in dist/esm — run the build first`)
}

// 1) The light entry's reachable graph must be parser-free.
const offenders = []
for (const chunk of reachableChunks(LIGHT_ENTRY)) {
  const found = markersIn(chunk)
  if (found.length) offenders.push(`${chunk} references ${found.join(', ')}`)
}
if (offenders.length) {
  const detail = offenders.join('\n  ')
  fail(`the light root pulls in the SQL parser. Move the offending import to '/processor':\n  ${detail}`)
}

// 2) Positive control: the heavy entry MUST reference the parser, otherwise the split
//    collapsed (or the entry names changed) and check #1 is meaningless.
if (existsSync(resolve(distEsm, HEAVY_ENTRY))) {
  const heavyHasParser = [...reachableChunks(HEAVY_ENTRY)].some((c) => markersIn(c).length > 0)
  if (!heavyHasParser) {
    fail(`heavy entry ${HEAVY_ENTRY} no longer references the parser — split or entry layout changed`)
  }
} else {
  fail(`heavy entry ${HEAVY_ENTRY} not found — split or entry layout changed`)
}

console.log('✓ light root is parser-free; parser is confined to the /processor entry')
