import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AbstractNodeDescendantsDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator";
import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import {
  NODE_LEVEL_DIFF_KEY,
  NodeDescendantDiffs,
  NodeDiffs,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DdlApiTableRowValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { resolveDdlApiIndexDescendantDiffKey } from "@apihub/next-data-model/shared/ddlapi/index-title";
import { isObject } from "@apihub/next-data-model/utilities";
import { isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff";

type DdlApiTableOrientedCrawlSections = {
  readonly columns?: {
    readonly items?: readonly { readonly columnName?: string }[]
  }
  readonly indexes?: {
    readonly items?: readonly { readonly indexName?: string }[]
  }
}

export class DdlApiNodeDescendantDiffsAggregatorKindTable extends AbstractNodeDescendantsDiffsAggregator {
  public aggregate(
    value: object | null,
    diffsMetaKeys: DiffMetaKeys,
  ): NodeDescendantDiffs | undefined {
    if (!isObject(value)) {
      return undefined
    }

    const { diffsMetaKey } = diffsMetaKeys
    const tableDiffsRecord = Reflect.get(value, diffsMetaKey)
    if (!isObject(tableDiffsRecord)) {
      return undefined
    }

    const wholeTableDiff = Reflect.get(tableDiffsRecord, NODE_LEVEL_DIFF_KEY)
    if (
      !AbstractNodeDiffsAggregator.isDiff(wholeTableDiff)
      || (!isDiffAdd(wholeTableDiff) && !isDiffRemove(wholeTableDiff))
    ) {
      return undefined
    }

    const nodeDiffs: NodeDiffs<DdlApiTableRowValue | null> = {}
    this.aggregateWholeNodeDiff(wholeTableDiff, nodeDiffs)
    const inheritedWholeTableDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (!inheritedWholeTableDiff) {
      return undefined
    }

    const nodeDescendantDiffs: NodeDescendantDiffs = {
      columns: inheritedWholeTableDiff,
      indexes: inheritedWholeTableDiff,
    }

    const sections = value as DdlApiTableOrientedCrawlSections
    for (const columnRow of sections.columns?.items ?? []) {
      if (typeof columnRow.columnName === 'string' && columnRow.columnName.length > 0) {
        nodeDescendantDiffs[columnRow.columnName] = inheritedWholeTableDiff
      }
    }

    sections.indexes?.items?.forEach((indexRow, arrayIndex) => {
      const indexKey = resolveDdlApiIndexDescendantDiffKey(arrayIndex, indexRow, indexRow.indexName)
      nodeDescendantDiffs[indexKey] = inheritedWholeTableDiff
    })

    return nodeDescendantDiffs
  }
}
