import { TEST_SPEC_TYPE_OPEN_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralSchemaTests } from '../schemas/schema-test-runner-general'
import { runOpenApiOnlySchemaTests } from '../schemas/schema-test-runner-openapi-only'
import { DATA_FLOW_DIRECTION_RECEIVE } from '../utils'

const SUITE_ID = 'response-body-schema'

const RESPONSE_SCHEMA_PATH = [
  'paths',
  '/path1',
  'post',
  'responses',
  '200',
  'content',
  'application/json',
  'schema',
]

describe('Response Body Schema', () => {
  runGeneralSchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, RESPONSE_SCHEMA_PATH, DATA_FLOW_DIRECTION_RECEIVE)
  runOpenApiOnlySchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, RESPONSE_SCHEMA_PATH, DATA_FLOW_DIRECTION_RECEIVE)
})
