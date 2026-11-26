import { annotation, apiDiff, type CompareOptions, DiffAction } from '../src'
import { parseAsyncApiAndAssertValid } from './helper/asyncapi'
import { diffsMatcher } from './helper/matchers'

describe('AsyncAPI compare scopes', () => {
  const compareOptions: CompareOptions = { unify: true }

  it('reports a referenced channel change in root and operation scopes', async () => {
    const before = {
      asyncapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      channels: {
        channel: { address: 'events', description: 'before' },
      },
      operations: {
        operation: {
          action: 'send',
          channel: { $ref: '#/channels/channel' },
        },
      },
    }
    const after = structuredClone(before)
    after.channels.channel.description = 'after'

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after, compareOptions)

    expect(diffs).toHaveLength(2) // direct root traversal and operation-scoped channel traversal
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: annotation,
        scope: 'root',
        beforeValue: 'before',
        afterValue: 'after',
        beforeDeclarationPaths: [['channels', 'channel', 'description']],
        afterDeclarationPaths: [['channels', 'channel', 'description']],
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        type: annotation,
        scope: 'send',
        beforeValue: 'before',
        afterValue: 'after',
        beforeDeclarationPaths: [['channels', 'channel', 'description']],
        afterDeclarationPaths: [['channels', 'channel', 'description']],
      }),
    ]))
  })
})
