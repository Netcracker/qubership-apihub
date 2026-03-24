import {
  CompatibilitySuiteMap,
  CompatibilitySuiteMetaMap,
  JsonSchemaCaseMap,
  SchemaSuiteTemplateMap,
} from '../generated/suite-data'
import { DEFAULT_OPENAPI_VERSION_PAIR, patchOpenApiVersion } from './openapi/openapi-version'
import { composeSchemaCase, isSchemaSuite } from './schemas/schema-suites'
import {
  buildCaseKey,
  CASE_KEY_SEPARATOR,
  isKnownSuiteType,
  TEST_SPEC_TYPE_ASYNC_API,
  TEST_SPEC_TYPE_GRAPH_QL,
  TEST_SPEC_TYPE_OPEN_API,
  type TestSpecType,
} from './suite-types'

export { TEST_SPEC_TYPE_ASYNC_API, TEST_SPEC_TYPE_GRAPH_QL, TEST_SPEC_TYPE_OPEN_API }
export type { TestSpecType }

export type SpecificationVersion = string
export type SpecificationVersionPair = [SpecificationVersion, SpecificationVersion]

// Non-OpenAPI suites currently do not participate in any version matrix.
// Keep stable stubs per spec type (future-proofing).
const DEFAULT_ASYNC_API_VERSION_PAIR: SpecificationVersionPair = ['3.0.0', '3.0.0']
const DEFAULT_GRAPH_QL_VERSION_PAIR: SpecificationVersionPair = ['unversioned', 'unversioned']

type VersionPairPolicy = {
  defaultPair: SpecificationVersionPair
  patchSamples?: (
    before: string,
    after: string,
    specificationVersionPair: SpecificationVersionPair,
  ) => [string, string]
}

/**
 * Returns true when a case is backed by a schema suite template + base store.
 */
const isKnownSchemaSuiteCase = (suiteType: TestSpecType, suiteId: string, testId: string): boolean =>
  isSchemaSuite(suiteType, suiteId) && JsonSchemaCaseMap.has(testId)

/**
 * Returns samples from either a stored suite or a rendered schema suite.
 * Throws if samples cannot be resolved (unknown case or data integrity error).
 */
const resolveSuiteSamples = (
  suiteType: TestSpecType,
  suiteId: string,
  testId: string,
): [string, string] => {
  const caseKey = buildCaseKey(suiteType, suiteId, testId)
  const suite = CompatibilitySuiteMap.get(caseKey)
  if (suite) {
    return [suite.before, suite.after]
  }

  if (!isSchemaSuite(suiteType, suiteId)) {
    throw new Error(`Unknown compatibility suite case: (${suiteType}, ${suiteId}, ${testId})`)
  }

  if (!JsonSchemaCaseMap.has(testId)) {
    throw new Error(`Unknown JSON schema case '${testId}' for schema suite (${suiteType}, ${suiteId})`)
  }

  const before = composeSchemaCase(suiteType, suiteId, testId, 'before')
  const after = composeSchemaCase(suiteType, suiteId, testId, 'after')
  return [before, after]
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
    defaultPair: DEFAULT_GRAPH_QL_VERSION_PAIR,
  },
  [TEST_SPEC_TYPE_ASYNC_API]: {
    defaultPair: DEFAULT_ASYNC_API_VERSION_PAIR,
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

  if (!CompatibilitySuiteMap.has(caseKey) && !isKnownSchemaSuiteCase(suiteType, suiteId, testId)) {
    throw new Error(`Unknown compatibility suite case: (${suiteType}, ${suiteId}, ${testId})`)
  }

  const versionPairPolicy = getVersionPairPolicy(suiteType)
  const metadataVersionPairs = getMetadataVersionPairs(suiteType, caseKey)
  return metadataVersionPairs ?? [versionPairPolicy.defaultPair]
}

/**
 * Returns before/after samples for a compatibility suite case.
 * Throws if the case is unknown or samples cannot be resolved.
 *
 * - If specificationVersionPair is not provided: returns stored samples as-is.
 * - If specificationVersionPair is provided:
 *   - suite types without a version-pair patch strategy (AsyncAPI, GraphQL): returns raw samples as-is.
 *   - case without metadata.yaml: returns stored samples as-is (canonical; no patching).
 *   - case with metadata.yaml: patches samples according to the provided pair and returns patched strings.
 */
