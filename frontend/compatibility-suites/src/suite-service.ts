import { CompatibilitySuiteMap, CompatibilitySuiteMetaMap } from '../generated/suite-data'
import {
  buildCaseKey,
  CASE_KEY_SEPARATOR,
  TEST_SPEC_TYPE_GRAPH_QL,
  TEST_SPEC_TYPE_OPEN_API,
  type TestSpecType,
} from './suite-shared'

export { TEST_SPEC_TYPE_GRAPH_QL, TEST_SPEC_TYPE_OPEN_API }
export type { TestSpecType }

export type SpecificationVersion = string
export type SpecificationVersionPair = [SpecificationVersion, SpecificationVersion]

// Default OpenAPI version pair for cases without metadata.yaml.
// Used only for enumeration/grouping (major.minor); such cases are canonical and never patched.
const DEFAULT_OPENAPI_VERSION_PAIR: SpecificationVersionPair = ['3.0.0', '3.0.0']

// Non-OpenAPI suites currently do not participate in any version matrix.
// Keep a stable stub for external contract (future-proofing).
const DEFAULT_NON_OPENAPI_VERSION_PAIR: SpecificationVersionPair = ['unversioned', 'unversioned']

type VersionPairPolicy = {
  defaultPair: SpecificationVersionPair
  patchSamples?: (
    before: string,
    after: string,
    specificationVersionPair: SpecificationVersionPair,
  ) => [string, string]
}

// Configuration per suiteType. Extend this map to support specificationVersionPair for new suite types.
const VERSION_PAIR_POLICY_BY_SUITE_TYPE: Record<TestSpecType, VersionPairPolicy> = {
  [TEST_SPEC_TYPE_OPEN_API]: {
    defaultPair: DEFAULT_OPENAPI_VERSION_PAIR,
    patchSamples: (before, after, specificationVersionPair) => [
      patchOpenApiVersion(before, specificationVersionPair[0]),
      patchOpenApiVersion(after, specificationVersionPair[1]),
    ],
  },
  [TEST_SPEC_TYPE_GRAPH_QL]: {
    defaultPair: DEFAULT_NON_OPENAPI_VERSION_PAIR,
  },
}

/**
 * Returns the version-pair policy for a suite type (default pair + optional patch strategy).
 * Throws if suiteType has no VersionPairPolicy entry.
 */
const getVersionPairPolicy = (suiteType: TestSpecType): VersionPairPolicy => {
  const policy = VERSION_PAIR_POLICY_BY_SUITE_TYPE[suiteType]
  if (!policy) {
    // Should never happen because suiteType is a union, but keep a clear runtime error.
    throw new Error(`Unknown suiteType for VersionPairPolicy lookup: ${suiteType}`)
  }
  return policy
}

/**
 * Returns version pairs declared in metadata.yaml for the case, or undefined when metadata is absent.
 * Note: currently metadata-based version pairs are supported only for OpenAPI.
 */
const getMetadataVersionPairs = (
  suiteType: TestSpecType,
  caseKey: string,
): SpecificationVersionPair[] | undefined => {
  if (suiteType !== TEST_SPEC_TYPE_OPEN_API) {
    return undefined
  }
  return CompatibilitySuiteMetaMap.get(caseKey)?.versionPairs
}

/**
 * Patches only the root "openapi:" line in an OpenAPI YAML string.
 * Throws if the root "openapi" field is missing.
 */
const patchOpenApiVersion = (source: string, version: string): string => {
  const pattern = /^openapi:\s*.*$/m
  if (!pattern.test(source)) {
    throw new Error('Invalid OpenAPI sample: missing root "openapi" field')
  }
  return source.replace(pattern, `openapi: ${version}`)
}

/**
 * Returns supported specification version pairs for a compatibility suite case.
 *
 * - OpenAPI:
 *   - With metadata.yaml: returns declared version pairs (order preserved).
 *   - Without metadata.yaml: returns a single default pair for enumeration/grouping.
 * - Non-OpenAPI: returns a single default pair (stub; no version matrix yet).
 */
