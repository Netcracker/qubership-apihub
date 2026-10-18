import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralSchemaTests } from '../schemas/schema-test-runner-general'
import { DATA_FLOW_DIRECTION_SEND } from '../utils'

const SUITE_ID = 'operation-reply-receive-message-payload'

const REPLY_MESSAGE_PAYLOAD_PATH = [
  'channels',
  'replyChannel',
  'messages',
  'replyMessage',
  'payload',
]

describe('AsyncAPI Operation Reply Receive Message Payload', () => {
  runGeneralSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, REPLY_MESSAGE_PAYLOAD_PATH, DATA_FLOW_DIRECTION_SEND)
})
