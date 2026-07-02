import { apiDiff, CompareOptions, DiffAction, } from '../src'
import { COMPARE_SCOPE_ROOT } from '../src/types'
import { parseAsyncApiAndAssertValid } from './helper/asyncapi'
import { diffsMatcher } from './helper/matchers'
import { COMPARE_SCOPE_SEND } from '../src/asyncapi'
import { COMPARE_SCOPE_COMPONENTS } from '../src/graphapi'

// ------------------------------------------------------------------
// Spec factory
//
// Builds a minimal AsyncAPI 3 spec with:
//   - Two component servers: serverA, serverB
//   - Two component messages: MessageA (payload: string), MessageB (payload: integer)
//     Override via messagePayloads: { MessageA: { type: 'integer' } }
//   - A channel "myChannel" that references the given serverIds (in order) and
//     exposes the given messageIds as channel-level messages
//   - An operation "myOp" (send) that references the given messageIds (in order)
//     via the channel messages
// ------------------------------------------------------------------

interface MakeSpecOptions {
  serverIds?: string[]
  messageIds?: string[]
  messagePayloadsPatch?: Record<string, unknown>
  serversPatch?: Record<string, { host: string; protocol: string }>
  operationIds?: string[]
}

const DEFAULT_PAYLOADS: Record<string, unknown> = {
  MessageA: { type: 'string' },
  MessageB: { type: 'integer' },
}

const DEFAULT_SERVERS: Record<string, { host: string; protocol: string }> = {
  serverA: { host: 'localhost', protocol: 'amqp' },
  serverB: { host: 'remote.host', protocol: 'amqp' },
}

function makeSpec({
  serverIds = ['serverA'],
  messageIds = ['MessageA'],
  messagePayloadsPatch,
  serversPatch,
  operationIds,
}: MakeSpecOptions = {}): { asyncapi: string } & Record<string, unknown> {
  const payloads = { ...DEFAULT_PAYLOADS, ...messagePayloadsPatch }
  const servers = { ...DEFAULT_SERVERS, ...serversPatch }

  // Channel-level messages map: { MessageA: { $ref: '#/components/messages/MessageA' }, ... }
  const channelMessages = Object.fromEntries(
    messageIds.map(id => [id, { $ref: `#/components/messages/${id}` }]),
  )

  // Operation messages array: [{ $ref: '#/channels/myChannel/messages/MessageA' }, ...]
  const operationMessages = messageIds.map(id => ({
    $ref: `#/channels/myChannel/messages/${id}`,
  }))

  // Build operations map
  const ops = operationIds ?? ['myOp']
  const operations = Object.fromEntries(
    ops.map(opId => [
      opId,
      {
        action: 'send',
        channel: { $ref: '#/channels/myChannel' },
        messages: operationMessages,
      },
    ]),
  )

  return {
    asyncapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    servers,
    channels: {
      myChannel: {
        servers: serverIds.map(id => ({ $ref: `#/servers/${id}` })),
        messages: channelMessages,
      },
    },
    operations,
    components: {
      messages: Object.fromEntries(
        ['MessageA', 'MessageB'].map(id => [
          id,
          { payload: payloads[id] ?? { type: 'string' } },
        ]),
      ),
    },
  }
}

