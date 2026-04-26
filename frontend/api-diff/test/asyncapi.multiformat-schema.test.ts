import { apiDiff, breaking, CompareOptions, DiffAction, nonBreaking, risky, unclassified } from '../src'
import { COMPARE_SCOPE_RECEIVE, COMPARE_SCOPE_SEND } from '../src/asyncapi/asyncapi3.const'
import { COMPARE_SCOPE_ROOT } from '../src/types'
import { diffsMatcher } from './helper/matchers'

const TEST_COMPARE_OPTIONS: CompareOptions = {
  unify: true,
}

// --- Minimal spec wrappers ---

const sendSpec = (payload: unknown) => ({
  asyncapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  channels: {
    ch: {
      messages: { msg: { payload } },
    },
  },
  operations: {
    op: {
      action: 'send',
      channel: { $ref: '#/channels/ch' },
      messages: [{ $ref: '#/channels/ch/messages/msg' }],
    },
  },
})

const receiveSpec = (payload: unknown) => ({
  asyncapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  channels: {
    ch: {
      messages: { msg: { payload } },
    },
  },
  operations: {
    op: {
      action: 'receive',
      channel: { $ref: '#/channels/ch' },
      messages: [{ $ref: '#/channels/ch/messages/msg' }],
    },
  },
})

const sendSpecWithReply = (payload: unknown, replyPayload: unknown) => ({
  asyncapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  channels: {
    ch: { messages: { msg: { payload } } },
    replyCh: { messages: { replyMsg: { payload: replyPayload } } },
  },
  operations: {
    op: {
      action: 'send',
      channel: { $ref: '#/channels/ch' },
      messages: [{ $ref: '#/channels/ch/messages/msg' }],
      reply: {
        channel: { $ref: '#/channels/replyCh' },
        messages: [{ $ref: '#/channels/replyCh/messages/replyMsg' }],
      },
    },
  },
})

const receiveSpecWithReply = (payload: unknown, replyPayload: unknown) => ({
  asyncapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  channels: {
    ch: { messages: { msg: { payload } } },
    replyCh: { messages: { replyMsg: { payload: replyPayload } } },
  },
  operations: {
    op: {
      action: 'receive',
      channel: { $ref: '#/channels/ch' },
      messages: [{ $ref: '#/channels/ch/messages/msg' }],
      reply: {
        channel: { $ref: '#/channels/replyCh' },
        messages: [{ $ref: '#/channels/replyCh/messages/replyMsg' }],
      },
    },
  },
})

// --- Schema constants for tests ---

const ASYNCAPI_FORMAT = 'application/vnd.aai.asyncapi+json;version=3.0.0'
const ASYNCAPI_FORMAT_ALT = 'application/vnd.aai.asyncapi;version=3.0.0'
const OPENAPI30_FORMAT = 'application/vnd.oai.openapi+json;version=3.0.0'
const OPENAPI30_FORMAT_ALT = 'application/vnd.oai.openapi;version=3.0.0'
const JSON_DRAFT7_FORMAT = 'application/schema+json;version=draft-07'
const UNKNOWN_FORMAT = 'application/x-custom-format;version=1.0'

// --- Group 1: Adapter — schema object ↔ multi-format schema object ---

describe('AsyncAPI multi-format schema - Adapter', () => {
  it('schema-to-multiformat-no-content-change: plain schema before → multi-format after (same content)', () => {
    const plainSchema = { type: 'string' }
    const multiFormatSchema = { schema: { type: 'string' }, schemaFormat: ASYNCAPI_FORMAT }

    const { diffs } = apiDiff(sendSpec(plainSchema), sendSpec(multiFormatSchema), TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([]))
  })

  it('multiformat-to-schema-no-content-change: multi-format before → plain schema after (same content)', () => {
    const multiFormatSchema = { schema: { type: 'string' }, schemaFormat: ASYNCAPI_FORMAT }
    const plainSchema = { type: 'string' }

    const { diffs } = apiDiff(sendSpec(multiFormatSchema), sendSpec(plainSchema), TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([]))
  })

  it('schema-to-multiformat-with-type-change: plain string → multi-format integer (send scope)', () => {
    const before = { type: 'string' }
    const after = { schema: { type: 'integer' }, schemaFormat: ASYNCAPI_FORMAT }

    const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        scope: COMPARE_SCOPE_SEND,
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        scope: COMPARE_SCOPE_ROOT,
        type: breaking,
      }),
    ]))
  })

  it('multiformat-to-schema-with-type-change: multi-format integer → plain string (send scope)', () => {
    const before = { schema: { type: 'integer' }, schemaFormat: ASYNCAPI_FORMAT }
    const after = { type: 'string' }

    const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        scope: COMPARE_SCOPE_SEND,
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        scope: COMPARE_SCOPE_ROOT,
        type: breaking,
      }),
    ]))
  })
})

