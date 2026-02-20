export const TEST_SPEC_TYPE_OPEN_API = 'openapi' as const
export const TEST_SPEC_TYPE_GRAPH_QL = 'graphql' as const
export const TEST_SPEC_TYPE_ASYNC_API = 'asyncapi' as const

export type TestSpecType =
  | typeof TEST_SPEC_TYPE_OPEN_API
  | typeof TEST_SPEC_TYPE_GRAPH_QL
  | typeof TEST_SPEC_TYPE_ASYNC_API

/**
 * Type guard: returns true if the value is a known TestSpecType.
 */
export const isKnownSuiteType = (value: string): value is TestSpecType =>
  value === TEST_SPEC_TYPE_OPEN_API
  || value === TEST_SPEC_TYPE_GRAPH_QL
  || value === TEST_SPEC_TYPE_ASYNC_API

/** Logical key separator (NOT a filesystem path). We use '/' for readability/stability. */
export const CASE_KEY_SEPARATOR = '/' as const

/**
 * Builds a stable logical case key for a suite case.
 */
export const buildCaseKey = (suiteType: TestSpecType, suiteId: string, testId: string): string =>
  [suiteType, suiteId, testId].join(CASE_KEY_SEPARATOR)

/**
 * Builds a stable logical template key for a schema suite template.
 */
export const buildTemplateKey = (suiteType: TestSpecType, suiteId: string): string =>
  [suiteType, suiteId].join(CASE_KEY_SEPARATOR)
