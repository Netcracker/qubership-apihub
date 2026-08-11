import { ChangedPropertyMetaData, NODE_LEVEL_DIFF_KEY } from "../../abstract/tree-with-diffs/tree-node.interface"
import { DdlApiColumnRowValue, DdlApiIndexRowValue, DdlApiTableRowValue } from "../tree/node-value"

/** Synthetic diff slot: resolved title-row background diff for column/index property rows. */
export const DDL_PROPERTY_TITLE_ROW_DIFF_KEY = "titleRow" as const

/** Per-target diffs for {@link DdlApiColumnRowValue.foreignKeyTargets}; keys from {@link formatForeignKeyTargetKey}. */
export type DdlApiForeignKeyTargetDiffs = Partial<Record<string, ChangedPropertyMetaData>>

/** Per-literal diffs for {@link DdlApiColumnRowValue.enumValues}; keys are enum member strings. */
export type DdlApiEnumValueDiffs = Partial<Record<string, ChangedPropertyMetaData>>

/** Per-part diffs for {@link DdlApiIndexRowValue.partNames}; keys are index part display strings. */
export type DdlApiIndexPartNameDiffs = Partial<Record<string, ChangedPropertyMetaData>>

export const DDL_COLUMN_TYPE_FIELD_DIFF_KEYS = [
  "typeName",
  "size",
  "precision",
  "scale",
  "label",
] as const

export type DdlApiColumnTypeFieldDiffKey = (typeof DDL_COLUMN_TYPE_FIELD_DIFF_KEYS)[number]

/** Per-field diffs for {@link DdlApiColumnRowValue.columnType} sub-fields shown in the type label. */
export type DdlApiColumnTypeFieldDiffs = Partial<Record<DdlApiColumnTypeFieldDiffKey, ChangedPropertyMetaData>>

export const DDL_ENUM_COLUMN_TYPE_TRANSITION = {
  ToEnum: "to-enum",
  FromEnum: "from-enum",
} as const

export type DdlEnumColumnTypeTransition =
  (typeof DDL_ENUM_COLUMN_TYPE_TRANSITION)[keyof typeof DDL_ENUM_COLUMN_TYPE_TRANSITION]

export const DDL_DEFAULT_VALUE_COLUMN_TRANSITION = {
  Lost: "lost",
  Gained: "gained",
} as const

export type DdlDefaultValueColumnTransition =
  (typeof DDL_DEFAULT_VALUE_COLUMN_TRANSITION)[keyof typeof DDL_DEFAULT_VALUE_COLUMN_TRANSITION]

export const DDL_COLUMN_FLAG_DIFF_KEYS = [
  "isPrimaryKey",
  "isUnique",
  "isNotNull",
  "isGenerated",
] as const satisfies ReadonlyArray<keyof DdlApiColumnRowValue>

export const DDL_INDEX_FLAG_DIFF_KEYS = [
  "isUnique",
] as const satisfies ReadonlyArray<keyof DdlApiIndexRowValue>

export type DdlApiColumnFlagDiffKey = (typeof DDL_COLUMN_FLAG_DIFF_KEYS)[number]
export type DdlApiIndexFlagDiffKey = (typeof DDL_INDEX_FLAG_DIFF_KEYS)[number]

export type DdlApiPropertyRowValue = DdlApiColumnRowValue | DdlApiIndexRowValue

export type DdlApiTablePropertyRowDiffs = Partial<
  Record<
    | typeof NODE_LEVEL_DIFF_KEY
    | typeof DDL_PROPERTY_TITLE_ROW_DIFF_KEY
    | keyof DdlApiTableRowValue,
    ChangedPropertyMetaData
  >
>

export const DDL_TABLE_CHANGED_PROPERTY_KEYS = [
  NODE_LEVEL_DIFF_KEY,
  DDL_PROPERTY_TITLE_ROW_DIFF_KEY,
  "tableName",
  "schemaName",
  "description",
] as const satisfies ReadonlyArray<keyof DdlApiTablePropertyRowDiffs>

export type DdlApiColumnPropertyRowDiffs = Partial<
  Record<
    | typeof NODE_LEVEL_DIFF_KEY
    | typeof DDL_PROPERTY_TITLE_ROW_DIFF_KEY
    | keyof DdlApiColumnRowValue,
    ChangedPropertyMetaData
  >
> & {
  foreignKeyTargetDiffs?: DdlApiForeignKeyTargetDiffs
  enumValueDiffs?: DdlApiEnumValueDiffs
  /** Synthetic replace row background when {@link enumValueDiffs} is present. */
  enumValuesRowColorizingDiff?: ChangedPropertyMetaData
  /** Synthetic row background for {@link defaultValue} add/remove/replace. */
  defaultValueRowColorizingDiff?: ChangedPropertyMetaData
  columnTypeFieldDiffs?: DdlApiColumnTypeFieldDiffs
}

export type DdlApiIndexPropertyRowDiffs = Partial<
  Record<
    | typeof NODE_LEVEL_DIFF_KEY
    | typeof DDL_PROPERTY_TITLE_ROW_DIFF_KEY
    | keyof DdlApiIndexRowValue,
    ChangedPropertyMetaData
  >
> & {
  partNameDiffs?: DdlApiIndexPartNameDiffs
}

export const DDL_COLUMN_CHANGED_PROPERTY_KEYS = [
  NODE_LEVEL_DIFF_KEY,
  DDL_PROPERTY_TITLE_ROW_DIFF_KEY,
  "columnName",
  "description",
  "generatedExpression",
  ...DDL_COLUMN_FLAG_DIFF_KEYS,
] as const

export const DDL_INDEX_CHANGED_PROPERTY_KEYS = [
  NODE_LEVEL_DIFF_KEY,
  DDL_PROPERTY_TITLE_ROW_DIFF_KEY,
  "indexName",
  "description",
  ...DDL_INDEX_FLAG_DIFF_KEYS,
] as const satisfies ReadonlyArray<keyof DdlApiIndexPropertyRowDiffs>
