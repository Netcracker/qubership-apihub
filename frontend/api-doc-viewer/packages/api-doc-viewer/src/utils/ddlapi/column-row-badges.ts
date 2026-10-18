import { ColumnRowBadgesFlagDiffs } from "@apihub/components/DdlTableViewer/ColumnRowBadges/types"
import {
  DdlApiRowDiffs,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { DdlApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import { isColumnNodeWithDiffs, isIndexNodeWithDiffs } from "./node-type-checkers"

export function takeColumnForeignKeyTargetDiffs(
  node: DdlApiTreeNodeWithDiffs,
) {
  if (!isColumnNodeWithDiffs(node)) {
    return undefined
  }
  return DdlApiRowDiffs.ForeignKey.takeTargetDiffs(node)
}

export function takeColumnFlagDiffs(
  node: DdlApiTreeNodeWithDiffs,
): ColumnRowBadgesFlagDiffs | undefined {
  if (!isColumnNodeWithDiffs(node)) {
    return undefined
  }
  return DdlApiRowDiffs.Column.takeFlagDiffs(node)
}

export function takeIndexFlagDiffs(
  node: DdlApiTreeNodeWithDiffs,
): ColumnRowBadgesFlagDiffs | undefined {
  if (!isIndexNodeWithDiffs(node)) {
    return undefined
  }
  return DdlApiRowDiffs.Index.takeFlagDiffs(node)
}
