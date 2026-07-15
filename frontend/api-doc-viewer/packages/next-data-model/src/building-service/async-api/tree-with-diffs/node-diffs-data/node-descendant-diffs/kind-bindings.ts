import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AbstractNodeDescendantsDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator";
import { NODE_LEVEL_DIFF_KEY, NodeDescendantDiffs, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { getValueByPath, takeIfDiffsRecord } from "@apihub/next-data-model/utilities";

export class AsyncApiNodeDescendantDiffsAggregatorKindBindings extends AbstractNodeDescendantsDiffsAggregator {
  public override aggregate(
    value: object | null,
    diffsMetaKeys: DiffMetaKeys,
    referenceNamePropertyKey: symbol
  ): NodeDescendantDiffs | undefined {
    if (!value) {
      return undefined
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { diffsMetaKey } = diffsMetaKeys

    const diffsBindings = takeIfDiffsRecord(
      getValueByPath(value, [diffsMetaKey], referenceNamePropertyKey),
    )
    if (!diffsBindings) {
      return undefined
    }
    const nodeDescendantDiffs: NodeDescendantDiffs = {}
    let somethingChanged = false
    for (const bindingKey of Object.keys(value)) {
      const nodeDiffs: NodeDiffs<object | null> = {}
      const diffBinding = diffsBindings[bindingKey]
      if (!diffBinding) {
        continue
      }
      somethingChanged = true
      this.aggregateWholeNodeDiff<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null>(diffBinding, nodeDiffs)
      nodeDescendantDiffs[bindingKey] = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    }

    return somethingChanged ? nodeDescendantDiffs : undefined;
  }
}