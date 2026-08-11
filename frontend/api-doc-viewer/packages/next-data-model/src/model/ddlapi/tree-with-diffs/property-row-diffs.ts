import { hasDdlPropertyTitleRowDiff } from "../../../shared/ddlapi/guards/property-row-diffs"
import { formatDefaultValueDisplayString, formatDefaultValueForDisplay } from "../../../shared/ddlapi/format-ddl-expr"
import { formatForeignKeyTargetKey } from "../../../shared/ddlapi/foreign-key-target-key"
import { isObject } from "../../../utilities"
import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { Expr } from "@netcracker/qubership-apihub-ddlapi"
import {
  LayoutSide,
  ORIGIN_LAYOUT_SIDE,
} from "../../abstract/layout-side"
import {
  ChangedPropertyMetaData,
  DiffHighlightingApplicationMode,
  DiffHiglightingApplicationArea,
  NODE_LEVEL_DIFF_KEY,
} from "../../abstract/tree-with-diffs/tree-node.interface"
import { DdlApiTreeNodeWithDiffs } from "../types/aliases"
import { DdlApiTreeNodeKinds } from "../types/node-kind"
import { resolveListSideItems } from "./list-side-display"
import {
  DDL_COLUMN_FLAG_DIFF_KEYS,
  DDL_INDEX_FLAG_DIFF_KEYS,
  DDL_PROPERTY_TITLE_ROW_DIFF_KEY,
  type DdlApiColumnFlagDiffKey,
  type DdlApiColumnPropertyRowDiffs,
  type DdlApiEnumValueDiffs,
  type DdlApiForeignKeyTargetDiffs,
  type DdlApiIndexFlagDiffKey,
} from "./property-row-diffs.types"

export type {
  DdlApiColumnFlagDiffKey,
  DdlApiColumnPropertyRowDiffs,
  DdlApiColumnTypeFieldDiffKey,
  DdlApiColumnTypeFieldDiffs,
  DdlApiEnumValueDiffs,
  DdlApiForeignKeyTargetDiffs,
  DdlApiIndexFlagDiffKey,
  DdlApiIndexPartNameDiffs,
  DdlApiIndexPropertyRowDiffs,
  DdlApiPropertyRowValue,
  DdlApiTablePropertyRowDiffs,
} from "./property-row-diffs.types"

export {
  DDL_COLUMN_FLAG_DIFF_KEYS,
  DDL_COLUMN_TYPE_FIELD_DIFF_KEYS,
  DDL_INDEX_FLAG_DIFF_KEYS,
  DDL_PROPERTY_TITLE_ROW_DIFF_KEY
} from "./property-row-diffs.types"

export {
  takeColumnTypeFieldDiffs,
  resolveColumnTypeLabelSideDisplay,
} from "./column-type-label-diffs"
export type {
  DdlColumnTypeLabelSideDisplay,
  DdlColumnTypeLabelSideSegment,
} from "./column-type-label-diffs"

export {
  takeIndexPartNameDiffs,
  resolveIndexPartNamesSideDisplay,
} from "./index-part-name-diffs"
export type {
  DdlIndexPartNamesSideDisplay,
} from "./index-part-name-diffs"

export { isNamedIndexTitle, DDL_UNNAMED_INDEX_TITLE } from "../../../shared/ddlapi/index-title"

export type {
  DdlCommaSeparatedListParenthesesStyle,
  DdlListSideItem,
  DdlListSideSegment,
} from "./list-side-display"

export { formatForeignKeyTargetKey } from "../../../shared/ddlapi/foreign-key-target-key"

export type DdlApiPropertyNodeWithDiffs =
  | DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>
  | DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>

export type DdlApiTableHeaderNodeWithDiffs =
  DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.TABLE>

export function takeDdlTableTitleRowDiff(
  node: DdlApiTableHeaderNodeWithDiffs,
) {
  if (!hasDdlPropertyTitleRowDiff(node.diffs)) {
    return undefined
  }
  return node.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]
}

export function takeDdlTableNodeDiffIfPresent(
  node: DdlApiTableHeaderNodeWithDiffs,
) {
  const diff = node.diffs[NODE_LEVEL_DIFF_KEY]
  if (!diff) {
    return undefined
  }
  if (isDiffAdd(diff.data) || isDiffRemove(diff.data)) {
    return diff
  }
  return undefined
}

