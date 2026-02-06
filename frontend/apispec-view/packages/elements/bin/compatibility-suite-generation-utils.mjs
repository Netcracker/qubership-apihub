import {
  getCompatibilitySuites,
  getCompatibilitySuiteSpecificationVersionPairs,
  TEST_SPEC_TYPE_OPEN_API,
} from '@netcracker/qubership-apihub-compatibility-suites'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs'
import path from 'path'

const DEFAULT_EXCLUDED_SUITE_IDS = ['human-readable']
const SKIPPED_OUT_DIR_NAMES = ['__image_snapshots__', 'service']

const ELEMENTS_PACKAGE_ROOT = path.resolve(import.meta.dirname, '..')

/**
 * @typedef {[string, string]} SpecificationVersionPair
 * @typedef {{ testId: string, openApiVersionPair: SpecificationVersionPair | null }} OpenApiCaseVariant
 * @typedef {Map<string, Map<string, OpenApiCaseVariant[]>>} OpenApiCasesByPairGroup
 */

/**
 * Converts an OpenAPI version to major.minor format.
 * @param {string} v - Version string like '3.0.0', '3.1.0', etc
 * @returns {string} Major.minor string like '3.0' or '3.1'
 */
const toMajorMinor = (v) => (v.startsWith('3.1') ? '3.1' : '3.0')

/**
 * Converts an OpenAPI version pair to a major.minor group string (used for Storybook sections).
 * @param {SpecificationVersionPair} openApiVersionPair - Tuple of [beforeVersion, afterVersion]
 * @returns {string} Group string like '3.0-3.1'
 */
const toPairGroup = ([beforeV, afterV]) => `${toMajorMinor(beforeV)}-${toMajorMinor(afterV)}`

/**
 * Converts a group string to a tag suitable for meta.id and filenames.
 * Storybook normalizes underscores to dashes, so we just remove dots entirely.
 * @param {string} group - Group string like '3.0-3.1'
 * @returns {string} Tag string like '30-31'
 */
const pairGroupToIdTag = (group) => group.replace(/\./g, '')

/**
 * Generates a story meta.id for a suite in a given group.
 * @param {string} group - Group string like '3.0-3.1'
 * @param {string} suiteId - Suite identifier like 'parameters-schema'
 * @returns {string} Meta id like 'openapi-compatibility-suite-30-31-parameters-schema'
 */
export const storyMetaId = (group, suiteId) => `openapi-compatibility-suite-${pairGroupToIdTag(group)}-${suiteId}`

/**
 * Builds grouped OpenAPI cases for generation.
 *
 * Note: `openApiVersionPair` is set to `null` for single-pair cases to avoid passing redundant args.
 * For multi-pair cases it's the concrete pair `[beforeVersion, afterVersion]`.
 *
 * @param {string[]} excludedSuiteIds - Suite ids to skip
 * @returns {OpenApiCasesByPairGroup}
 */
const getOpenApiCasesByPairGroup = (excludedSuiteIds = DEFAULT_EXCLUDED_SUITE_IDS) => {
  const suites = getCompatibilitySuites(TEST_SPEC_TYPE_OPEN_API)
  const groupMap = new Map()

  for (const [suiteId, testIds] of suites.entries()) {
    if (excludedSuiteIds.includes(suiteId)) continue

    for (const testId of testIds) {
      const pairs = getCompatibilitySuiteSpecificationVersionPairs(TEST_SPEC_TYPE_OPEN_API, suiteId, testId)

      for (const openApiVersionPair of pairs) {
        const group = toPairGroup(openApiVersionPair)
        const passPair = pairs.length > 1 ? openApiVersionPair : null

        if (!groupMap.has(group)) groupMap.set(group, new Map())
        const suiteMap = groupMap.get(group)
        if (!suiteMap.has(suiteId)) suiteMap.set(suiteId, [])
        suiteMap.get(suiteId).push({ testId, openApiVersionPair: passPair })
      }
    }
  }

  return groupMap
}

/**
 * Convenience helper: groups OpenAPI cases (by pair group) and writes generated files in one call.
 *
 * If `outDir` exists, it clears its contents to avoid stale generated files, but preserves
 * some directories (like `__image_snapshots__` used by `jest-image-snapshot`).
 * If `outDir` doesn't exist, it will be created.
 *
 * @param {string} outDir - Output directory relative to the elements package root
 * @param {(suiteId: string, group: string) => string} fileName - Builds file name for (suiteId, group)
 * @param {(suiteId: string, group: string, items: OpenApiCaseVariant[]) => string} fileContent - Produces file content
 * @returns {{ totalFiles: number; groupCount: number }} Statistics about generated files
 */
export const writeOpenApiGeneratedFilesByPairGroup = (outDir, fileName, fileContent) => {
  const outDirAbs = path.resolve(ELEMENTS_PACKAGE_ROOT, outDir)

  const groupMap = getOpenApiCasesByPairGroup()

  if (existsSync(outDirAbs)) {
    for (const entry of readdirSync(outDirAbs)) {
      if (SKIPPED_OUT_DIR_NAMES.includes(entry)) continue
      rmSync(path.join(outDirAbs, entry), { recursive: true, force: true })
    }
  } else {
    mkdirSync(outDirAbs, { recursive: true })
  }

  let totalFiles = 0
  for (const [group, suiteMap] of groupMap.entries()) {
    for (const [suiteId, items] of suiteMap.entries()) {
      writeFileSync(
        path.join(outDirAbs, fileName(suiteId, group)),
        fileContent(suiteId, group, items),
      )
      totalFiles += 1
    }
  }

  return { totalFiles, groupCount: groupMap.size }
}