export const getCompatibilitySuite = (
  suiteType: TestSpecType,
  suiteId: string,
  testId: string,
  specificationVersionPair?: SpecificationVersionPair,
): [string, string] => {
  const suiteSamples = resolveSuiteSamples(suiteType, suiteId, testId)

  if (specificationVersionPair === undefined) {
    return suiteSamples
  }

  const versionPairPolicy = getVersionPairPolicy(suiteType)

  const [beforeVersion, afterVersion] = specificationVersionPair
  const supportedPairs = getCompatibilitySuiteSpecificationVersionPairs(suiteType, suiteId, testId)

  // Guard against passing an arbitrary version pair:
  // allow only pairs declared for the case (or the suite-type default stub when metadata is absent).
  const isSupported = supportedPairs.some(
    (pair) => pair[0] === beforeVersion && pair[1] === afterVersion,
  )
  if (!isSupported) {
    throw new Error(
      `Unsupported specificationVersionPair [${beforeVersion}, ${afterVersion}] for case (${suiteType}, ${suiteId}, ${testId})`,
    )
  }

  // Suite types without a patch strategy (AsyncAPI, GraphQL) return raw samples as-is.
  if (!versionPairPolicy.patchSamples) {
    return suiteSamples
  }

  // Patching semantics:
  // - without metadata.yaml: samples are canonical, never patched.
  // - with metadata.yaml: always patch (even for single pair).
  const caseKey = buildCaseKey(suiteType, suiteId, testId)
  const metadataVersionPairs = getMetadataVersionPairs(suiteType, caseKey)
  if (!metadataVersionPairs) {
    return suiteSamples
  }

  return versionPairPolicy.patchSamples(suiteSamples[0], suiteSamples[1], specificationVersionPair)
}

/**
 * Enumerates available compatibility suite cases.
 * Returns a map: suiteId -> testIds[] (optionally filtered by specType).
 *
 * Note: enumeration-only; does not return samples/metadata.
 * When specType is omitted, suiteIds must be unique across suite types;
 * colliding schema suites silently overwrite each other's base testIds.
 */
export const getCompatibilitySuites = (specType?: TestSpecType): Map<string, string[]> => {
  const suites = new Map<string, string[]>()

  const assertKnownSuiteType: (suiteType: string) => asserts suiteType is TestSpecType = (suiteType) => {
    if (!isKnownSuiteType(suiteType)) {
      throw new Error(`Unexpected suiteType in generated maps: ${suiteType}`)
    }
  }
  const isIncludedSuiteType = (suiteType: TestSpecType): boolean => !specType || specType === suiteType

  const schemaTestIds = [...JsonSchemaCaseMap.keys()]

  // Schema suites:
  // - baseline is the JSON schema base store testIds (rendered via templates)
  // - full-sample exceptions (stored in CompatibilitySuiteMap) must be included as well
  for (const templateKey of SchemaSuiteTemplateMap.keys()) {
    const [suiteType, suiteId] = templateKey.split(CASE_KEY_SEPARATOR)
    assertKnownSuiteType(suiteType)
    if (!isIncludedSuiteType(suiteType)) {
      continue
    }
    suites.set(suiteId, [...schemaTestIds])
  }

  // Add/merge all full-sample cases (including schema suite exceptions).
  // Full samples override rendered samples at runtime via resolveSuiteSamples() priority,
  // but enumeration must include them so consumers/tests can see the full union.
  for (const caseKey of CompatibilitySuiteMap.keys()) {
    const [suiteType, suiteId, testId] = caseKey.split(CASE_KEY_SEPARATOR)
    assertKnownSuiteType(suiteType)
    if (!isIncludedSuiteType(suiteType)) {
      continue
    }
    const testIds = suites.get(suiteId)
    if (!testIds) {
      suites.set(suiteId, [testId])
      continue
    }
    if (!testIds.includes(testId)) {
      testIds.push(testId)
    }
  }

  // Keep enumeration stable and deterministic for consumers/tests.
  // .sort() mutates the array in place; the map already holds the same reference.
  for (const [, testIds] of suites.entries()) {
    testIds.sort((a, b) => a.localeCompare(b))
  }

  return suites
}
