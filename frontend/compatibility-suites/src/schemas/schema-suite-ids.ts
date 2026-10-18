import {
  TEST_SPEC_TYPE_ASYNC_API,
  TEST_SPEC_TYPE_GRAPH_QL,
  TEST_SPEC_TYPE_OPEN_API,
  type TestSpecType,
} from '../suite-types'

const OPENAPI_SCHEMA_SUITE_IDS = [
  'parameters-schema',
  'request-body-schema',
  'response-body-schema',
  'response-headers-schema',
] as const

const ASYNCAPI_SCHEMA_SUITE_IDS = [
  'operation-receive-message-headers',
  'operation-send-message-headers',
  'operation-receive-message-payload',
  'operation-send-message-payload',
  'operation-reply-receive-message-headers',
  'operation-reply-send-message-headers',
  'operation-reply-receive-message-payload',
  'operation-reply-send-message-payload',
] as const

const SCHEMA_SUITE_IDS_BY_SPEC_TYPE: Record<TestSpecType, readonly string[]> = {
  [TEST_SPEC_TYPE_OPEN_API]: OPENAPI_SCHEMA_SUITE_IDS,
  [TEST_SPEC_TYPE_GRAPH_QL]: [],
  [TEST_SPEC_TYPE_ASYNC_API]: ASYNCAPI_SCHEMA_SUITE_IDS,
}

export const isKnownSchemaSuiteId = (specType: TestSpecType, suiteId: string): boolean =>
  SCHEMA_SUITE_IDS_BY_SPEC_TYPE[specType].includes(suiteId)
