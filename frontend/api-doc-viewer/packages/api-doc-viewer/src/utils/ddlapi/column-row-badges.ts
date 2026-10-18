import { ColumnRowBadgesFlagDiffs } from "@apihub/components/DdlTableViewer/ColumnRowBadges/types"
import {
  takeColumnFlagDiffs as takeColumnFlagDiffsFromModel,
  takeColumnForeignKeyTargetDiffs as takeColumnForeignKeyTargetDiffsFromModel,
  takeIndexFlagDiffs as takeIndexFlagDiffsFromModel,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { DdlApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import { isColumnNodeWithDiffs, isIndexNodeWithDiffs } from "./node-type-checkers"

export function takeColumnForeignKeyTargetDiffs(
  node: DdlApiTreeNodeWithDiffs,
) {
  if (!isColumnNodeWithDiffs(node)) {
    return undefined
  }
  return takeColumnForeignKeyTargetDiffsFromModel(node)
}

export function takeColumnFlagDiffs(
  node: DdlApiTreeNodeWithDiffs,
): ColumnRowBadgesFlagDiffs | undefined {
  if (!isColumnNodeWithDiffs(node)) {
    return undefined
  }
  return takeColumnFlagDiffsFromModel(node)
}

export function takeIndexFlagDiffs(
  node: DdlApiTreeNodeWithDiffs,
): ColumnRowBadgesFlagDiffs | undefined {
  if (!isIndexNodeWithDiffs(node)) {
    return undefined
  }
  return takeIndexFlagDiffsFromModel(node)
}