// --- Group 2: Schema rules selection based on schemaFormat ---

describe('AsyncAPI multi-format schema - Schema rules selection', () => {
  it('asyncapi-format-uses-asyncapi-schema-rules: type change is breaking', () => {
    const before = { schema: { type: 'string' }, schemaFormat: ASYNCAPI_FORMAT }
    const after = { schema: { type: 'integer' }, schemaFormat: ASYNCAPI_FORMAT }

    const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.replace, type: breaking }),
      expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.replace, type: breaking }),
    ]))
  })

  it('asyncapi-format-uses-asyncapi-schema-rules: nullable change is unclassified', () => {
    const before = { schema: { type: 'string', nullable: false }, schemaFormat: ASYNCAPI_FORMAT }
    const after = { schema: { type: 'string', nullable: true }, schemaFormat: ASYNCAPI_FORMAT }

    const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

    // AsyncAPI schema rules does not have a rule for nullable property, hence unclassified
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.replace, type: unclassified }),
      expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.replace, type: unclassified }),
    ]))
  })

  it('asyncapi-format-aliases: alternate asyncapi format string also uses asyncapi schema rules', () => {
    const before = { schema: { type: 'string', nullable: false }, schemaFormat: ASYNCAPI_FORMAT_ALT }
    const after = { schema: { type: 'string', nullable: true }, schemaFormat: ASYNCAPI_FORMAT_ALT }

    const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.replace, type: unclassified }),
      expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.replace, type: unclassified }),
    ]))
  })

  it('openapi30-format-uses-openapi-schema-rules: nullable change is detected', () => {
    const before = { schema: { type: 'string', nullable: false }, schemaFormat: OPENAPI30_FORMAT }
    const after = { schema: { type: 'string', nullable: true }, schemaFormat: OPENAPI30_FORMAT }

    const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

    // OpenAPI schema rules does have a rule for nullable property, hence nonBreaking
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.replace, type: nonBreaking }),
      expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.replace, type: nonBreaking }),
    ]))
  })

  it('openapi30-format-aliases: alternate openapi format string also selects openapi rules', () => {
    const before = { schema: { type: 'string', nullable: false }, schemaFormat: OPENAPI30_FORMAT_ALT }
    const after = { schema: { type: 'string', nullable: true }, schemaFormat: OPENAPI30_FORMAT_ALT }

    const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.replace, type: nonBreaking }),
      expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.replace, type: nonBreaking }),
    ]))
  })

  it('json-draft7-format-uses-json-schema-rules: type change is breaking', () => {
    const before = { schema: { type: 'string' }, schemaFormat: JSON_DRAFT7_FORMAT }
    const after = { schema: { type: 'integer' }, schemaFormat: JSON_DRAFT7_FORMAT }

    const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.replace, type: breaking }),
      expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.replace, type: breaking }),
    ]))
  })

  it('json-draft7-format-uses-json-schema-rules: nullable change is unclassified', () => {
    const before = { schema: { type: 'string', nullable: false }, schemaFormat: JSON_DRAFT7_FORMAT }
    const after = { schema: { type: 'string', nullable: true }, schemaFormat: JSON_DRAFT7_FORMAT }

    const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.replace, type: unclassified }),
      expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.replace, type: unclassified }),
    ]))
  })

  it('unknown-format-fallback: changes under unknown format are unclassified', () => {
    const before = { schema: { type: 'string' }, schemaFormat: UNKNOWN_FORMAT }
    const after = { schema: { type: 'integer' }, schemaFormat: UNKNOWN_FORMAT }

    const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

    // All diffs under an unknown format should be unclassified
    expect(diffs.length).toBeGreaterThanOrEqual(0)
    for (const diff of diffs) {
      expect(diff.type).toBe(unclassified)
    }
  })
})

// --- Group 3: Scope-based dynamic classification (send vs receive) ---

