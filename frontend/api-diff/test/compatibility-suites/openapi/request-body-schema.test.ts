import { TEST_SPEC_TYPE_OPEN_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralSchemaTests } from '../schemas/schema-test-runner-general'
import { runOpenApiOnlySchemaTests } from '../schemas/schema-test-runner-openapi-only'
import { DATA_FLOW_DIRECTION_SEND } from '../utils'

const SUITE_ID = 'request-body-schema'

const REQUEST_SCHEMA_PATH = [
  'paths',
  '/path1',
  'post',
  'requestBody',
  'content',
  'application/json',
  'schema',
]

describe('Request Body Schema', () => {
  runGeneralSchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, REQUEST_SCHEMA_PATH, DATA_FLOW_DIRECTION_SEND)
  runOpenApiOnlySchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, REQUEST_SCHEMA_PATH, DATA_FLOW_DIRECTION_SEND)
})
