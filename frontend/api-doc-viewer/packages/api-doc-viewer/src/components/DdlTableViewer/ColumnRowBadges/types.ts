import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { DdlApiForeignKeyTarget } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-value"
import { DdlApiForeignKeyTargetDiffs } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"

export type ColumnRowBadgesValue = {
  isPrimaryKey?: boolean
  isUnique?: boolean
  isNotNull?: boolean
  isGenerated?: boolean
  isForeignKey?: boolean
  foreignKeyTargets?: readonly DdlApiForeignKeyTarget[]
}

export type ColumnRowBadgesFlagDiffs = {
  isPrimaryKey?: ChangedPropertyMetaData
  isUnique?: ChangedPropertyMetaData
  isNotNull?: ChangedPropertyMetaData
  isGenerated?: ChangedPropertyMetaData
}

export type ColumnRowBadgesProps = {
  columnId: string
  value: ColumnRowBadgesValue
  flagDiffs?: ColumnRowBadgesFlagDiffs
  foreignKeyTargetDiffs?: DdlApiForeignKeyTargetDiffs
}

export type ColumnRowBadgesContentProps = ColumnRowBadgesProps & {
  layoutSide: LayoutSide
}
