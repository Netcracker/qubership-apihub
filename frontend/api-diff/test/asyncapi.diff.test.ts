import { apiDiff, breaking, CompareOptions, DiffAction, nonBreaking } from '../src'
import { parseAsyncApiAndAssertValid } from './helper/asyncapi'
import { diffsMatcher } from './helper/matchers'

const TEST_COMPARE_OPTIONS: CompareOptions = {
  unify: true,
}

const minimalChannel = {
  ch: {
    messages: { msg: { payload: { type: 'string' } } },
  },
}

const operation = (operationId: string, action: 'send' | 'receive') => ({
  [operationId]: {
    action,
    channel: { $ref: '#/channels/ch' },
    messages: [{ $ref: '#/channels/ch/messages/msg' }],
  },
})

describe('AsyncAPI diff — whole operations', () => {
  it('classifies adding a send operation as non-breaking', async () => {
    const before = {
      asyncapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      channels: minimalChannel,
      operations: operation('op1', 'send'),
    }
    const after = {
      asyncapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      channels: minimalChannel,
      operations: {
        ...operation('op1', 'send'),
        ...operation('op2', 'send'),
      },
    }

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs.length).toBe(1)
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterDeclarationPaths: [['operations', 'op2']],
      }),
    ]))
  })

  it('classifies adding a receive operation as non-breaking', async () => {
    const before = {
      asyncapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      channels: minimalChannel,
      operations: operation('op1', 'send'),
    }
    const after = {
      asyncapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      channels: minimalChannel,
      operations: {
        ...operation('op1', 'send'),
        ...operation('op2', 'receive'),
      },
    }

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs.length).toBe(1)
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterDeclarationPaths: [['operations', 'op2']],
      }),
    ]))
  })
})

describe('AsyncAPI diff — combiner matching by ref origin', () => {
  // SchemaA holds `type: string` and SchemaB holds `type: integer` in before.
  // After swaps their content: SchemaA → integer, SchemaB → string.
  // Without ref-based matching, content similarity would pair string↔string and
  // integer↔integer, producing 0 diffs — an incorrect result.
  // With ref-based matching, SchemaA is paired with SchemaA and SchemaB with SchemaB,
  // correctly reporting a breaking type change inside each named component.

  const makeSpec = (
    schemaAType: string,
    schemaBType: string,
    oneOfRefs = ['#/components/schemas/SchemaA', '#/components/schemas/SchemaB'],
  ) => ({
    asyncapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    channels: {
      myChannel: {
        messages: {
          myMessage: {
            payload: {
              oneOf: oneOfRefs.map($ref => ({ $ref })),
            },
          },
        },
      },
    },
    operations: {
      op1: {
        action: 'send' as const,
        channel: { $ref: '#/channels/myChannel' },
        messages: [{ $ref: '#/channels/myChannel/messages/myMessage' }],
      },
    },
    components: {
      schemas: {
        SchemaA: { type: schemaAType },
        SchemaB: { type: schemaBType },
      },
    },
  })

  const skipScopes = new Set(['components', 'root'])

  it('detects type swap in oneOf message payload branches referenced by name', async () => {
    const before = makeSpec('string', 'integer')
    const after = makeSpec('integer', 'string')

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    // Skip 'components' and 'root' scopes — they duplicate the send-scoped diffs
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: breaking,
        beforeValue: 'string',
        afterValue: 'integer',
        beforeDeclarationPaths: [['components', 'schemas', 'SchemaA', 'type']],
        afterDeclarationPaths: [['components', 'schemas', 'SchemaA', 'type']],
        scope: 'send',
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        type: breaking,
        beforeValue: 'integer',
        afterValue: 'string',
        beforeDeclarationPaths: [['components', 'schemas', 'SchemaB', 'type']],
        afterDeclarationPaths: [['components', 'schemas', 'SchemaB', 'type']],
        scope: 'send',
      }),
    ], skipScopes))
  })

  it('keeps ref-origin matching when after oneOf message payload branches are reordered', async () => {
    const before = makeSpec('string', 'integer')
    const after = makeSpec('integer', 'string', [
      '#/components/schemas/SchemaB',
      '#/components/schemas/SchemaA',
    ])

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: breaking,
        beforeValue: 'string',
        afterValue: 'integer',
        beforeDeclarationPaths: [['components', 'schemas', 'SchemaA', 'type']],
        afterDeclarationPaths: [['components', 'schemas', 'SchemaA', 'type']],
        scope: 'send',
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        type: breaking,
        beforeValue: 'integer',
        afterValue: 'string',
        beforeDeclarationPaths: [['components', 'schemas', 'SchemaB', 'type']],
        afterDeclarationPaths: [['components', 'schemas', 'SchemaB', 'type']],
        scope: 'send',
      }),
    ], skipScopes))
  })
})