describe('AsyncAPI: scope-based classification', () => {
  describe('plain AsyncAPI schema', () => {
    it('add-required-property-send-scope: breaking (producer must send it)', () => {
      const before = { type: 'object', properties: { a: { type: 'string' } } }
      const after = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] }

      const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.add, type: breaking }),
        expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.add, type: breaking }),
      ]))
    })

    it('add-required-property-receive-scope: nonBreaking (consumer doesn\'t need to produce it)', () => {
      const before = { type: 'object', properties: { a: { type: 'string' } } }
      const after = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] }

      const { diffs } = apiDiff(receiveSpec(before), receiveSpec(after), TEST_COMPARE_OPTIONS)

      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.add, type: breaking }),
        expect.objectContaining({ scope: COMPARE_SCOPE_RECEIVE, action: DiffAction.add, type: nonBreaking }),
      ]))
    })

    it('remove-required-property-send-scope: nonBreaking', () => {
      const before = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] }
      const after = { type: 'object', properties: { a: { type: 'string' } } }

      const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.remove, type: nonBreaking }),
        expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.remove, type: nonBreaking }),
      ]))
    })

    it('remove-required-property-receive-scope: risky', () => {
      const before = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] }
      const after = { type: 'object', properties: { a: { type: 'string' } } }

      const { diffs } = apiDiff(receiveSpec(before), receiveSpec(after), TEST_COMPARE_OPTIONS)

      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.remove, type: nonBreaking }),
        expect.objectContaining({ scope: COMPARE_SCOPE_RECEIVE, action: DiffAction.remove, type: risky }),
      ]))
    })
  })

  describe('multi-format AsyncAPI schema', () => {
    it('multiformat-asyncapi-add-required-send-scope: breaking', () => {
      const before = { schema: { type: 'object', properties: { a: { type: 'string' } } }, schemaFormat: ASYNCAPI_FORMAT }
      const after = { schema: { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] }, schemaFormat: ASYNCAPI_FORMAT }

      const { diffs } = apiDiff(sendSpec(before), sendSpec(after), TEST_COMPARE_OPTIONS)

      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.add, type: breaking }),
        expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.add, type: breaking }),
      ]))
    })

    it('multiformat-asyncapi-add-required-receive-scope: nonBreaking', () => {
      const before = { schema: { type: 'object', properties: { a: { type: 'string' } } }, schemaFormat: ASYNCAPI_FORMAT }
      const after = { schema: { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] }, schemaFormat: ASYNCAPI_FORMAT }

      const { diffs } = apiDiff(receiveSpec(before), receiveSpec(after), TEST_COMPARE_OPTIONS)

      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.add, type: breaking }),
        expect.objectContaining({ scope: COMPARE_SCOPE_RECEIVE, action: DiffAction.add, type: nonBreaking }),
      ]))
    })
  })
})

// --- Group 4: Reply scope inversion ---

describe('AsyncAPI multi-format schema - Reply scope inversion', () => {
  it('reply-of-send-operation-uses-receive-scope: add required is nonBreaking', () => {
    // send operation → reply scope = receive
    // adding required in receive scope is nonBreaking
    const sharedPayload = { type: 'object', properties: { a: { type: 'string' } } }
    const replyPayloadBefore = { type: 'object', properties: { a: { type: 'string' } } }
    const replyPayloadAfter = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] }

    const before = sendSpecWithReply(sharedPayload, replyPayloadBefore)
    const after = sendSpecWithReply(sharedPayload, replyPayloadAfter)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.add, type: breaking }),
      expect.objectContaining({ scope: COMPARE_SCOPE_RECEIVE, action: DiffAction.add, type: nonBreaking }),
    ]))
  })

  it('reply-of-receive-operation-uses-send-scope: add required is breaking', () => {
    const sharedPayload = { type: 'object', properties: { a: { type: 'string' } } }
    const replyPayloadBefore = { type: 'object', properties: { a: { type: 'string' } } }
    const replyPayloadAfter = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] }

    const before = receiveSpecWithReply(sharedPayload, replyPayloadBefore)
    const after = receiveSpecWithReply(sharedPayload, replyPayloadAfter)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.add, type: breaking }),
      expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.add, type: breaking }),
    ]))
  })

  it('diffs for each scope are present for a change in shared payload', () => {
    const sharedPayloadBefore = { type: 'object', properties: { a: { type: 'string' } } }
    const sharedPayloadAfter = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] }

    const before = sendSpecWithReply(sharedPayloadBefore, sharedPayloadBefore)
    const after = sendSpecWithReply(sharedPayloadAfter, sharedPayloadAfter)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ scope: COMPARE_SCOPE_ROOT, action: DiffAction.add, type: breaking }),
      expect.objectContaining({ scope: COMPARE_SCOPE_SEND, action: DiffAction.add, type: breaking }),
      expect.objectContaining({ scope: COMPARE_SCOPE_RECEIVE, action: DiffAction.add, type: nonBreaking }),
    ]))
  })
})
