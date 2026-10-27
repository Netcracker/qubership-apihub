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
 * Regression guard for the stamped version.
 *
 * Fails the build if either output reports the plain package.json version: the CommonJS manifest must carry the
 * `+<build id>` suffix, and the ES chunks must contain the same stamped string. Run after `vite build` (wired as
 * `postbuild`).
 */

import { readdirSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { stampedVersion } from '@netcracker/qubership-apihub-build-id'

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(packageDir, 'dist')
const expected = stampedVersion(packageDir)
const failures = []

const cjsVersion = JSON.parse(readFileSync(path.join(dist, 'cjs/package.json'), 'utf-8')).version
if (cjsVersion !== expected) {
  failures.push(`dist/cjs/package.json has version ${cjsVersion}, expected ${expected}`)
}

const esmChunks = readdirSync(path.join(dist, 'esm')).filter(name => /\.(es\.js|mjs)$/.test(name))
const stamped = esmChunks.filter(name => readFileSync(path.join(dist, 'esm', name), 'utf-8').includes(JSON.stringify(expected)))
if (stamped.length === 0) {
  failures.push(`no ES chunk in dist/esm contains the version ${expected}`)
}

if (failures.length > 0) {
  console.error(`assert-version-stamped: ${failures.join('; ')}`)
  process.exit(1)
}
console.log(`assert-version-stamped: ${expected} in dist/cjs and ${stamped.length} ES chunk(s)`)
