import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralSchemaTests } from '../schemas/schema-test-runner-general'
import { DATA_FLOW_DIRECTION_RECEIVE } from '../utils'

const SUITE_ID = 'operation-reply-send-message-headers'

const REPLY_MESSAGE_HEADERS_PATH = [
  'channels',
  'replyChannel',
  'messages',
  'replyMessage',
  'headers',
  'properties',
  'header1',
]

describe.skip('AsyncAPI Operation Reply Send Message Headers', () => {
  runGeneralSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, REPLY_MESSAGE_HEADERS_PATH, DATA_FLOW_DIRECTION_RECEIVE)
})
