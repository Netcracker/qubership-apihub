import { NODE_LEVEL_DIFF_KEY, NodeDescendantDiffs, NodeDiffs } from '@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface'
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { AbstractNodeDescendantsDiffsAggregator } from '../../src/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator'
import { AsyncApiNodeDescendantDiffsAggregatorKindBindings } from '../../src/building-service/async-api/tree-with-diffs/node-diffs-data/node-descendant-diffs/kind-bindings'
import { AsyncApiNodeDiffsAggregatorKindBindings } from '../../src/building-service/async-api/tree-with-diffs/node-diffs-data/node-diffs/kind-bindings'

class TestDescendantDiffsAggregator extends AbstractNodeDescendantsDiffsAggregator {
  public aggregate() {
    return undefined
  }

  public exposeWholeNodeDiff(
    diff: Parameters<AbstractNodeDescendantsDiffsAggregator['aggregateWholeNodeDiff']>[0],
    nodeDiffs: NodeDiffs<object | null>,
  ) {
    this.aggregateWholeNodeDiff(diff, nodeDiffs)
  }
}

describe('AsyncAPI BINDINGS section diffs', () => {
  const bindingsDiffsAggregator = new AsyncApiNodeDiffsAggregatorKindBindings()
  const descendantDiffsAggregator = new AsyncApiNodeDescendantDiffsAggregatorKindBindings()

  const TEST_DIFFS_META_KEY = Symbol('test-async-diffs-meta-key')
  const TEST_DIFF_META_KEYS = {
    diffsMetaKey: TEST_DIFFS_META_KEY,
    aggregatedDiffsMetaKey: Symbol('test-async-aggregated-diffs-meta-key'),
  }

  it('descendant binding add keeps section header visible on both sides', () => {
    const wholeNodeDiffHelper = new TestDescendantDiffsAggregator()
    const bindingNodeDiffs: NodeDiffs<object | null> = {}
    wholeNodeDiffHelper.exposeWholeNodeDiff({
      type: 'nonBreaking',
      action: DiffAction.add,
      scope: 'root',
      afterValue: {},
    }, bindingNodeDiffs)

    const descendantDiff = bindingNodeDiffs[NODE_LEVEL_DIFF_KEY]
    expect(descendantDiff?.styles.before.isHeaderVisible).toBe(true)
    expect(descendantDiff?.styles.after.isHeaderVisible).toBe(true)
  })

  it('partial binding add uses synthetic replace with header visible on both sides', () => {
    const crawlValue = {
      kafka: { protocol: 'kafka' },
      amqp: { protocol: 'amqp' },
    }

    const nodeDescendantDiffs: NodeDescendantDiffs = descendantDiffsAggregator.aggregate(
      {
        kafka: { protocol: 'kafka' },
        amqp: { protocol: 'amqp' },
        [TEST_DIFFS_META_KEY]: {
          amqp: {
            type: 'nonBreaking',
            action: DiffAction.add,
            scope: 'root',
            afterValue: { protocol: 'amqp' },
          },
        },
      },
      TEST_DIFF_META_KEYS,
      Symbol('bindings'),
    ) ?? {}

    const nodeDiffs = bindingsDiffsAggregator.aggregateByDescendantDiffs(
      crawlValue,
      {},
      nodeDescendantDiffs,
    )

    expect(nodeDiffs?.[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.replace)
    expect(nodeDiffs?.[NODE_LEVEL_DIFF_KEY]?.styles.before.isHeaderVisible).toBe(true)
    expect(nodeDiffs?.[NODE_LEVEL_DIFF_KEY]?.styles.after.isHeaderVisible).toBe(true)
  })
})
