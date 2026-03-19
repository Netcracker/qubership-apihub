import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralSchemaTests } from '../schemas/schema-test-runner-general'
import { DATA_FLOW_DIRECTION_RECEIVE } from '../utils'

const SUITE_ID = 'operation-receive-message-headers'

const MESSAGE_HEADERS_PATH = [
  'channels',
  'requestChannel',
  'messages',
  'requestMessage',
  'headers',
  'properties',
  'header1',
]

describe('AsyncAPI Operation Receive Message Headers', () => {
  runGeneralSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, MESSAGE_HEADERS_PATH, DATA_FLOW_DIRECTION_RECEIVE)
})