export const getCompatibilitySuiteSpecificationVersionPairs = (
  suiteType: TestSpecType,
  suiteId: string,
  testId: string,
): SpecificationVersionPair[] => {
  const caseKey = buildCaseKey(suiteType, suiteId, testId)

  if (!CompatibilitySuiteMap.has(caseKey)) {
    throw new Error(`Unknown compatibility suite case: (${suiteType}, ${suiteId}, ${testId})`)
  }

  const versionPairPolicy = getVersionPairPolicy(suiteType)
  const metadataVersionPairs = getMetadataVersionPairs(suiteType, caseKey)
  return metadataVersionPairs ? metadataVersionPairs : [versionPairPolicy.defaultPair]
}

/**
 * Returns before/after samples for a compatibility suite case.
 *
 * - If specificationVersionPair is not provided: returns stored samples as-is.
 * - If specificationVersionPair is provided:
 *   - suite types without a version-pair patch strategy: throws (currently OpenAPI-only).
 *   - case without metadata.yaml: returns stored samples as-is (canonical; no patching).
 *   - case with metadata.yaml: patches samples according to the provided pair and returns patched strings.
 */
export const getCompatibilitySuite = (
  suiteType: TestSpecType,
  suiteId: string,
  testId: string,
  specificationVersionPair?: SpecificationVersionPair,
): [string, string] => {
  const caseKey = buildCaseKey(suiteType, suiteId, testId)
  const suite = CompatibilitySuiteMap.get(caseKey)
  if (!suite) {
    return ['', '']
  }

  if (specificationVersionPair === undefined) {
    return [suite.before, suite.after]
  }

  const versionPairPolicy = getVersionPairPolicy(suiteType)

  if (!versionPairPolicy.patchSamples) {
    throw new Error(
      `specificationVersionPair is currently supported only for OpenAPI cases: (${suiteType}, ${suiteId}, ${testId})`,
    )
  }

  const supportedPairs = getCompatibilitySuiteSpecificationVersionPairs(suiteType, suiteId, testId)

  // Guard against passing an arbitrary version pair:
  // allow only pairs declared for the case (or the suite-type default stub when metadata is absent).
  const isSupported = supportedPairs.some(
    (pair) => pair[0] === specificationVersionPair[0] && pair[1] === specificationVersionPair[1],
  )
  if (!isSupported) {
    throw new Error(
      `Unsupported specificationVersionPair [${specificationVersionPair[0]}, ${
        specificationVersionPair[1]
      }] for case (${suiteType}, ${suiteId}, ${testId})`,
    )
  }

  // Patching semantics:
  // - without metadata.yaml: samples are canonical, never patched.
  // - with metadata.yaml: always patch (even for single pair).
  const metadataVersionPairs = getMetadataVersionPairs(suiteType, caseKey)
  if (!metadataVersionPairs) {
    return [suite.before, suite.after]
  }

  return versionPairPolicy.patchSamples(suite.before, suite.after, specificationVersionPair)
}

/**
 * Enumerates available compatibility suite cases.
 * Returns a map: suiteId -> testIds[] (optionally filtered by specType).
 *
 * Note: enumeration-only; does not return samples/metadata.
 */
export const getCompatibilitySuites = (specType?: TestSpecType): Map<string, string[]> => {
  return [...CompatibilitySuiteMap.keys()].reduce((result, caseKey) => {
    const [suiteType, suiteId, testId] = caseKey.split(CASE_KEY_SEPARATOR)
    if (specType && specType !== suiteType) {
      return result
    }
    const testIds = result.get(suiteId)
    result.set(suiteId, testIds ? [...testIds, testId] : [testId])
    return result
  }, new Map()) as Map<string, string[]>
}
