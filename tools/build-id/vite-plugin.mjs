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

import path from 'path'
import { stampedVersion } from './build-id.mjs'

// A virtual module id starts with the NUL character by Vite's convention, so no other plugin touches it.
const VIRTUAL_PREFIX = '\u0000stamped-version:'

/**
 * Replaces the import of the package's own `package.json` with a module that exports the stamped version,
 * `<version>+<build id>`, so a Vite build reports the same string as the one that tsc output carries (the CommonJS
 * build of a library has no `define`, so it is stamped separately). It is a virtual module because Vite's JSON
 * plugin would try to parse JavaScript returned for a .json id.
 *
 * Only `version` is exported. Use it where one build of a library needs the stamp; an app gets its version through
 * `define` instead and never imports its own manifest.
 *
 * @param {string} packageDir The directory of the package whose package.json is replaced.
 * @param {import('./build-id.d.mts').BuildIdOptions} [options]
 * @returns {import('vite').Plugin}
 */
export function stampedVersionPlugin(packageDir, options = {}) {
  const manifest = path.resolve(packageDir, 'package.json')
  // The id must not end in `.json`: Vite's JSON plugin claims every such id, virtual or not.
  const moduleId = `${VIRTUAL_PREFIX}${path.resolve(packageDir)}:version`
  let version

  return {
    name: 'stamped-version',
    enforce: 'pre',
    resolveId(source, importer) {
      if (importer && source.endsWith('package.json') && path.resolve(path.dirname(importer), source) === manifest) {
        return moduleId
      }
      return undefined
    },
    load(id) {
      if (id !== moduleId) {
        return undefined
      }
      // Once per build: the hash walks a few thousand files.
      version ??= stampedVersion(packageDir, options)
      return `export const version = ${JSON.stringify(version)}`
    },
  }
}
