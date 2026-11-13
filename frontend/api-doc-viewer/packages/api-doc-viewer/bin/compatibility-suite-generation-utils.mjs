import { mkdirSync, readdirSync, rmSync } from 'fs'
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
 * Removes the files ending with `suffix` from a directory (creating it when missing) and keeps
 * everything else. The IT output folder also holds the committed screenshot baselines
 * (`<test-run>/__image_snapshots__/`), so it must never be wiped with `resetDirectory`.
 */
export const removeGeneratedFiles = (dirPath, suffix) => {
  mkdirSync(dirPath, { recursive: true })
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(suffix)) {
      rmSync(path.join(dirPath, entry.name))
    }
  }
}

/**
 * Converts a string to PascalCase via lodash.
 */
export const toPascalCase = (str) => upperFirst(camelCase(str))

export const makeFilePrefix = (specType) => `${specType}-${CS_LABEL}`

export const makeMetaId = (specType, suiteId) => `${makeFilePrefix(specType)}-${suiteId}`

// ─── OpenAPI: one Storybook sub-group / test run per OAS version pair (major.minor) ───────────
// Design: docs/design/openapi/features/compatibility-suite.md

/** Suites not rendered by the operation viewers (same exclusion as the legacy apispec-view). */
export const OPENAPI_EXCLUDED_SUITE_IDS = new Set(['human-readable'])

/** Version-pair groups in Storybook / runner order. */
export const OPENAPI_PAIR_GROUPS = ['3.0-3.0', '3.0-3.1', '3.1-3.0', '3.1-3.1']

const toMajorMinor = (version) => (version.startsWith('3.1') ? '3.1' : '3.0')

/** `['3.0.0', '3.1.0']` -> `3.0-3.1`. */
export const toOpenApiPairGroup = ([before, after]) => `${toMajorMinor(before)}-${toMajorMinor(after)}`

/** `3.0-3.1` -> `OAS 3.0 vs OAS 3.1` (Storybook sub-group). */
export const openApiPairGroupTitle = (group) => group.split('-').map(version => `OAS ${version}`).join(' vs ')

/** `3.0-3.1` -> `openapi-compatibility-suite-30-31`: the test run id and the file / meta id prefix. */
export const makeOpenApiFilePrefix = (specType, group) => `${makeFilePrefix(specType)}-${group.replace(/\./g, '')}`

export const makeOpenApiMetaId = (specType, group, suiteId) => `${makeOpenApiFilePrefix(specType, group)}-${suiteId}`

/**
 * OpenAPI cases per version-pair group and suite: `group -> suiteId -> [{ testId, versionPair }]`,
 * groups in `OPENAPI_PAIR_GROUPS` order. A case is listed once per version pair of its metadata.
 * The compatibility-suites API is passed in: generators import it dynamically (see the scripts).
 */
export const collectOpenApiCasesByPairGroup = ({ getCompatibilitySuites, getCompatibilitySuiteSpecificationVersionPairs, TEST_SPEC_TYPE_OPEN_API }) => {
  const groups = new Map(OPENAPI_PAIR_GROUPS.map(group => [group, new Map()]))
  for (const [suiteId, testIds] of getCompatibilitySuites(TEST_SPEC_TYPE_OPEN_API).entries()) {
    if (OPENAPI_EXCLUDED_SUITE_IDS.has(suiteId)) continue
    for (const testId of testIds) {
      for (const versionPair of getCompatibilitySuiteSpecificationVersionPairs(TEST_SPEC_TYPE_OPEN_API, suiteId, testId)) {
        const suites = groups.get(toOpenApiPairGroup(versionPair))
        if (!suites) {
          throw new Error(`Unexpected OpenAPI version pair ${versionPair.join(' -> ')} of ${suiteId}/${testId}`)
        }
        if (!suites.has(suiteId)) suites.set(suiteId, [])
        suites.get(suiteId).push({ testId, versionPair })
      }
    }
  }
  return groups
}
