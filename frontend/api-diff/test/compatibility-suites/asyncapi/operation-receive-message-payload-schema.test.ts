import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralSchemaTests } from '../schemas/schema-test-runner-general'
import { DATA_FLOW_DIRECTION_RECEIVE } from '../utils'

const SUITE_ID = 'operation-receive-message-payload'

const MESSAGE_PAYLOAD_PATH = [
  'channels',
  'requestChannel',
  'messages',
  'requestMessage',
  'payload',
]

describe.skip('AsyncAPI Operation Receive Message Payload', () => {
  runGeneralSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, MESSAGE_PAYLOAD_PATH, DATA_FLOW_DIRECTION_RECEIVE)
})
