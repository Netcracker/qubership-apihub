import path from 'node:path'
import type { Plugin } from 'vite'
import type { BuildIdOptions } from './build-id.mts'
import { stampedVersion } from './build-id.mts'

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
 * @param packageDir The directory of the package whose package.json is replaced.
 */
export function stampedVersionPlugin(packageDir: string, options: BuildIdOptions = {}): Plugin {
  const manifest = path.resolve(packageDir, 'package.json')
  // The id must not end in `.json`: Vite's JSON plugin claims every such id, virtual or not.
  const moduleId = `${VIRTUAL_PREFIX}${path.resolve(packageDir)}:version`
  let version: string | undefined

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