export function takeTableSchemaNameDiff(
  node: DdlApiTableHeaderNodeWithDiffs,
): ChangedPropertyMetaData | undefined {
  return node.diffs.schemaName
}

export function takeTableDescriptionDiff(
  node: DdlApiTableHeaderNodeWithDiffs,
): ChangedPropertyMetaData | undefined {
  return node.diffs.description
}

export function resolveTableSchemaNameSideDisplay(
  node: DdlApiTableHeaderNodeWithDiffs,
  layoutSide: LayoutSide,
): string {
  const mergedSchemaName = node.value()?.schemaName ?? ''
  const schemaNameDiff = takeTableSchemaNameDiff(node)
  if (!schemaNameDiff) {
    return mergedSchemaName
  }

  const diff = schemaNameDiff.data
  const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE

  if (isDiffAdd(diff)) {
    return isOrigin ? '' : mergedSchemaName
  }
  if (isDiffRemove(diff)) {
    return isOrigin ? mergedSchemaName : ''
  }
  if (isDiffReplace(diff)) {
    if (isOrigin) {
      return typeof diff.beforeValue === 'string' ? diff.beforeValue : mergedSchemaName
    }
    return typeof diff.afterValue === 'string' ? diff.afterValue : mergedSchemaName
  }

  return mergedSchemaName
}

export function takeDdlPropertyTitleRowDiff(
  node: DdlApiPropertyNodeWithDiffs,
) {
  if (!hasDdlPropertyTitleRowDiff(node.diffs)) {
    return undefined
  }
  return node.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]
}

export function takeDdlPropertyNodeDiffIfPresent(
  node: DdlApiPropertyNodeWithDiffs,
) {
  const diff = node.diffs[NODE_LEVEL_DIFF_KEY]
  if (!diff) {
    return undefined
  }
  if (isDiffAdd(diff.data) || isDiffRemove(diff.data)) {
    return diff
  }
  return undefined
}

export function isDdlPropertySubheaderVisible(
  nodeLevelDiff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): boolean {
  if (!nodeLevelDiff) {
    return true
  }

  const styles = layoutSide === ORIGIN_LAYOUT_SIDE
    ? nodeLevelDiff.styles.before
    : nodeLevelDiff.styles.after

  return styles.isHeaderVisible
}

export function isDdlPropertyRowContentVisible(
  nodeLevelDiff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): boolean {
  if (!nodeLevelDiff) {
    return true
  }

  const styles = layoutSide === ORIGIN_LAYOUT_SIDE
    ? nodeLevelDiff.styles.before
    : nodeLevelDiff.styles.after

  return styles.isContentVisible
}

export type DdlApiPropertyListSectionNodeWithDiffs =
  | DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMNS>
  | DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEXES>

export function isDdlPropertyListSectionUniformWholeNodeChange(
  node: DdlApiPropertyListSectionNodeWithDiffs,
): boolean {
  const diff = node.diffs[NODE_LEVEL_DIFF_KEY]
  if (!diff) {
    return false
  }
  return isDiffAdd(diff.data) || isDiffRemove(diff.data)
}

export function takeColumnForeignKeyTargetDiffs(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
): DdlApiForeignKeyTargetDiffs | undefined {
  const columnDiffs = node.diffs as DdlApiColumnPropertyRowDiffs
  const targetDiffs = columnDiffs.foreignKeyTargetDiffs
  if (!targetDiffs || Object.keys(targetDiffs).length === 0) {
    return undefined
  }
  return targetDiffs
}

export function takeColumnForeignKeyTargetDiff(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  target: { readonly schemaName: string; readonly tableName: string; readonly columnName: string },
): ChangedPropertyMetaData | undefined {
  return takeColumnForeignKeyTargetDiffs(node)?.[formatForeignKeyTargetKey(target)]
}

export function takeColumnFlagDiffs(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
): Partial<Record<DdlApiColumnFlagDiffKey, ChangedPropertyMetaData>> | undefined {
  const flagDiffs: Partial<Record<DdlApiColumnFlagDiffKey, ChangedPropertyMetaData>> = {}
  let hasDiff = false
  for (const key of DDL_COLUMN_FLAG_DIFF_KEYS) {
    const diff = node.diffs[key]
    if (diff) {
      flagDiffs[key] = diff
      hasDiff = true
    }
  }
  return hasDiff ? flagDiffs : undefined
}

export function takeColumnGeneratedExpressionDiff(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
): ChangedPropertyMetaData | undefined {
  return node.diffs.generatedExpression
}

