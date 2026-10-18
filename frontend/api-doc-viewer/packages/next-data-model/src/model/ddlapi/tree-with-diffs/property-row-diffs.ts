import { hasDdlPropertyTitleRowDiff } from "../../../shared/ddlapi/guards/property-row-diffs"
import { formatDefaultValueDisplayString, formatDefaultValueForDisplay } from "../../../shared/ddlapi/format-ddl-expr"
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
import { DdlApiForeignKeyTarget } from "../tree/node-value"
import { DdlApiTreeNodeWithDiffs } from "../types/aliases"
import { DdlApiTreeNodeKinds } from "../types/node-kind"
import { resolveListSideItems, isDiffSideContentVisible, isDiffSideHeaderVisible, takeAddRemoveDiffIfPresent } from "../../abstract/tree-with-diffs/list-side-display"
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
import { DdlColumnTypeLabelResolver } from "./column-type-label-diffs"
import { DdlIndexPartNamesResolver } from "./index-part-name-diffs"

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
  DDL_PROPERTY_TITLE_ROW_DIFF_KEY,
} from "./property-row-diffs.types"

export type {
  DdlColumnTypeLabelSideSegment,
} from "./column-type-label-diffs"

export type DdlApiPropertyNodeWithDiffs =
  | DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>
  | DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>

export type DdlApiTableHeaderNodeWithDiffs =
  DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.TABLE>

export type DdlApiPropertyListSectionNodeWithDiffs =
  | DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMNS>
  | DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEXES>

export type DdlColumnEnumValueSideItem = {
  readonly literal: string
  readonly diff?: ChangedPropertyMetaData
}

class Table {
  public static takeTitleRowDiff(
    node: DdlApiTableHeaderNodeWithDiffs,
  ) {
    if (!hasDdlPropertyTitleRowDiff(node.diffs)) {
      return undefined
    }
    return node.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]
  }

  public static takeNodeDiffIfPresent(
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

  public static takeSchemaNameDiff(
    node: DdlApiTableHeaderNodeWithDiffs,
  ): ChangedPropertyMetaData | undefined {
    return node.diffs.schemaName
  }

  public static takeDescriptionDiff(
    node: DdlApiTableHeaderNodeWithDiffs,
  ): ChangedPropertyMetaData | undefined {
    return node.diffs.description
  }

  public static resolveSchemaNameSideDisplay(
    node: DdlApiTableHeaderNodeWithDiffs,
    layoutSide: LayoutSide,
  ): string {
    const mergedSchemaName = node.value()?.schemaName ?? ''
    const schemaNameDiff = Table.takeSchemaNameDiff(node)
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
}

class PropertyRow {
  public static takeTitleRowDiff(
    node: DdlApiPropertyNodeWithDiffs,
  ) {
    if (!hasDdlPropertyTitleRowDiff(node.diffs)) {
      return undefined
    }
    return node.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]
  }

  public static takeNodeDiffIfPresent(
    node: DdlApiPropertyNodeWithDiffs,
  ) {
    return takeAddRemoveDiffIfPresent(node.diffs[NODE_LEVEL_DIFF_KEY])
  }

  public static isSubheaderVisible(
    nodeLevelDiff: ChangedPropertyMetaData | undefined,
    layoutSide: LayoutSide,
  ): boolean {
    return isDiffSideHeaderVisible(nodeLevelDiff, layoutSide)
  }

  public static isContentVisible(
    nodeLevelDiff: ChangedPropertyMetaData | undefined,
    layoutSide: LayoutSide,
  ): boolean {
    return isDiffSideContentVisible(nodeLevelDiff, layoutSide)
  }

  public static isListSectionUniformWholeNodeChange(
    node: DdlApiPropertyListSectionNodeWithDiffs,
  ): boolean {
    const diff = node.diffs[NODE_LEVEL_DIFF_KEY]
    if (!diff) {
      return false
    }
    return isDiffAdd(diff.data) || isDiffRemove(diff.data)
  }
}

class Column {
  public static takeFlagDiffs(
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

  public static isFlagBadgeHighlighted(
    flagDiff: ChangedPropertyMetaData | undefined,
  ): boolean {
    if (!flagDiff) {
      return false
    }

    return flagDiff.highlightingMode.get(DiffHiglightingApplicationArea.Default)
      !== DiffHighlightingApplicationMode.Invisible
  }

  public static takeGeneratedExpressionDiff(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  ): ChangedPropertyMetaData | undefined {
    return node.diffs.generatedExpression
  }

  public static takeDescriptionDiff(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  ): ChangedPropertyMetaData | undefined {
    return node.diffs.description
  }
}

class ForeignKey {
  public static takeTargetDiffs(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  ): DdlApiForeignKeyTargetDiffs | undefined {
    const columnDiffs = node.diffs as DdlApiColumnPropertyRowDiffs
    const targetDiffs = columnDiffs.foreignKeyTargetDiffs
    if (!targetDiffs || Object.keys(targetDiffs).length === 0) {
      return undefined
    }
    return targetDiffs
  }

