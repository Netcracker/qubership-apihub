import path from 'path'
import type { Plugin } from 'vite'
import { stampedVersion } from '../../api-processor/scripts/build-id.mjs'

const UI_ROOT = path.resolve(__dirname, '..')

const cache = new Map<string, string>()

/**
 * The version an application reports: `<version from its package.json>+<build id>`.
 *
 * The id hashes the sources of the app and of the workspace packages it bundles (see api-processor's
 * scripts/build-id.mjs), so two builds of the same sources agree and a build of other sources differs even when
 * nobody bumped the version. It is computed once per process: the dev server and a build must hand the bundle and
 * `version.json` the same string, and the hash walks a few thousand files.
 */
export function appStampedVersion(app: string): string {
  let version = cache.get(app)
  if (!version) {
    version = stampedVersion(path.resolve(UI_ROOT, 'packages', app), { includeDevDependencies: true })
    cache.set(app, version)
  }
  return version
}

const STAMPED_VERSION_MODULE = '\0stamped-app-package'

/**
 * Gives the bundle the stamped version where it imports its own package.json (`packageJson.version` in BasePage).
 * `version.json` carries the same string, and the page asks for a reload when the two differ, so a new deploy of the
 * same package version still reloads open tabs. A virtual module, because Vite's JSON plugin would try to parse
 * JavaScript returned for a .json id.
 */
export default function stampedAppVersionPlugin(app: string): Plugin {
  const manifest = path.resolve(UI_ROOT, 'packages', app, 'package.json')
  return {
    name: 'stamped-app-version',
    enforce: 'pre',
    resolveId(source, importer) {
      if (importer && source.endsWith('package.json') && path.resolve(path.dirname(importer), source) === manifest) {
        return STAMPED_VERSION_MODULE
      }
      return undefined
    },
    load(id) {
      return id === STAMPED_VERSION_MODULE ? `export const version = ${JSON.stringify(appStampedVersion(app))}` : undefined
    },
  }
}
