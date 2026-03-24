import { mkdirSync, rmSync } from 'fs'
import { camelCase, upperFirst } from 'lodash-es'
import path from 'path'
import { exit } from 'process'
import { fileURLToPath } from 'url'

export const CS_LABEL = 'compatibility-suite'

/**
 * Guard: do not run generators when installed as a transitive dependency (inside node_modules).
 * Call this at the top of every generator script.
 */
export const exitIfInsideNodeModules = (importMetaUrl) => {
  const __filename = fileURLToPath(importMetaUrl)
  const __dirname = path.dirname(__filename)
  // bin/ is 1 level under package root; package root is 3 levels under node_modules
  const resolvedPath = path.resolve(__dirname, '..', '..', '..')
  if (path.basename(resolvedPath) === 'node_modules') {
    exit()
  }
}

/**
 * Wipes and re-creates a directory.
 */
export const resetDirectory = (dirPath) => {
  rmSync(dirPath, { recursive: true, force: true })
  mkdirSync(dirPath, { recursive: true })
}

/**
 * Converts a string to PascalCase via lodash.
 */
export const toPascalCase = (str) => upperFirst(camelCase(str))

export const makeFilePrefix = (specType) => `${specType}-${CS_LABEL}`

export const makeMetaId = (specType, suiteId) => `${makeFilePrefix(specType)}-${suiteId}`
