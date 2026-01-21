export const TEST_SPEC_TYPE_OPEN_API = 'openapi' as const
export const TEST_SPEC_TYPE_GRAPH_QL = 'graphql' as const

export type TestSpecType = typeof TEST_SPEC_TYPE_OPEN_API | typeof TEST_SPEC_TYPE_GRAPH_QL

// Logical case key (NOT a filesystem path). We use '/' for readability/stability.
export const CASE_KEY_SEPARATOR = '/' as const

export const buildCaseKey = (suiteType: TestSpecType, suiteId: string, testId: string): string =>
  [suiteType, suiteId, testId].join(CASE_KEY_SEPARATOR)
