import { AbstractNodeDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-summary-aggregator";
import { NodeDescendantDiffsSummary, NodeDiffs, NodeDiffsSummary } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { isChangedPropertyMetaData } from "@apihub/next-data-model/shared/ddlapi/guards/property-row-diffs";
import { DdlApiColumnPropertyRowDiffs } from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs.types";

export class DdlApiNodeDiffsSummaryKindAny extends AbstractNodeDiffsSummaryAggregator {
  public aggregate(
    nodeDiffs?: NodeDiffs,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    crawlValue?: object | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    diffsMetaKeys?: DiffMetaKeys,
  ): NodeDiffsSummary | undefined {
    const summary: NodeDescendantDiffsSummary = new Set();
    if (!nodeDiffs) {
      return summary;
    }

    for (const [key, diff] of Object.entries(nodeDiffs)) {
      if (!diff) {
        continue
      }

      if (key === 'foreignKeyTargetDiffs') {
        for (const targetDiff of Object.values((nodeDiffs as DdlApiColumnPropertyRowDiffs).foreignKeyTargetDiffs ?? {})) {
          if (isChangedPropertyMetaData(targetDiff)) {
            summary.add(targetDiff.data.type)
          }
        }
        continue
      }

      if (key === 'enumValueDiffs') {
        for (const enumValueDiff of Object.values((nodeDiffs as DdlApiColumnPropertyRowDiffs).enumValueDiffs ?? {})) {
          if (isChangedPropertyMetaData(enumValueDiff)) {
            summary.add(enumValueDiff.data.type)
          }
        }
        continue
      }

      if (isChangedPropertyMetaData(diff)) {
        summary.add(diff.data.type)
      }
    }

    return summary;
  }
}