describe('firstReferenceKeyProperty retained in merged document if explicitly passed', () => {
  const TEST_FIRST_REF_KEY_PROP = Symbol('test-first-ref-key')

  const COMPARE_OPTIONS: CompareOptions = {
    firstReferenceKeyProperty: TEST_FIRST_REF_KEY_PROP,
  }

  type Doc = Record<PropertyKey, unknown>

  const getMessages = (merged: unknown): Doc[] =>
    (((merged as Doc).operations as Doc)?.myOp as Doc)?.messages as Doc[]

  const getServers = (merged: unknown): Doc[] =>
    (((merged as Doc).channels as Doc)?.myChannel as Doc)?.servers as Doc[]


  describe('messages', () => {
    it('symbol present on matched/modified message merged node', async () => {
      const before = makeSpec({ messageIds: ['MessageA'] })
      const after = makeSpec({
        messageIds: ['MessageA'],
        messagePayloadsPatch: { MessageA: { type: 'integer' } },
      })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)
      const messages = getMessages(merged)
      expect(messages[0][TEST_FIRST_REF_KEY_PROP]).toBe('MessageA')
    })

    it('symbol present on added message node in merged document', async () => {
      const before = makeSpec({ messageIds: ['MessageA'] })
      const after = makeSpec({ messageIds: ['MessageA', 'MessageB'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)
      const messages = getMessages(merged)

      expect(messages[0][TEST_FIRST_REF_KEY_PROP]).toBe('MessageA')
      expect(messages[1][TEST_FIRST_REF_KEY_PROP]).toBe('MessageB')
    })

    it('symbol present on removed message node in merged document', async () => {
      const before = makeSpec({ messageIds: ['MessageA', 'MessageB'] })
      const after = makeSpec({ messageIds: ['MessageA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged, diffs } = apiDiff(before, after, COMPARE_OPTIONS)
      const messages = getMessages(merged)

      expect(messages[0][TEST_FIRST_REF_KEY_PROP]).toBe('MessageA')
      expect(messages[1][TEST_FIRST_REF_KEY_PROP]).toBe('MessageB')
    })
  })

  describe('servers', () => {

    it('symbol present on matched server node in merged document', async () => {
      const before = makeSpec({ serverIds: ['serverA'] })
      const after = makeSpec({ serverIds: ['serverA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)
      const servers = getServers(merged)
      expect(servers[0][TEST_FIRST_REF_KEY_PROP]).toBe('serverA')
    })

    it('symbol present on added server node in merged document', async () => {
      const before = makeSpec({ serverIds: ['serverA'] })
      const after = makeSpec({ serverIds: ['serverA', 'serverB'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)
      const servers = getServers(merged)

      expect(servers[0][TEST_FIRST_REF_KEY_PROP]).toBe('serverA')
      expect(servers[1][TEST_FIRST_REF_KEY_PROP]).toBe('serverB')
    })

    it('symbol present on removed server node in merged document', async () => {
      const before = makeSpec({ serverIds: ['serverA', 'serverB'] })
      const after = makeSpec({ serverIds: ['serverA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)
      const servers = getServers(merged)

      expect(servers[0][TEST_FIRST_REF_KEY_PROP]).toBe('serverA')
      expect(servers[1][TEST_FIRST_REF_KEY_PROP]).toBe('serverB')
    })
  })

  describe('firstReferenceKeyProperty not passed', () => {
    it('symbol absent on merged message when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ messageIds: ['MessageA'] })
      const after = makeSpec({ messageIds: ['MessageA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const messages = getMessages(merged)

      expect(Object.getOwnPropertySymbols(messages[0] as object)).toBeEmpty()
    })

    it('symbol absent on added message when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ messageIds: ['MessageA'] })
      const after = makeSpec({ messageIds: ['MessageA', 'MessageB'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const messages = getMessages(merged)

      expect(messages).toHaveLength(2)
      for (const msg of messages) {
        expect(Object.getOwnPropertySymbols(msg as object)).toBeEmpty()
      }
    })

    it('symbol absent on removed message when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ messageIds: ['MessageA', 'MessageB'] })
      const after = makeSpec({ messageIds: ['MessageA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const messages = getMessages(merged)

      expect(messages).toHaveLength(2)
      for (const msg of messages) {
        expect(Object.getOwnPropertySymbols(msg as object)).toBeEmpty()
      }
    })

    it('symbol absent on merged server when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ serverIds: ['serverA'] })
      const after = makeSpec({ serverIds: ['serverA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const servers = getServers(merged)

      expect(Object.getOwnPropertySymbols(servers[0] as object)).toBeEmpty()
    })

    it('symbol absent on added server when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ serverIds: ['serverA'] })
      const after = makeSpec({ serverIds: ['serverA', 'serverB'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const servers = getServers(merged)

      expect(servers).toHaveLength(2)
      for (const server of servers) {
        expect(Object.getOwnPropertySymbols(server as object)).toBeEmpty()
      }
    })

    it('symbol absent on removed server when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ serverIds: ['serverA', 'serverB'] })
      const after = makeSpec({ serverIds: ['serverA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const servers = getServers(merged)

      expect(servers).toHaveLength(2)
      for (const server of servers) {
        expect(Object.getOwnPropertySymbols(server as object)).toBeEmpty()
      }
    })
  })
})

describe('messages mapped by firstReferenceKeyProperty', () => {
  it('reordered operation messages produce no diffs', async () => {
    const before = makeSpec({ messageIds: ['MessageA', 'MessageB'] })
    const after = makeSpec({ messageIds: ['MessageB', 'MessageA'] })
    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    expect(diffs).toBeEmpty()
  })

  it('modified message content with order swapped generates only type replace diffs', async () => {
    const before = makeSpec({
      messageIds: ['MessageA', 'MessageB'],
    })
    const after = makeSpec({
      messageIds: ['MessageB', 'MessageA'],
      messagePayloadsPatch: { MessageA: { type: 'integer' } },
    })
    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    // diffs for MessageA in 3 scopes are reported only
    expect(diffs).toHaveLength(3)
    const COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH = ['components', 'messages', 'MessageA', 'payload', 'type']
    const TYPE_CHANGE_DIFF = {
      beforeDeclarationPaths: [COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH],
      afterDeclarationPaths: [COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH],
      action: DiffAction.replace,
      beforeValue: 'string',
      afterValue: 'integer',
    }
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_COMPONENTS,
      }),
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
    ]))
  })

  it('add message, modify existing message', async () => {
    const before = makeSpec({
      messageIds: ['MessageA'],
    })
    const after = makeSpec({
      messageIds: ['MessageB', 'MessageA'],
      messagePayloadsPatch: { MessageA: { type: 'integer' } },
    })

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)


    const COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH = ['components', 'messages', 'MessageA', 'payload', 'type']
    const TYPE_CHANGE_DIFF = {
      beforeDeclarationPaths: [COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH],
      afterDeclarationPaths: [COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH],
      action: DiffAction.replace,
      beforeValue: 'string',
      afterValue: 'integer',
    }
    const ADD_MESSAGE_DIFF = {
      afterDeclarationPaths: [['channels', 'myChannel', 'messages', 'MessageB']],
      action: DiffAction.add,
      afterValue: {
        payload: {
          type: "integer",
        },
      },
    }

    expect(diffs).toHaveLength(6)
    expect(diffs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ...ADD_MESSAGE_DIFF,
        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...ADD_MESSAGE_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
      expect.objectContaining({
        ...ADD_MESSAGE_DIFF,
        afterDeclarationPaths: [['operations', 'myOp', 'messages', 0]],
        scope: COMPARE_SCOPE_SEND,
      }),
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_COMPONENTS,
      }),
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
    ]))
  })

  it('remove message, modify remaining message', async () => {
    const before = makeSpec({
      messageIds: ['MessageB', 'MessageA'],
    })
    const after = makeSpec({
      messageIds: ['MessageA'],
      messagePayloadsPatch: { MessageA: { type: 'integer' } },
    })

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    const COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH = ['components', 'messages', 'MessageA', 'payload', 'type']
    const TYPE_CHANGE_DIFF = {
      beforeDeclarationPaths: [COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH],
      afterDeclarationPaths: [COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH],
      action: DiffAction.replace,
      beforeValue: 'string',
      afterValue: 'integer',
    }
    const REMOVE_MESSAGE_DIFF = {
      beforeDeclarationPaths: [['channels', 'myChannel', 'messages', 'MessageB']],
      action: DiffAction.remove,
      beforeValue: {
        payload: {
          type: "integer",
        },
      },
    }

    expect(diffs).toHaveLength(6)
    expect(diffs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ...REMOVE_MESSAGE_DIFF,
        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...REMOVE_MESSAGE_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
      expect.objectContaining({
        ...REMOVE_MESSAGE_DIFF,
        beforeDeclarationPaths: [['operations', 'myOp', 'messages', 0]],
        scope: COMPARE_SCOPE_SEND,
      }),
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_COMPONENTS,
      }),
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
    ]))
  })
})

describe('servers mapped by key', () => {
  it('reordered servers produce no diffs', async () => {
    const before = makeSpec({ serverIds: ['serverA', 'serverB'] })
    const after = makeSpec({ serverIds: ['serverB', 'serverA'] })
    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    expect(diffs).toBeEmpty()
  })

  it('modified server content with order swapped generates only replace diffs', async () => {
    const before = makeSpec({
      serverIds: ['serverA', 'serverB'],
    })
    const after = makeSpec({
      serverIds: ['serverB', 'serverA'],
      serversPatch: {
        serverB: { host: 'remote.changed', protocol: 'amqp' },
      },
    })

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    expect(diffs).toHaveLength(2)
    const HOST_CHANGE_DIFF = {
      beforeValue: 'remote.host',
      afterValue: 'remote.changed',
      action: DiffAction.replace,
      afterDeclarationPaths: [['servers', 'serverB', 'host']],
      beforeDeclarationPaths: [['servers', 'serverB', 'host']],
    }
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        ...HOST_CHANGE_DIFF,
        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...HOST_CHANGE_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
    ]))
  })

  it('add server, modify existing server', async () => {
    const before = makeSpec({
      serverIds: ['serverA'],
    })
    const after = makeSpec({
      serverIds: ['serverB', 'serverA'],
      serversPatch: {
        serverA: { host: 'localhost.changed', protocol: 'amqp' },
      },
    })

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    const HOST_CHANGE_DIFF = {
      beforeValue: 'localhost',
      afterValue: 'localhost.changed',
      action: DiffAction.replace,
      afterDeclarationPaths: [['servers', 'serverA', 'host']],
      beforeDeclarationPaths: [['servers', 'serverA', 'host']],
    }
    const ADD_SERVER_DIFF = {
      afterDeclarationPaths: [['channels', 'myChannel', 'servers', 0]],
      action: DiffAction.add,
      afterValue: {
        host: 'remote.host',
        protocol: 'amqp',
      },
    }

    expect(diffs).toHaveLength(4)
    expect(diffs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ...ADD_SERVER_DIFF,
        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...ADD_SERVER_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
      expect.objectContaining({
        ...HOST_CHANGE_DIFF,
        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...HOST_CHANGE_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
    ]))
  })

  it('remove server, modify remaining server', async () => {
    const before = makeSpec({
      serverIds: ['serverB', 'serverA'],
    })
    const after = makeSpec({
      serverIds: ['serverA'],
      serversPatch: {
        serverA: { host: 'localhost.changed', protocol: 'amqp' },
      },
    })

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    const HOST_CHANGE_DIFF = {
      beforeValue: 'localhost',
      afterValue: 'localhost.changed',
      action: DiffAction.replace,
      afterDeclarationPaths: [['servers', 'serverA', 'host']],
      beforeDeclarationPaths: [['servers', 'serverA', 'host']],
    }
    const REMOVE_SERVER_DIFF = {
      beforeDeclarationPaths: [['channels', 'myChannel', 'servers', 0]],
      action: DiffAction.remove,
      beforeValue: {
        host: 'remote.host',
        protocol: 'amqp',
      },
    }

    expect(diffs).toHaveLength(4)
    expect(diffs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ...REMOVE_SERVER_DIFF,

        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...REMOVE_SERVER_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
      expect.objectContaining({
        ...HOST_CHANGE_DIFF,
        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...HOST_CHANGE_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
    ]))
  })
})

describe('operations mapped by key', () => {
  it('reordered operations produce no diffs', async () => {
    const before = makeSpec({ operationIds: ['opA', 'opB'] })
    const after = makeSpec({ operationIds: ['opA', 'opB'] })
    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    expect(diffs).toBeEmpty()
  })

  it('modified operation combined with changing operations order generates only replace diffs', async () => {
    const before = makeSpec({ operationIds: ['opA', 'opB'] })
    const after = makeSpec({ operationIds: ['opB', 'opA'] })

      ; (after as any).operations.opB.description = 'changed description'

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    expect(diffs).toHaveLength(1)
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        afterValue: "changed description",
        action: "add",
        afterDeclarationPaths: [
          [
            "operations",
            "opB",
            "description",
          ],
        ],
        scope: "send",
      }),
    ]))
  })

  it('add operation, modify existing operation', async () => {
    const before = makeSpec({ operationIds: ['opA'] })
    const after = makeSpec({ operationIds: ['opB', 'opA'] })

      ; (after as any).operations.opA.description = 'changed description'

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    expect(diffs).toHaveLength(2)
    expect(diffs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        afterDeclarationPaths: [['operations', 'opB']],
        action: DiffAction.add,
        scope: 'root',
      }),
      expect.objectContaining({
        afterValue: "changed description",
        action: "add",
        afterDeclarationPaths: [
          [
            "operations",
            "opA",
            "description",
          ],
        ],
        scope: "send",
      }),
    ]))
  })

  it('remove operation, modify remaining operation', async () => {
    const before = makeSpec({ operationIds: ['opB', 'opA'] })
    const after = makeSpec({ operationIds: ['opA'] })

      ; (after as any).operations.opA.description = 'changed description'

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    expect(diffs).toHaveLength(2)
    expect(diffs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        beforeDeclarationPaths: [['operations', 'opB']],
        action: DiffAction.remove,
        scope: 'root',
      }),
      expect.objectContaining({
        afterValue: "changed description",
        action: "add",
        afterDeclarationPaths: [
          [
            "operations",
            "opA",
            "description",
          ],
        ],
        scope: "send",
      }),
    ]))
  })
})
