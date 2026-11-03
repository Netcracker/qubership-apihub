import { describe, expect, test } from '@jest/globals'
import { changelogEditor, expectChangeCounts, expectSummariesMatchDiffs, LocalRegistry } from './helpers'

describe('Duplicate operations with different API kinds', () => {
  test.each([false, true])('reports only the owning document pair with reversed order %s', async (reverse) => {
    const folder = 'multi-document-api-kind'
    const packageId = `${folder}/${reverse ? 'reversed' : 'forward'}`
    // The smallest document slug owns the operation, regardless of file order.
    const names = ['a-no-bwc.yaml', 'b-bwc.yaml']
    if (reverse) names.reverse()
    const registry = LocalRegistry.openPackage(packageId)
    for (const version of ['v1', 'v2']) {
      await registry.publish(folder, {
        packageId,
        version,
        files: names.map(name => ({ fileId: `${version}/${name}` })),
      })
    }

    const result = await changelogEditor(packageId, registry).run()
    expectChangeCounts(result, { changes: { risky: 1 }, impacted: { risky: 1 } })
    expectSummariesMatchDiffs(result)
    const sharedChanges = result.comparisons.flatMap(comparison => comparison.data ?? [])
      .filter(change => change.operationId === 'items-get')
    expect(sharedChanges).toHaveLength(1)
  })
})
