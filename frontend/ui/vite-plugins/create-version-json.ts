import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import type { Plugin } from 'vite'

const requireFromHere = createRequire(import.meta.url)

const UI_ROOT = path.resolve(__dirname, '..')
const API_PROCESSOR = '@netcracker/qubership-apihub-api-processor'

const APPS = ['portal', 'agents'] as const

type VersionData = {
  frontendVersion: string
  apiProcessorVersion: string
}

/**
 * The version of an installed package, read from the manifest beside its entry point.
 *
 * Not `require.resolve('<pkg>/package.json')`: api-processor publishes an `exports` map
 * listing only "." and "./processor", so that specifier throws
 * ERR_PACKAGE_PATH_NOT_EXPORTED. The entry point is exported, so resolve that and walk up
 * to the first manifest that names the package - a package may have a nested package.json
 * inside `dist/` (api-processor does), so matching on `name` rather than taking the first
 * one found is what makes this correct.
 */
function installedVersion(name: string): string | null {
  let dir: string
  try {
    dir = path.dirname(requireFromHere.resolve(name))
  } catch {
    return null
  }
  for (;;) {
    const manifestPath = path.join(dir, 'package.json')
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
        if (manifest.name === name) {
          return manifest.version ?? null
        }
      } catch {
        // an unreadable manifest on the way up is not the one we want; keep walking
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      return null
    }
    dir = parent
  }
}

/** The version an application declares for itself. */
function appVersion(app: string): string | null {
  const manifestPath = path.resolve(UI_ROOT, 'packages', app, 'package.json')
  if (!fs.existsSync(manifestPath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')).version ?? null
}

function versionDataFor(app: string): VersionData | null {
  const frontendVersion = appVersion(app)
  const apiProcessorVersion = installedVersion(API_PROCESSOR)
  if (!frontendVersion || !apiProcessorVersion) {
    return null
  }
  return { frontendVersion, apiProcessorVersion }
}

/**
 * Writes `dist/version.json`, which the running application surfaces, and serves the same
 * payload from the dev server. The dev server has no dist folder.
 *
 * Both values used to come from package-manager metadata: `frontendVersion` from
 * lerna.json's `version`, and `apiProcessorVersion` from package-lock.json. Neither input
 * survives a change of package manager or layout. An application's package.json carries its
 * own version, and an installed dependency's carries its. The files are read on every
 * request, so a relinked api-processor needs no server restart.
 */
export default function createVersionJsonFilePlugin(): Plugin {
  return {
    name: 'create-version-json-file',
    configureServer: function(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url?.split('?')[0]
        const app = APPS.find(name => url === `/${name}/version.json`)
        if (!app) {
          next()
          return
        }

        const versionData = versionDataFor(app)
        if (!versionData) {
          next()
          return
        }

        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(versionData))
      })
    },
    closeBundle: async function() {
      const apiProcessorVersion = installedVersion(API_PROCESSOR)
      if (!apiProcessorVersion) {
        this.error(`Version not found: could not read a version for ${API_PROCESSOR} from its installed manifest`)
      }

      for (const app of APPS) {
        const frontendVersion = appVersion(app)
        if (!frontendVersion) {
          this.error(`Version not found: packages/${app}/package.json declares no version`)
        }

        const outputPath = path.resolve(UI_ROOT, 'packages', app, 'dist/version.json')
        fs.mkdirSync(path.dirname(outputPath), { recursive: true })
        fs.writeFileSync(outputPath, JSON.stringify({ frontendVersion, apiProcessorVersion }, null, 2))
      }
    },
  }
}