export function takeColumnDescriptionDiff(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
): ChangedPropertyMetaData | undefined {
  return node.diffs.description
}

export function takeIndexDescriptionDiff(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>,
): ChangedPropertyMetaData | undefined {
  return node.diffs.description
}

export function takeColumnEnumValueDiffs(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
): DdlApiEnumValueDiffs | undefined {
  const columnDiffs = node.diffs as DdlApiColumnPropertyRowDiffs
  const enumValueDiffs = columnDiffs.enumValueDiffs
  if (!enumValueDiffs || Object.keys(enumValueDiffs).length === 0) {
    return undefined
  }
  return enumValueDiffs
}

export function takeColumnEnumValuesRowColorizingDiff(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
): ChangedPropertyMetaData | undefined {
  return (node.diffs as DdlApiColumnPropertyRowDiffs).enumValuesRowColorizingDiff
}

export function takeColumnDefaultValueDiff(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
): ChangedPropertyMetaData | undefined {
  return (node.diffs as DdlApiColumnPropertyRowDiffs).defaultValue
}

export function takeColumnDefaultValueRowColorizingDiff(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
): ChangedPropertyMetaData | undefined {
  return (node.diffs as DdlApiColumnPropertyRowDiffs).defaultValueRowColorizingDiff
}

export function resolveColumnDefaultValueSideDisplay(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  layoutSide: LayoutSide,
): string | undefined {
  const mergedDefault = node.value()?.defaultValue
  const defaultValueDiff = takeColumnDefaultValueDiff(node)
  const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE

  if (!defaultValueDiff) {
    const nodeLevelDiff = (node.diffs as DdlApiColumnPropertyRowDiffs)[NODE_LEVEL_DIFF_KEY]
    if (nodeLevelDiff) {
      const nodeDiff = nodeLevelDiff.data
      if (isDiffAdd(nodeDiff)) {
        return isOrigin ? undefined : mergedDefault
      }
      if (isDiffRemove(nodeDiff)) {
        return isOrigin ? mergedDefault : undefined
      }
    }
    return mergedDefault
  }

  const diff = defaultValueDiff.data

  if (isDiffAdd(diff)) {
    return isOrigin
      ? undefined
      : mergedDefault ?? formatDefaultValueDiffSide(diff.afterValue)
  }
  if (isDiffRemove(diff)) {
    return isOrigin
      ? formatDefaultValueDiffSide(diff.beforeValue) ?? mergedDefault
      : undefined
  }
  if (isDiffReplace(diff)) {
    if (isOrigin) {
      return formatDefaultValueDiffSide(diff.beforeValue) ?? mergedDefault
    }
    return formatDefaultValueDiffSide(diff.afterValue) ?? mergedDefault
  }

  return mergedDefault
}

function formatDefaultValueDiffSide(value: unknown): string | undefined {
  if (typeof value === "string") {
    return formatDefaultValueDisplayString(value)
  }
  if (isObject(value) && "kind" in value) {
    return formatDefaultValueForDisplay(value as unknown as Expr)
  }
  return undefined
}

export type DdlColumnEnumValueSideItem = {
  readonly literal: string
  readonly diff?: ChangedPropertyMetaData
}

export function resolveColumnEnumValueSideItems(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  layoutSide: LayoutSide,
): readonly DdlColumnEnumValueSideItem[] {
  return resolveListSideItems(
    node.value()?.enumValues ?? [],
    takeColumnEnumValueDiffs(node),
    layoutSide,
  ).map(({ text, diff }) => ({ literal: text, diff }))
}

export function takeIndexFlagDiffs(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>,
): Partial<Record<DdlApiIndexFlagDiffKey, ChangedPropertyMetaData>> | undefined {
  const flagDiffs: Partial<Record<DdlApiIndexFlagDiffKey, ChangedPropertyMetaData>> = {}
  let hasDiff = false
  for (const key of DDL_INDEX_FLAG_DIFF_KEYS) {
    const diff = node.diffs[key]
    if (diff) {
      flagDiffs[key] = diff
      hasDiff = true
    }
  }
  return hasDiff ? flagDiffs : undefined
}

export function isDdlFlagBadgeDiffHighlighted(
  flagDiff: ChangedPropertyMetaData | undefined,
): boolean {
  if (!flagDiff) {
    return false
  }

  return flagDiff.highlightingMode.get(DiffHiglightingApplicationArea.Default)
    !== DiffHighlightingApplicationMode.Invisible
}