  /**
   * The foreign key target a side shows. A replace diff marks a column that keeps its key while the
   * referenced column or table changes: the row holds the after target, and the before side shows
   * the target from the diff's before value.
   */
  public static resolveTargetSideDisplay(
    target: DdlApiForeignKeyTarget,
    targetDiff: ChangedPropertyMetaData | undefined,
    layoutSide: LayoutSide,
  ): DdlApiForeignKeyTarget {
    const diff = targetDiff?.data
    if (layoutSide === ORIGIN_LAYOUT_SIDE && diff && isDiffReplace(diff) && ForeignKey.isTarget(diff.beforeValue)) {
      return diff.beforeValue
    }
    return target
  }

  private static isTarget(value: unknown): value is DdlApiForeignKeyTarget {
    return isObject(value)
      && typeof value.schemaName === 'string'
      && typeof value.tableName === 'string'
      && typeof value.columnName === 'string'
  }
}

class ColumnDefaultValue {
  public static takeDiff(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  ): ChangedPropertyMetaData | undefined {
    return (node.diffs as DdlApiColumnPropertyRowDiffs).defaultValue
  }

  public static takeRowColorizingDiff(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  ): ChangedPropertyMetaData | undefined {
    return (node.diffs as DdlApiColumnPropertyRowDiffs).defaultValueRowColorizingDiff
  }

  public static resolveSideDisplay(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
    layoutSide: LayoutSide,
  ): string | undefined {
    const mergedDefault = node.value()?.defaultValue
    const defaultValueDiff = ColumnDefaultValue.takeDiff(node)
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
        : mergedDefault ?? ColumnDefaultValue.formatDiffSide(diff.afterValue)
    }
    if (isDiffRemove(diff)) {
      return isOrigin
        ? ColumnDefaultValue.formatDiffSide(diff.beforeValue) ?? mergedDefault
        : undefined
    }
    if (isDiffReplace(diff)) {
      if (isOrigin) {
        return ColumnDefaultValue.formatDiffSide(diff.beforeValue) ?? mergedDefault
      }
      return ColumnDefaultValue.formatDiffSide(diff.afterValue) ?? mergedDefault
    }

    return mergedDefault
  }

  private static formatDiffSide(value: unknown): string | undefined {
    if (typeof value === "string") {
      return formatDefaultValueDisplayString(value)
    }
    if (isObject(value) && "kind" in value) {
      return formatDefaultValueForDisplay(value as unknown as Expr)
    }
    return undefined
  }
}

class ColumnEnumValues {
  public static takeDiffs(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  ): DdlApiEnumValueDiffs | undefined {
    const columnDiffs = node.diffs as DdlApiColumnPropertyRowDiffs
    const enumValueDiffs = columnDiffs.enumValueDiffs
    if (!enumValueDiffs || Object.keys(enumValueDiffs).length === 0) {
      return undefined
    }
    return enumValueDiffs
  }

  public static takeRowColorizingDiff(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
  ): ChangedPropertyMetaData | undefined {
    return (node.diffs as DdlApiColumnPropertyRowDiffs).enumValuesRowColorizingDiff
  }

  public static resolveSideItems(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>,
    layoutSide: LayoutSide,
  ): readonly DdlColumnEnumValueSideItem[] {
    return resolveListSideItems(
      node.value()?.enumValues ?? [],
      ColumnEnumValues.takeDiffs(node),
      layoutSide,
    ).map(({ text, diff }) => ({ literal: text, diff }))
  }
}

class Index {
  public static takeFlagDiffs(
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

  public static takeDescriptionDiff(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>,
  ): ChangedPropertyMetaData | undefined {
    return node.diffs.description
  }
}

/**
 * Two-level palette: `DdlApiRowDiffs.<SubDomain>.<method>`. Each nested class groups
 * accessors for one row sub-domain (table header, column flags, foreign keys, …);
 * `IndexPartNames`/`ColumnTypeLabel` link to their own classes in satellite files.
 */
export class DdlApiRowDiffs {
  public static readonly Table = Table
  public static readonly PropertyRow = PropertyRow
  public static readonly Column = Column
  public static readonly ForeignKey = ForeignKey
  public static readonly ColumnDefaultValue = ColumnDefaultValue
  public static readonly ColumnEnumValues = ColumnEnumValues
  public static readonly Index = Index
  public static readonly IndexPartNames = DdlIndexPartNamesResolver
  public static readonly ColumnTypeLabel = DdlColumnTypeLabelResolver
}
