import path from 'path'
import { stampedVersion } from '@netcracker/qubership-apihub-build-id'

const UI_ROOT = path.resolve(__dirname, '..')

const cache = new Map<string, string>()

/**
 * The version an application reports: `<version from its package.json>+<build id>`.
 *
 * The id hashes the sources of the app and of the workspace packages it bundles (tools/build-id), so two builds of the
 * same sources agree and a build of other sources differs even when nobody bumped the version.
 *
 * The bundle gets it through Vite `define` as `__APP_VERSION__`, and `version.json` carries the same string, so the page
 * asks for a reload when a newer build is deployed. It is computed once per process: the dev server and a build must
 * hand both the same string, and the hash walks a few thousand files.
 */
export function appStampedVersion(app: string): string {
  let version = cache.get(app)
  if (!version) {
    version = stampedVersion(path.resolve(UI_ROOT, 'packages', app), { includeDevDependencies: true })
    cache.set(app, version)
  }
  return version
}
