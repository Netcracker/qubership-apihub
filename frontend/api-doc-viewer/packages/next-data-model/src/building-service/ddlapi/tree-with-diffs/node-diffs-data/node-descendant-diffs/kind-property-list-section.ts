import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AbstractNodeDescendantsDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator";
import {
  NODE_LEVEL_DIFF_KEY,
  NodeDescendantDiffs,
  NodeDiffs,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { isObject } from "@apihub/next-data-model/utilities";
import {
  applyDdlPropertyListItemWholeNodeHeaderVisibility,
  DdlApiPropertyListSectionItemRow,
  takeDdlPropertyListSectionItems,
  takeWholeNodeDiffFromItemRow,
} from "../shared/property-list-section-diff-utils";
import { DdlApiNodeDescendantDiffsAggregatorKindAny } from "./kind-any";

export type ResolveDdlPropertyListSectionItemKey = (
  arrayIndex: number,
  itemRow: DdlApiPropertyListSectionItemRow,
) => string | undefined

export class DdlApiNodeDescendantDiffsAggregatorKindPropertyListSection
  extends AbstractNodeDescendantsDiffsAggregator {
  private readonly kindAnyAggregator = new DdlApiNodeDescendantDiffsAggregatorKindAny()

  constructor(
    private readonly resolveItemKey: ResolveDdlPropertyListSectionItemKey,
  ) {
    super()
  }

  public aggregate(
    crawlValue: object | null,
    diffsMetaKeys: DiffMetaKeys,
  ): NodeDescendantDiffs | undefined {
    const nodeDescendantDiffs: NodeDescendantDiffs = {
      ...this.kindAnyAggregator.aggregate(crawlValue, diffsMetaKeys) ?? {},
    }

    const { diffsMetaKey } = diffsMetaKeys
    takeDdlPropertyListSectionItems(crawlValue).forEach((itemRow, arrayIndex) => {
      if (!isObject(itemRow)) {
        return
      }

      const itemKey = this.resolveItemKey(arrayIndex, itemRow)
      if (!itemKey || itemKey in nodeDescendantDiffs) {
        return
      }

      const wholeNodeDiff = takeWholeNodeDiffFromItemRow(itemRow, diffsMetaKey)
      if (!wholeNodeDiff) {
        return
      }

      const nodeDiffs: NodeDiffs<DdlApiTreeNodeValue | null> = {}
      this.aggregateWholeNodeDiff(wholeNodeDiff, nodeDiffs)
      const descendantDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
      if (descendantDiff) {
        nodeDescendantDiffs[itemKey] = applyDdlPropertyListItemWholeNodeHeaderVisibility(descendantDiff)
      }
    })

    return Object.keys(nodeDescendantDiffs).length > 0 ? nodeDescendantDiffs : undefined
  }
}
