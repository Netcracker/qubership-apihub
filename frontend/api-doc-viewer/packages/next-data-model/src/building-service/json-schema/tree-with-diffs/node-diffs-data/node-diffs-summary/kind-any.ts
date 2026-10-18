import { AbstractNodeDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-summary-aggregator"
import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys"
import { NodeDescendantDiffsSummary, NodeDiffs, NodeDiffsSummary } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaKindPropertyNodeDiffs } from "@apihub/next-data-model/model/json-schema/tree-with-diffs/property-row-diffs.types"
import { isChangedPropertyMetaData } from "@apihub/next-data-model/model/abstract/tree-with-diffs/changed-property-meta-data"

function addNestedDiffTypes(
  summary: NodeDescendantDiffsSummary,
  nestedDiffs: Partial<Record<string, unknown>> | undefined,
): void {
  for (const nestedDiff of Object.values(nestedDiffs ?? {})) {
    if (isChangedPropertyMetaData(nestedDiff)) {
      summary.add(nestedDiff.data.type)
    }
  }
}

export class JsonSchemaNodeDiffsSummaryKindAny extends AbstractNodeDiffsSummaryAggregator {
  public aggregate(
    nodeDiffs?: NodeDiffs,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    crawlValue?: object | boolean | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    diffsMetaKeys?: DiffMetaKeys,
  ): NodeDiffsSummary | undefined {
    const summary: NodeDescendantDiffsSummary = new Set()
    if (!nodeDiffs) {
      return summary
    }

    const propertyDiffs = nodeDiffs as JsonSchemaKindPropertyNodeDiffs
    for (const [key, diff] of Object.entries(nodeDiffs)) {
      if (!diff) {
        continue
      }

      if (key === "enumValueDiffs" || key === "examplesValueDiffs") {
        addNestedDiffTypes(summary, propertyDiffs[key])
        continue
      }

      if (key === "validationRowDiffs" || key === "validationRowColorizingDiffs") {
        addNestedDiffTypes(summary, propertyDiffs[key])
        continue
      }

      if (key === "validationRowValueDiffs") {
        for (const rowValueDiffs of Object.values(propertyDiffs.validationRowValueDiffs ?? {})) {
          addNestedDiffTypes(summary, rowValueDiffs)
        }
        continue
      }

      if (isChangedPropertyMetaData(diff)) {
        summary.add(diff.data.type)
      }
    }

    return summary
  }
}
