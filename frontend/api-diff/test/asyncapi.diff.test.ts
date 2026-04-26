import { apiDiff, CompareOptions, DiffAction, nonBreaking } from '../src'
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
