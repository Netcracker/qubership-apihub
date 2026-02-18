import { TEST_SPEC_TYPE_GRAPH_QL, TEST_SPEC_TYPE_OPEN_API, type TestSpecType } from '../suite-types'

const OPENAPI_SCHEMA_SUITE_IDS = [
  'parameters-schema',
  'request-body-schema',
  'response-body-schema',
  'response-headers-schema',
] as const

const SCHEMA_SUITE_IDS_BY_SPEC_TYPE: Record<TestSpecType, readonly string[]> = {
  [TEST_SPEC_TYPE_OPEN_API]: OPENAPI_SCHEMA_SUITE_IDS,
  [TEST_SPEC_TYPE_GRAPH_QL]: [],
}

export const isKnownSchemaSuiteId = (specType: TestSpecType, suiteId: string): boolean =>
  SCHEMA_SUITE_IDS_BY_SPEC_TYPE[specType].includes(suiteId)
