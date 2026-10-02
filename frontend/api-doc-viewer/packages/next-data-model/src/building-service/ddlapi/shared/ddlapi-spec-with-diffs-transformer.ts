import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/next-data-model/model/abstract/layout-side";
import { NODE_LEVEL_DIFF_KEY } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DdlApiColumnRowValue, DdlApiColumnTypeValue, DdlApiForeignKeyTarget, DdlApiIndexRowValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { TableKey } from "@apihub/next-data-model/shared/ddlapi/types/table-key";
import { DiffsRecord, isObject, takeIfDiffsRecord } from "@apihub/next-data-model/utilities";
import { aggregateDiffsWithRollup, Diff, DiffAction, DiffAdd, DiffRemove, isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";
import {
  AttrKind,
  Column,
  Expr,
  findAttr,
  ForeignKey,
  Index,
  PgAttrKind,
  Realm,
  Schema,
  Table,
  TypeKind,
} from "@netcracker/qubership-apihub-ddlapi";
import { formatForeignKeyTargetKey, formatForeignKeyTargetKeys } from "@apihub/next-data-model/shared/ddlapi/foreign-key-target-key";
import { formatDefaultValueDisplayString, formatDefaultValueForDisplay } from "@apihub/next-data-model/shared/ddlapi/format-ddl-expr";
import { isNamedIndexTitle, resolveDdlApiIndexDescendantDiffKey } from "@apihub/next-data-model/shared/ddlapi/index-title";
import { isDdlScalarColumnTypeName } from "@apihub/next-data-model/shared/ddlapi/guards/column-type-name";
import { isEnumType } from "@apihub/next-data-model/shared/ddlapi/guards/schema-type";
import { BuildingServiceLogger } from "../../../loggers";
import { DiffMetaKeys } from "../../abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import {
  DdlApiIndexPartNameSource,
  DdlApiSpecTransformer,
  DdlApiTableOrientedSpec,
  DdlApiTableOrientedSpecColumnsSection,
  DdlApiTableOrientedSpecIndexesSection,
} from "./ddlapi-spec-transformer";

type ColumnCrawlDiffsRecord = Omit<DiffsRecord, 'foreignKeyTargets' | 'enumValues'> & {
  foreignKeyTargets?: DiffsRecord
  enumValues?: DiffsRecord
}

type IndexCrawlDiffsRecord = Omit<DiffsRecord, 'partNameDiffs'> & {
  partNameDiffs?: DiffsRecord
}

// The foreign key fields that decide a column's target, each diffed by api-diff as one value.
const FOREIGN_KEY_REFERENCE_FIELDS = ['columns', 'refTable', 'refColumns'] as const

type ForeignKeyReferenceField = typeof FOREIGN_KEY_REFERENCE_FIELDS[number]

type ForeignKeyTargetChange = {
  before?: DdlApiForeignKeyTarget
  after?: DdlApiForeignKeyTarget
  diff: Diff
}

// One foreign key badge of a column row: the target it shows and the diff of its foreign key.
type ForeignKeyTargetEntry = {
  target: DdlApiForeignKeyTarget
  diff?: Diff
}

type GeneratedColumnAttrKind = typeof AttrKind.GeneratedExpr | typeof PgAttrKind.Identity

interface GeneratedColumnAttrRef {
  kind: GeneratedColumnAttrKind
  attr: object
  attrIndex: number
}

type GeneratedColumnDiffResult = {
  isGenerated?: Diff
  generatedExpression?: Diff
}

type KeyedArrayElementDiffPairingContext = {
  readonly rawDiffs: readonly Diff[]
  readonly diffsRemove: readonly DiffRemove[]
  readonly diffsAdd: readonly DiffAdd[]
}

type KeyedArrayElementDiffOptions = {
  takeRemoveKey: (diff: Diff) => string | undefined
  takeAddKey: (diff: Diff) => string | undefined
  takeReplaceBeforeKey: (diff: Diff) => string | undefined
  takeReplaceAfterKey: (diff: Diff) => string | undefined
  findMatchingDiffAdd: (
    diffRemove: DiffRemove,
    diffsAdd: readonly DiffAdd[],
    consumedDiffs: ReadonlySet<Diff>,
    context: KeyedArrayElementDiffPairingContext,
  ) => DiffAdd | undefined
  normalizeDiffValues: boolean
}

const DEFAULT_VALUE_NESTED_DIFF_KEYS = ['value', 'expr'] as const

export type DdlApiColumnTypeValueWithDiffs = DdlApiColumnTypeValue & {
  [key: symbol]: unknown;
};

export type DdlApiColumnRowValueWithDiffs = Omit<DdlApiColumnRowValue, 'columnType'> & {
  readonly columnType: DdlApiColumnTypeValueWithDiffs;
  [key: symbol]: unknown;
};

export interface DdlApiIndexRowValueWithDiffs extends DdlApiIndexRowValue {
  [key: symbol]: unknown;
}

export type DdlApiTableOrientedSpecColumnsSectionWithDiffs = Omit<
  DdlApiTableOrientedSpecColumnsSection,
  'items'
> & {
  readonly items: readonly DdlApiColumnRowValueWithDiffs[];
  [key: symbol]: unknown;
};

export type DdlApiTableOrientedSpecIndexesSectionWithDiffs = Omit<
  DdlApiTableOrientedSpecIndexesSection,
  'items'
> & {
  readonly items: readonly DdlApiIndexRowValueWithDiffs[];
  [key: symbol]: unknown;
};

export type DdlApiTableOrientedSpecWithDiffs = Omit<DdlApiTableOrientedSpec, 'columns' | 'indexes'> & {
  readonly columns: DdlApiTableOrientedSpecColumnsSectionWithDiffs;
  readonly indexes: DdlApiTableOrientedSpecIndexesSectionWithDiffs;
  [key: symbol]: unknown;
};

export class DdlApiSpecWithDiffsTransformer extends DdlApiSpecTransformer {
  constructor(
    logger: BuildingServiceLogger,
    private readonly diffMetaKeys: DiffMetaKeys,
  ) {
    super(logger)
  }

  public transformSourceToTableOrientedSpecWithDiffs(
    source: unknown,
    tableKey: TableKey,
  ): DdlApiTableOrientedSpecWithDiffs | null {
    if (this.isDdlApiTableOrientedSpecWithDiffs(source)) {
      return source
    }

    const realm = this.extractRealm(source)
    const table = realm ? this.findTableInRealm(realm, tableKey) : undefined
    const transformed = realm && table
      ? this.buildTableOrientedSpecFromRealm(realm, table, tableKey)
      : this.transformSourceToTableOrientedSpec(source, tableKey)

    if (!transformed) {
      return null
    }

    if (!realm || !table) {
      return this.createTableOrientedSpecWithDiffs(transformed)
    }

    const schema = realm.schemas.find(currentSchema => currentSchema.name === tableKey.schemaName)
    return this.attachDiffMetadataToTableOrientedSpec(transformed, realm, schema, table, tableKey)
  }

  protected attachDiffMetadataToTableOrientedSpec(
    spec: DdlApiTableOrientedSpec,
    realm: Realm,
    schema: Schema | undefined,
    sourceTable: Table,
    tableKey: TableKey,
  ): DdlApiTableOrientedSpecWithDiffs {
    const transformedWithDiffs = this.withBeforeOnlyForeignKeyTargets(
      this.createTableOrientedSpecWithDiffs(spec),
      sourceTable,
    )
    const { diffsMetaKey, aggregatedDiffsMetaKey } = this.diffMetaKeys
    const owningSchemaName = tableKey.schemaName ?? schema?.name ?? 'public'
    const wholeTableDiff = this.resolveWholeTableDiff(realm, schema, sourceTable)

    this.attachTableLevelDiffs(transformedWithDiffs, schema, sourceTable, tableKey, wholeTableDiff)
    this.attachColumnsSectionDiffs(transformedWithDiffs.columns, realm, sourceTable, owningSchemaName, wholeTableDiff)
    this.attachIndexesSectionDiffs(transformedWithDiffs.indexes, sourceTable, wholeTableDiff)

    aggregateDiffsWithRollup(transformedWithDiffs, diffsMetaKey, aggregatedDiffsMetaKey)

    return transformedWithDiffs
  }

  protected createTableOrientedSpecWithDiffs(
    spec: DdlApiTableOrientedSpec,
  ): DdlApiTableOrientedSpecWithDiffs {
    return {
      ...spec,
      columns: {
        ...spec.columns,
        items: spec.columns.items.map((column): DdlApiColumnRowValueWithDiffs => ({
          ...column,
          columnType: { ...column.columnType },
        })),
      },
      indexes: {
        ...spec.indexes,
        items: spec.indexes.items.map((index): DdlApiIndexRowValueWithDiffs => ({ ...index })),
      },
    }
  }

  private attachTableLevelDiffs(
    spec: DdlApiTableOrientedSpecWithDiffs,
    schema: Schema | undefined,
    sourceTable: Table,
    tableKey: TableKey,
    wholeTableDiff: Diff | undefined,
  ): void {
    const tableDiffs: DiffsRecord = {}

    if (wholeTableDiff) {
      tableDiffs[NODE_LEVEL_DIFF_KEY] = wholeTableDiff
    }

    const tableCommentDiff = this.resolveCommentDescriptionDiff(sourceTable.attrs)
    if (tableCommentDiff) {
      tableDiffs.description = tableCommentDiff
    }

    if (tableKey.schemaName !== 'public') {
      const schemaNameDiff = this.resolveSchemaNameDiff(schema)
      if (schemaNameDiff) {
        tableDiffs.schemaName = schemaNameDiff
      }
    }

    this.mergeDiffsIntoTarget(spec, tableDiffs)
  }

  private attachColumnsSectionDiffs(
    columnsSection: DdlApiTableOrientedSpecColumnsSectionWithDiffs,
    realm: Realm,
    sourceTable: Table,
    owningSchemaName: string,
    wholeTableDiff: Diff | undefined,
  ): void {
    const sourceColumns = sourceTable.columns ?? []
    const columnsArrayDiffs = this.getDiffsRecord(sourceColumns)
    const tableFieldDiffs = this.getDiffsRecord(sourceTable)
    const primaryKeyDiff = tableFieldDiffs?.primaryKey

    columnsSection.items.forEach((columnRow, rowIndex) => {
      const sourceColumn = sourceColumns.find(column => column.name === columnRow.columnName)
        ?? sourceColumns[rowIndex]

      if (!sourceColumn) {
        return
      }

      const sourceColumnIndex = sourceColumns.indexOf(sourceColumn)
      const columnDiffs: ColumnCrawlDiffsRecord = {}

      const wholeColumnDiff = this.resolveArrayElementDiff(columnsArrayDiffs, sourceColumnIndex)
      if (wholeColumnDiff) {
        columnDiffs[NODE_LEVEL_DIFF_KEY] = wholeColumnDiff
      } else {
        this.attachInheritedWholeTableDiff(columnDiffs, wholeTableDiff)
      }

      const descriptionDiff = this.resolveCommentDescriptionDiff(sourceColumn.attrs)
      if (descriptionDiff) {
        columnDiffs.description = descriptionDiff
      }

      const defaultDiff = this.resolveDefaultValueDiff(sourceColumn)
      if (defaultDiff) {
        columnDiffs.defaultValue = defaultDiff
      }

      const nullabilityDiff = this.getDiffsRecord(sourceColumn.type)?.null
      if (nullabilityDiff) {
        columnDiffs.isNotNull = this.invertBooleanDiffValues(nullabilityDiff)
      }

      const columnPrimaryKeyDiff = primaryKeyDiff && this.isPrimaryKeyColumn(sourceTable, sourceColumn)
        ? primaryKeyDiff
        : this.resolvePrimaryKeyPartDiffForColumn(sourceTable, sourceColumn.name)
      if (columnPrimaryKeyDiff) {
        columnDiffs.isPrimaryKey = columnPrimaryKeyDiff
      }

      const foreignKeyTargetDiffs = this.resolveForeignKeyTargetDiffsForColumn(sourceTable, sourceColumn)
      if (Object.keys(foreignKeyTargetDiffs).length > 0) {
        columnDiffs.foreignKeyTargets = foreignKeyTargetDiffs
      }

      const enumValueDiffs = this.resolveEnumValueDiffsForColumn(sourceColumn)
      const enumValuesRemovedByTypeChange = this.resolveEnumValuesRemovedByColumnTypeChange(
        realm,
        sourceColumn,
        owningSchemaName,
      )
      const mergedEnumValueDiffs = {
        ...enumValueDiffs,
        ...enumValuesRemovedByTypeChange,
      }
      if (Object.keys(mergedEnumValueDiffs).length > 0) {
        columnDiffs.enumValues = mergedEnumValueDiffs
      }

      const uniqueDiff = this.resolveUniqueIndexDiffForColumn(sourceTable, sourceColumn.name)
      if (uniqueDiff) {
        columnDiffs.isUnique = uniqueDiff
      }

      const generatedDiff = this.resolveGeneratedColumnDiff(sourceColumn)
      if (generatedDiff) {
        if (generatedDiff.isGenerated) {
          columnDiffs.isGenerated = generatedDiff.isGenerated
        }
        if (generatedDiff.generatedExpression) {
          columnDiffs.generatedExpression = generatedDiff.generatedExpression
        }
      }

      this.mergeDiffsIntoTarget(columnRow, columnDiffs)
      this.attachColumnTypeDiffs(columnRow.columnType, sourceColumn)
    })

    this.attachInheritedWholeTableDiffToSection(columnsSection, wholeTableDiff)
    this.attachSectionArrayDiffs(columnsSection, columnsArrayDiffs, (arrayIndex) =>
      sourceColumns[arrayIndex]?.name
      ?? columnsSection.items[arrayIndex]?.columnName,
    )
  }

  private attachIndexesSectionDiffs(
    indexesSection: DdlApiTableOrientedSpecIndexesSectionWithDiffs,
    sourceTable: Table,
    wholeTableDiff: Diff | undefined,
  ): void {
    const sourceIndexes = sourceTable.indexes ?? []
    const indexesArrayDiffs = this.getDiffsRecord(sourceIndexes)

    indexesSection.items.forEach((indexRow, rowIndex) => {
      const sourceIndex = this.findSourceIndexForRow(sourceIndexes, indexRow, rowIndex)
      if (!sourceIndex) {
        return
      }

      const sourceIndexIndex = sourceIndexes.indexOf(sourceIndex)
      const indexDiffs: IndexCrawlDiffsRecord = {}

      const wholeIndexDiff = this.resolveArrayElementDiff(indexesArrayDiffs, sourceIndexIndex)
      if (wholeIndexDiff) {
        indexDiffs[NODE_LEVEL_DIFF_KEY] = wholeIndexDiff
      } else {
        this.attachInheritedWholeTableDiff(indexDiffs, wholeTableDiff)
      }

      const indexFieldDiffs = this.getDiffsRecord(sourceIndex)
      const uniqueDiff = indexFieldDiffs?.unique
      if (uniqueDiff) {
        indexDiffs.isUnique = uniqueDiff
      }

      const descriptionDiff = this.resolveCommentDescriptionDiff(sourceIndex.attrs)
      if (descriptionDiff) {
        indexDiffs.description = descriptionDiff
      }

      const partNameDiffs = this.resolveIndexPartNameDiffsForIndex(sourceIndex)
      if (Object.keys(partNameDiffs).length > 0) {
        indexDiffs.partNameDiffs = partNameDiffs
      }

      this.mergeDiffsIntoTarget(indexRow, indexDiffs)
    })

    this.attachInheritedWholeTableDiffToSection(indexesSection, wholeTableDiff)
    this.attachSectionArrayDiffs(indexesSection, indexesArrayDiffs, (arrayIndex) => {
      const sourceIndex = sourceIndexes[arrayIndex]
      const indexRow = indexesSection.items[arrayIndex]
      return resolveDdlApiIndexDescendantDiffKey(arrayIndex, indexRow, sourceIndex?.name)
    })
  }

  private attachSectionArrayDiffs(
    section: object,
    arrayDiffs: DiffsRecord | undefined,
    resolveDescendantKey: (arrayIndex: number) => string | undefined,
  ): void {
    if (!arrayDiffs) {
      return
    }

    const sectionDiffs: DiffsRecord = {}
    for (const [arrayKey, diff] of Object.entries(arrayDiffs)) {
      if (!diff) {
        continue
      }

      const arrayIndex = Number(arrayKey)
      if (Number.isNaN(arrayIndex)) {
        continue
      }

      const descendantKey = resolveDescendantKey(arrayIndex)
      if (descendantKey) {
        sectionDiffs[descendantKey] = diff
      }
    }

    this.mergeDiffsIntoTarget(section, sectionDiffs)
  }

  private attachColumnTypeDiffs(
    columnType: DdlApiColumnTypeValueWithDiffs,
    sourceColumn: Column,
  ): void {
    const columnTypeSource = sourceColumn.type
    if (!columnTypeSource || !isObject(columnTypeSource)) {
      return
    }

    const rawDiff = this.getDiffsRecord(columnTypeSource)?.raw
    if (rawDiff) {
      this.mergeDiffsIntoTarget(columnType, { label: rawDiff })
      return
    }

    const schemaType = columnTypeSource.type
    if (!schemaType || !isObject(schemaType)) {
      return
    }

    const schemaTypeDiffs = this.getDiffsRecord(schemaType)
    if (!schemaTypeDiffs) {
      return
    }

    const columnTypeDiffs: DiffsRecord = {}

    if (schemaTypeDiffs.type) {
      columnTypeDiffs.typeName = schemaTypeDiffs.type
    }
    if (schemaTypeDiffs.size) {
      columnTypeDiffs.size = schemaTypeDiffs.size
    }
    if (schemaTypeDiffs.precision) {
      columnTypeDiffs.precision = schemaTypeDiffs.precision
    }
    if (schemaTypeDiffs.scale) {
      columnTypeDiffs.scale = schemaTypeDiffs.scale
    }

    if (Object.keys(columnTypeDiffs).length > 0) {
      this.mergeDiffsIntoTarget(columnType, columnTypeDiffs)
    }
  }

  private invertBooleanDiffValues(diff: Diff): Diff {
    if (isDiffAdd(diff) && typeof diff.afterValue === 'boolean') {
      return {
        ...diff,
        afterValue: !diff.afterValue,
      }
    }
    if (isDiffRemove(diff) && typeof diff.beforeValue === 'boolean') {
      return {
        ...diff,
        beforeValue: !diff.beforeValue,
      }
    }
    if (
      isDiffReplace(diff) &&
      typeof diff.beforeValue === 'boolean' &&
      typeof diff.afterValue === 'boolean'
    ) {
      return {
        ...diff,
        beforeValue: !diff.beforeValue,
        afterValue: !diff.afterValue,
      }
    }
    return diff
  }

  private resolveWholeTableDiff(
    realm: Realm,
    schema: Schema | undefined,
    sourceTable: Table,
  ): Diff | undefined {
    if (schema?.tables) {
      const tablesArrayDiffs = this.getDiffsRecord(schema.tables)
      const tableIndex = schema.tables.findIndex(table => table === sourceTable || table.name === sourceTable.name)
      if (tableIndex >= 0) {
        const tableDiff = this.resolveArrayElementDiff(tablesArrayDiffs, tableIndex)
        if (tableDiff) {
          return tableDiff
        }
      }
    }

    if (schema && realm.schemas) {
      const schemasArrayDiffs = this.getDiffsRecord(realm.schemas)
      const schemaIndex = realm.schemas.findIndex(
        currentSchema => currentSchema === schema || currentSchema.name === schema.name,
      )
      if (schemaIndex >= 0) {
        return this.resolveArrayElementDiff(schemasArrayDiffs, schemaIndex)
      }
    }

    return undefined
  }

  private resolveSchemaNameDiff(schema: Schema | undefined): Diff | undefined {
    if (!schema) {
      return undefined
    }

    return this.getDiffsRecord(schema)?.name
  }

  private resolveCommentDescriptionDiff(attrs: Column['attrs'] | Table['attrs'] | Index['attrs']): Diff | undefined {
    const commentAttr = findAttr(attrs, AttrKind.Comment)
    if (!commentAttr) {
      const attrsArrayDiffs = this.getDiffsRecord(attrs)
      if (!attrsArrayDiffs) {
        return undefined
      }

      for (const diff of Object.values(attrsArrayDiffs)) {
        if (!diff) {
          continue
        }
        const afterValue = 'afterValue' in diff ? diff.afterValue : undefined
        const beforeValue = 'beforeValue' in diff ? diff.beforeValue : undefined
        const candidate = afterValue ?? beforeValue
        if (isObject(candidate) && candidate.kind === AttrKind.Comment) {
          return diff
        }
      }

      return undefined
    }

    return this.getDiffsRecord(commentAttr)?.text
      ?? this.resolveArrayElementDiff(this.getDiffsRecord(attrs), this.findCommentAttrIndex(attrs))
  }

  private findCommentAttrIndex(attrs: Column['attrs'] | Table['attrs'] | Index['attrs']): number {
    return (attrs ?? []).findIndex(attr => attr.kind === AttrKind.Comment)
  }

  private buildKeyedArrayElementDiffs(
    arrayDiffs: DiffsRecord | undefined,
    options: KeyedArrayElementDiffOptions,
  ): DiffsRecord {
    if (!arrayDiffs) {
      return {}
    }

    const rawDiffs = Object.values(arrayDiffs).filter((diff): diff is Diff => !!diff)
    if (rawDiffs.length === 0) {
      return {}
    }

    const keyedDiffs: DiffsRecord = {}
    const consumedDiffs = new Set<Diff>()
    const diffsRemove = rawDiffs.filter(isDiffRemove)
    const diffsAdd = rawDiffs.filter(isDiffAdd)
    const context: KeyedArrayElementDiffPairingContext = { rawDiffs, diffsRemove, diffsAdd }

    for (const removeDiff of diffsRemove) {
      if (consumedDiffs.has(removeDiff)) {
        continue
      }

      const beforeKey = options.takeRemoveKey(removeDiff)
      if (!beforeKey) {
        continue
      }

      const matchedDiffAdd = options.findMatchingDiffAdd(removeDiff, diffsAdd, consumedDiffs, context)
      if (!matchedDiffAdd) {
        continue
      }

      const afterKey = options.takeAddKey(matchedDiffAdd)
      if (!afterKey) {
        continue
      }

      keyedDiffs[beforeKey] = {
        type: matchedDiffAdd.type,
        scope: matchedDiffAdd.scope,
        description: matchedDiffAdd.description ?? removeDiff.description,
        action: DiffAction.replace,
        beforeValue: beforeKey,
        afterValue: afterKey,
        beforeDeclarationPaths: removeDiff.beforeDeclarationPaths,
        afterDeclarationPaths: matchedDiffAdd.afterDeclarationPaths,
      }
      consumedDiffs.add(removeDiff)
      consumedDiffs.add(matchedDiffAdd)
    }

    for (const diff of rawDiffs) {
      if (consumedDiffs.has(diff)) {
        continue
      }

      if (isDiffAdd(diff)) {
        const key = options.takeAddKey(diff)
        if (key) {
          keyedDiffs[key] = options.normalizeDiffValues
            ? { ...diff, afterValue: key }
            : diff
        }
        continue
      }

      if (isDiffRemove(diff)) {
        const key = options.takeRemoveKey(diff)
        if (key) {
          keyedDiffs[key] = options.normalizeDiffValues
            ? { ...diff, beforeValue: key }
            : diff
        }
        continue
      }

      if (isDiffReplace(diff)) {
        const beforeKey = options.takeReplaceBeforeKey(diff)
        if (beforeKey) {
          keyedDiffs[beforeKey] = options.normalizeDiffValues
            ? {
                ...diff,
                beforeValue: beforeKey,
                afterValue: options.takeReplaceAfterKey(diff) ?? diff.afterValue,
              }
            : diff
        }
      }
    }

    return keyedDiffs
  }

  private resolveEnumValueDiffsForColumn(sourceColumn: Column): DiffsRecord {
    const schemaType = sourceColumn.type?.type
    if (!schemaType || !isEnumType(schemaType)) {
      return {}
    }

    return this.buildKeyedArrayElementDiffs(this.getDiffsRecord(schemaType.values), {
      takeRemoveKey: (diff) => (
        isDiffRemove(diff) && typeof diff.beforeValue === 'string'
          ? diff.beforeValue
          : undefined
      ),
      takeAddKey: (diff) => (
        isDiffAdd(diff) && typeof diff.afterValue === 'string'
          ? diff.afterValue
          : undefined
      ),
      takeReplaceBeforeKey: (diff) => (
        isDiffReplace(diff) && typeof diff.beforeValue === 'string'
          ? diff.beforeValue
          : undefined
      ),
      takeReplaceAfterKey: () => undefined,
      normalizeDiffValues: false,
      findMatchingDiffAdd: (_removeDiff, addCandidates, consumed, pairingContext) => {
        const others = pairingContext.rawDiffs.filter(
          diff => !isDiffAdd(diff) && !isDiffRemove(diff),
        )
        if (pairingContext.diffsRemove.length !== 1 || pairingContext.diffsAdd.length !== 1 || others.length > 0) {
          return undefined
        }
        return addCandidates.find(addDiff => !consumed.has(addDiff))
      },
    })
  }

  private resolveIndexPartNameDiffsForIndex(sourceIndex: Index): DiffsRecord {
    return this.buildKeyedArrayElementDiffs(this.getDiffsRecord(sourceIndex.parts), {
      takeRemoveKey: (diff) => (
        isDiffRemove(diff)
          ? this.takeIndexPartDisplayNameFromDiffValue(diff.beforeValue)
          : undefined
      ),
      takeAddKey: (diff) => (
        isDiffAdd(diff)
          ? this.takeIndexPartDisplayNameFromDiffValue(diff.afterValue)
          : undefined
      ),
      takeReplaceBeforeKey: (diff) => (
        isDiffReplace(diff)
          ? this.takeIndexPartDisplayNameFromDiffValue(diff.beforeValue)
          : undefined
      ),
      takeReplaceAfterKey: (diff) => (
        isDiffReplace(diff)
          ? this.takeIndexPartDisplayNameFromDiffValue(diff.afterValue)
          : undefined
      ),
      normalizeDiffValues: true,
      findMatchingDiffAdd: (removeDiff, addCandidates, consumed) => {
        const removeSeqNo = this.takeIndexPartSeqNoFromDiffValue(removeDiff.beforeValue)
        return addCandidates.find((addDiff) => {
          if (consumed.has(addDiff)) {
            return false
          }

          const addSeqNo = this.takeIndexPartSeqNoFromDiffValue(addDiff.afterValue)
          return removeSeqNo !== undefined && addSeqNo === removeSeqNo
        })
      },
    })
  }

  private takeIndexPartDisplayNameFromDiffValue(value: unknown): string | undefined {
    if (!isObject(value)) {
      return undefined
    }

    return this.formatIndexPartName(value as DdlApiIndexPartNameSource)
  }

  private takeIndexPartSeqNoFromDiffValue(value: unknown): number | undefined {
    if (!isObject(value) || !("seqNo" in value)) {
      return undefined
    }

    const seqNo = Reflect.get(value, "seqNo")
    return typeof seqNo === "number" ? seqNo : undefined
  }

  private resolveEnumValuesRemovedByColumnTypeChange(
    realm: Realm,
    sourceColumn: Column,
    schemaName: string,
  ): DiffsRecord {
    const columnTypeSource = sourceColumn.type
    const schemaType = columnTypeSource?.type
    if (!schemaType || !isObject(schemaType) || isEnumType(schemaType)) {
      return {}
    }

    const typeDiff = this.getDiffsRecord(schemaType)?.type
    if (!typeDiff || !isDiffReplace(typeDiff)) {
      return {}
    }

    const beforeTypeName = typeof typeDiff.beforeValue === 'string' ? typeDiff.beforeValue : undefined
    const afterTypeName = typeof typeDiff.afterValue === 'string' ? typeDiff.afterValue : undefined
    if (
      !beforeTypeName ||
      !afterTypeName ||
      isDdlScalarColumnTypeName(beforeTypeName) ||
      !isDdlScalarColumnTypeName(afterTypeName)
    ) {
      return {}
    }

    const enumLiterals = this.resolveEnumLiteralsBeforeColumnTypeChange(
      realm,
      schemaName,
      beforeTypeName,
      typeDiff.beforeValue,
    )
    if (enumLiterals.length === 0) {
      return {}
    }

    const keyedDiffs: DiffsRecord = {}
    for (const literal of enumLiterals) {
      keyedDiffs[literal] = {
        type: typeDiff.type,
        scope: typeDiff.scope,
        action: DiffAction.remove,
        beforeValue: literal,
        beforeDeclarationPaths: typeDiff.beforeDeclarationPaths,
      }
    }

    return keyedDiffs
  }

  private resolveEnumLiteralsBeforeColumnTypeChange(
    realm: Realm,
    schemaName: string,
    beforeTypeName: string,
    beforeTypeValue: unknown,
  ): string[] {
    if (
      isObject(beforeTypeValue) &&
      beforeTypeValue.kind === TypeKind.EnumType &&
      Array.isArray(beforeTypeValue.values)
    ) {
      return beforeTypeValue.values.filter((value): value is string => typeof value === 'string')
    }

    return this.findEnumTypeLiteralsInRealm(realm, schemaName, beforeTypeName)
  }

  private findEnumTypeLiteralsInRealm(
    realm: Realm,
    schemaName: string,
    enumTypeName: string,
  ): string[] {
    const schema = realm.schemas?.find(entry => entry.name === schemaName)
    if (!schema) {
      return []
    }

    for (const obj of schema.objects ?? []) {
      if (
        isObject(obj) &&
        obj.kind === TypeKind.EnumType &&
        obj.type === enumTypeName &&
        Array.isArray(obj.values)
      ) {
        return obj.values.filter((value): value is string => typeof value === 'string')
      }
    }

    return []
  }

  private resolveForeignKeyTargetDiffsForColumn(sourceTable: Table, sourceColumn: Column): DiffsRecord {
    const entries = this.resolveForeignKeyTargetEntries(sourceTable, sourceColumn)
    const keys = formatForeignKeyTargetKeys(entries.map(entry => entry.target))
    const targetDiffs: DiffsRecord = {}
    entries.forEach((entry, index) => {
      if (entry.diff) {
        targetDiffs[keys[index]] = entry.diff
      }
    })
    return targetDiffs
  }

  /**
   * A column's foreign key badges, one per foreign key, in the order the row lists them: first
   * each key of the merged document that covers the column, then each key that covered the column
   * only before the change. Two keys can show the same target, so each entry carries the diff of
   * its own key rather than sharing one diff per target.
   */
  private resolveForeignKeyTargetEntries(sourceTable: Table, sourceColumn: Column): ForeignKeyTargetEntry[] {
    const foreignKeys = sourceTable.foreignKeys ?? []
    const foreignKeysArrayDiffs = this.getDiffsRecord(foreignKeys)
    const entries: ForeignKeyTargetEntry[] = []
    const beforeOnlyEntries: ForeignKeyTargetEntry[] = []

    foreignKeys.forEach((foreignKey, index) => {
      // The merged document holds a removed key as it was, and every other key with its after values.
      const target = this.buildForeignKeyTarget(foreignKey, sourceColumn)
      const wholeForeignKeyDiff = this.resolveArrayElementDiff(foreignKeysArrayDiffs, index)
      if (wholeForeignKeyDiff) {
        if (target) {
          entries.push({ target, diff: wholeForeignKeyDiff })
        }
        return
      }

      const change = this.resolveForeignKeyTargetChange(foreignKey, sourceColumn)
      if (target) {
        entries.push({ target, ...(change?.after && { diff: this.buildForeignKeyTargetChangeDiff(change) }) })
        return
      }
      if (change?.before && !change.after) {
        beforeOnlyEntries.push({ target: change.before, diff: this.buildForeignKeyTargetChangeDiff(change) })
      }
    })

    return [...entries, ...beforeOnlyEntries]
  }

  /**
   * The diff of one badge whose foreign key exists on both sides. A column that keeps the key
   * shows one changed target, with the old target as the before value. A column that the key
   * stops or starts covering shows the target removed or added.
   */
  private buildForeignKeyTargetChangeDiff(
    change: ForeignKeyTargetChange,
  ): Diff {
    const { type, scope, description } = change.diff
    const beforeDeclarationPaths = 'beforeDeclarationPaths' in change.diff ? change.diff.beforeDeclarationPaths : []
    const afterDeclarationPaths = 'afterDeclarationPaths' in change.diff ? change.diff.afterDeclarationPaths : []
    if (change.before && change.after) {
      return {
        type,
        scope,
        description,
        action: DiffAction.replace,
        beforeValue: change.before,
        afterValue: change.after,
        beforeDeclarationPaths,
        afterDeclarationPaths,
      }
    }
    if (change.before) {
      return { type, scope, description, action: DiffAction.remove, beforeValue: change.before, beforeDeclarationPaths }
    }
    return { type, scope, description, action: DiffAction.add, afterValue: change.after, afterDeclarationPaths }
  }

  /**
   * How a column's target changes under a foreign key that exists on both sides but changed its
   * `columns`, `refColumns` or `refTable`. api-diff compares each of these as one value, and the
   * merged key holds the after value, so the before value comes from the diff. `before` is the
   * column's target that went away and `after` the one that appeared; either is absent when the
   * column had no target on that side. Returns `undefined` when the column's target is unchanged.
   */
  private resolveForeignKeyTargetChange(
    foreignKey: ForeignKey,
    sourceColumn: Column,
  ): ForeignKeyTargetChange | undefined {
    const fieldDiffs = this.getDiffsRecord(foreignKey)
    const referenceDiff = FOREIGN_KEY_REFERENCE_FIELDS
      .map(field => fieldDiffs?.[field])
      .find((diff): diff is Diff => diff !== undefined)
    if (!referenceDiff) {
      return undefined
    }

    const valueOnSide = (field: ForeignKeyReferenceField, side: LayoutSide): unknown => {
      const diff = fieldDiffs?.[field]
      if (!diff) {
        return foreignKey[field]
      }
      if (side === ORIGIN_LAYOUT_SIDE) {
        return 'beforeValue' in diff ? diff.beforeValue : undefined
      }
      return isDiffRemove(diff) ? undefined : foreignKey[field]
    }
    const keyOnSide = (side: LayoutSide): ForeignKey => ({
      ...foreignKey,
      columns: valueOnSide('columns', side) as ForeignKey['columns'],
      refTable: valueOnSide('refTable', side) as ForeignKey['refTable'],
      refColumns: valueOnSide('refColumns', side) as ForeignKey['refColumns'],
    })

    const before = this.buildForeignKeyTarget(keyOnSide(ORIGIN_LAYOUT_SIDE), sourceColumn)
    const after = this.buildForeignKeyTarget(keyOnSide(CHANGED_LAYOUT_SIDE), sourceColumn)
    const beforeKey = before ? formatForeignKeyTargetKey(before) : undefined
    const afterKey = after ? formatForeignKeyTargetKey(after) : undefined
    if (beforeKey === afterKey) {
      return undefined
    }

    return {
      ...(before && { before }),
      ...(after && { after }),
      diff: referenceDiff,
    }
  }

  /**
   * Adds to each column row the targets it had only before the change, from foreign keys that
   * exist on both sides but no longer cover the column. The merged document holds the after
   * values, so without this such a target has no badge to show as removed. A target is added even
   * when another key of the column shows the same one: each badge stands for one foreign key.
   */
  private withBeforeOnlyForeignKeyTargets(
    spec: DdlApiTableOrientedSpecWithDiffs,
    sourceTable: Table,
  ): DdlApiTableOrientedSpecWithDiffs {
    const items = spec.columns.items.map((columnRow): DdlApiColumnRowValueWithDiffs => {
      const sourceColumn = sourceTable.columns?.find(column => column.name === columnRow.columnName)
      if (!sourceColumn) {
        return columnRow
      }
      const targets = this.resolveForeignKeyTargetEntries(sourceTable, sourceColumn).map(entry => entry.target)
      return targets.length === (columnRow.foreignKeyTargets?.length ?? 0)
        ? columnRow
        : { ...columnRow, foreignKeyTargets: targets }
    })

    return { ...spec, columns: { ...spec.columns, items } }
  }

  // A column that joins or leaves an existing primary key is reported by api-diff as an added or
  // removed element of `primaryKey.parts`, not as a diff of `primaryKey` itself.
  private resolvePrimaryKeyPartDiffForColumn(sourceTable: Table, columnName: string): Diff | undefined {
    const partsDiffs = this.getDiffsRecord(sourceTable.primaryKey?.parts)
    for (const diff of Object.values(partsDiffs ?? {})) {
      if (!diff) {
        continue
      }
      const part = isDiffAdd(diff) ? diff.afterValue : isDiffRemove(diff) ? diff.beforeValue : undefined
      if (isObject(part) && part.column === columnName) {
        return diff
      }
    }
    return undefined
  }

  private resolveUniqueIndexDiffForColumn(sourceTable: Table, columnName: string): Diff | undefined {
    const indexes = sourceTable.indexes ?? []

    for (let index = 0; index < indexes.length; index += 1) {
      const sourceIndex = indexes[index]
      if (!this.isSingleColumnIndexForColumn(sourceIndex, columnName)) {
        continue
      }

      const uniqueDiff = this.getDiffsRecord(sourceIndex)?.unique
      if (uniqueDiff) {
        return uniqueDiff
      }
    }

    const indexesArrayDiffs = this.getDiffsRecord(indexes)
    for (let index = 0; index < indexes.length; index += 1) {
      const sourceIndex = indexes[index]
      if (!this.isSingleColumnUniqueIndexForColumn(sourceIndex, columnName)) {
        continue
      }

      const wholeIndexDiff = this.resolveArrayElementDiff(indexesArrayDiffs, index)
      if (wholeIndexDiff) {
        return wholeIndexDiff
      }
    }

    return undefined
  }

  private resolveGeneratedColumnDiff(sourceColumn: Column): GeneratedColumnDiffResult | undefined {
    const attrsArrayDiff = this.resolveGeneratedColumnDiffFromAttrsArray(sourceColumn.attrs)
    if (attrsArrayDiff?.generatedExpression) {
      return this.finalizeGeneratedColumnDiff(sourceColumn, attrsArrayDiff)
    }

    const attrGeneratedColumn = this.findGeneratedColumnAttr(sourceColumn.attrs)
    if (!attrGeneratedColumn) {
      return this.finalizeGeneratedColumnDiff(sourceColumn, attrsArrayDiff)
    }

    const attrDiff = this.resolveGeneratedColumnAttrDiff(sourceColumn.attrs, attrGeneratedColumn)
    if (attrDiff) {
      return this.finalizeGeneratedColumnDiff(sourceColumn, attrDiff)
    }

    return this.finalizeGeneratedColumnDiff(sourceColumn, attrsArrayDiff)
  }

  private finalizeGeneratedColumnDiff(
    sourceColumn: Column,
    result: GeneratedColumnDiffResult | undefined,
  ): GeneratedColumnDiffResult | undefined {
    if (!result?.isGenerated || !this.shouldOmitIsGeneratedFlagDiff(sourceColumn, result)) {
      return result
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isGenerated, ...rest } = result
    return Object.keys(rest).length > 0 ? rest : undefined
  }

  private shouldOmitIsGeneratedFlagDiff(
    sourceColumn: Column,
    result: GeneratedColumnDiffResult,
  ): boolean {
    if (!result.generatedExpression || !result.isGenerated) {
      return false
    }

    if (this.isGeneratedAttrKindSwitch(result.isGenerated)) {
      return true
    }

    if (!isDiffRemove(result.isGenerated)) {
      return false
    }

    return this.hasIncomingGeneratedColumnAttrDiff(sourceColumn.attrs)
  }

  private hasIncomingGeneratedColumnAttrDiff(attrs: Column['attrs']): boolean {
    const attrsArrayDiffs = this.getDiffsRecord(attrs)
    if (!attrsArrayDiffs) {
      return false
    }

    for (const diff of Object.values(attrsArrayDiffs)) {
      if (!diff) {
        continue
      }

      if (isDiffReplace(diff) && this.isGeneratedAttrKindSwitch(diff)) {
        return true
      }

      if (!isDiffAdd(diff)) {
        continue
      }

      const afterValue = this.resolveDiffSideValue(diff)
      if (isObject(afterValue) && this.isGeneratedColumnAttr(afterValue)) {
        return true
      }
    }

    return false
  }

  private findGeneratedColumnAttr(attrs: Column['attrs']): GeneratedColumnAttrRef | undefined {
    const columnAttrs = attrs ?? []

    const attrIdentity = findAttr(columnAttrs, PgAttrKind.Identity)
    if (attrIdentity) {
      return {
        kind: PgAttrKind.Identity,
        attr: attrIdentity,
        attrIndex: columnAttrs.indexOf(attrIdentity),
      }
    }

    const attrGeneratedExpr = findAttr(columnAttrs, AttrKind.GeneratedExpr)
    if (attrGeneratedExpr) {
      return {
        kind: AttrKind.GeneratedExpr,
        attr: attrGeneratedExpr,
        attrIndex: columnAttrs.indexOf(attrGeneratedExpr),
      }
    }

    return undefined
  }

  private resolveGeneratedColumnDiffFromAttrsArray(
    attrs: Column['attrs'],
  ): GeneratedColumnDiffResult | undefined {
    const attrsArrayDiffs = this.getDiffsRecord(attrs)
    if (!attrsArrayDiffs) {
      return undefined
    }

    let result: GeneratedColumnDiffResult | undefined
    for (const diff of Object.values(attrsArrayDiffs)) {
      if (!diff) {
        continue
      }

      const candidate = this.resolveDiffSideValue(diff)
      if (!isObject(candidate) || !this.isGeneratedColumnAttr(candidate)) {
        continue
      }

      const currentResult = this.buildGeneratedColumnDiffResult(candidate.kind, diff)
      result = {
        isGenerated: result?.isGenerated ?? currentResult.isGenerated,
        generatedExpression: result?.generatedExpression ?? currentResult.generatedExpression,
      }
    }

    return result
  }

  private resolveGeneratedColumnAttrDiff(
    attrs: Column['attrs'],
    generatedColumnAttr: GeneratedColumnAttrRef,
  ): GeneratedColumnDiffResult | undefined {
    const attrsArrayDiffs = this.getDiffsRecord(attrs)


    let attrFieldDiffKeys = undefined
    if (generatedColumnAttr.kind === AttrKind.GeneratedExpr) {
      attrFieldDiffKeys = ['expr'] as const
    }
    if (generatedColumnAttr.kind === PgAttrKind.Identity) {
      attrFieldDiffKeys = ['generation', 'seqStart', 'seqIncrement'] as const
    }

    if (!attrFieldDiffKeys) {
      return undefined
    }

    const attrFieldDiff = this.resolveFirstAttrFieldDiff(generatedColumnAttr.attr, attrFieldDiffKeys)
    if (attrFieldDiff) {
      if (generatedColumnAttr.kind === AttrKind.GeneratedExpr) {
        return {
          generatedExpression: this.normalizeGeneratedExpressionDiffValues(attrFieldDiff),
        }
      }
      return this.buildGeneratedColumnDiffResult(generatedColumnAttr.kind, attrFieldDiff)
    }

    const arrayElementDiff = this.resolveArrayElementDiff(attrsArrayDiffs, generatedColumnAttr.attrIndex)
    if (arrayElementDiff) {
      return this.buildGeneratedColumnDiffResult(generatedColumnAttr.kind, arrayElementDiff)
    }

    return undefined
  }

  private resolveDefaultValueDiff(sourceColumn: Column): Diff | undefined {
    const columnFieldDiffs = this.getDiffsRecord(sourceColumn)
    const wholeDefaultDiff = columnFieldDiffs?.default
    if (wholeDefaultDiff) {
      return this.normalizeDefaultValueDiff(wholeDefaultDiff)
    }

    const defaultFieldDiffs = this.getDiffsRecord(sourceColumn.default)
    if (!defaultFieldDiffs) {
      return undefined
    }

    for (const fieldKey of DEFAULT_VALUE_NESTED_DIFF_KEYS) {
      const nestedDiff = defaultFieldDiffs[fieldKey]
      if (nestedDiff) {
        return this.normalizeDefaultValueDiff(nestedDiff)
      }
    }

    return undefined
  }

  private normalizeDefaultValueDiff(diff: Diff): Diff {
    if (isDiffAdd(diff)) {
      return {
        ...diff,
        afterValue: this.takeDefaultValueDisplay(diff.afterValue),
      }
    }
    if (isDiffRemove(diff)) {
      return {
        ...diff,
        beforeValue: this.takeDefaultValueDisplay(diff.beforeValue),
      }
    }
    if (isDiffReplace(diff)) {
      return {
        ...diff,
        beforeValue: this.takeDefaultValueDisplay(diff.beforeValue),
        afterValue: this.takeDefaultValueDisplay(diff.afterValue),
      }
    }

    return diff
  }

  private takeDefaultValueDisplay(value: unknown): unknown {
    if (typeof value === 'string') {
      return formatDefaultValueDisplayString(value)
    }
    if (isObject(value) && 'kind' in value) {
      return formatDefaultValueForDisplay(value as unknown as Expr)
    }

    return value
  }

  private resolveFirstAttrFieldDiff(
    attr: object,
    fieldKeys: readonly string[],
  ): Diff | undefined {
    const attrDiffs = this.getDiffsRecord(attr)
    if (!attrDiffs) {
      return undefined
    }

    for (const fieldKey of fieldKeys) {
      const fieldDiff = attrDiffs[fieldKey]
      if (fieldDiff) {
        return fieldDiff
      }
    }

    return undefined
  }

  private buildGeneratedColumnDiffResult(
    attrKind: GeneratedColumnAttrKind,
    diff: Diff,
  ): GeneratedColumnDiffResult {
    const generatedExpression = this.resolveGeneratedExpressionDiff(attrKind, diff)
    const omitIsGenerated = this.isGeneratedAttrKindSwitch(diff)

    return {
      ...(!omitIsGenerated && { isGenerated: diff }),
      ...(generatedExpression && { generatedExpression }),
    }
  }

  private resolveGeneratedExpressionDiff(
    attrKind: GeneratedColumnAttrKind,
    diff: Diff,
  ): Diff | undefined {
    if (isDiffReplace(diff)) {
      const beforeKind = this.takeGeneratedColumnAttrKind(diff.beforeValue)
      const afterKind = this.takeGeneratedColumnAttrKind(diff.afterValue)

      if (beforeKind === AttrKind.GeneratedExpr && afterKind === PgAttrKind.Identity) {
        return {
          type: diff.type,
          scope: diff.scope,
          description: diff.description,
          action: DiffAction.remove,
          beforeValue: this.takeGeneratedExpressionValue(diff.beforeValue),
          beforeDeclarationPaths: diff.beforeDeclarationPaths,
        }
      }

      if (beforeKind === PgAttrKind.Identity && afterKind === AttrKind.GeneratedExpr) {
        return {
          type: diff.type,
          scope: diff.scope,
          description: diff.description,
          action: DiffAction.add,
          afterValue: this.takeGeneratedExpressionValue(diff.afterValue),
          afterDeclarationPaths: diff.afterDeclarationPaths,
        }
      }
    }

    return attrKind === AttrKind.GeneratedExpr
      ? this.normalizeGeneratedExpressionDiffValues(diff)
      : undefined
  }

  private normalizeGeneratedExpressionDiffValues(diff: Diff): Diff {
    if (isDiffAdd(diff)) {
      return {
        ...diff,
        afterValue: this.takeGeneratedExpressionValue(diff.afterValue),
      }
    }
    if (isDiffRemove(diff)) {
      return {
        ...diff,
        beforeValue: this.takeGeneratedExpressionValue(diff.beforeValue),
      }
    }
    if (isDiffReplace(diff)) {
      return {
        ...diff,
        beforeValue: this.takeGeneratedExpressionValue(diff.beforeValue),
        afterValue: this.takeGeneratedExpressionValue(diff.afterValue),
      }
    }
    return diff
  }

  private takeGeneratedExpressionValue(value: unknown): unknown {
    if (!isObject(value) || !this.isGeneratedColumnAttr(value) || value.kind !== AttrKind.GeneratedExpr) {
      return value
    }
    return Reflect.get(value, 'expr')
  }

  private takeGeneratedColumnAttrKind(value: unknown): GeneratedColumnAttrKind | undefined {
    return isObject(value) && this.isGeneratedColumnAttr(value)
      ? value.kind
      : undefined
  }

  private isGeneratedAttrKindSwitch(diff: Diff): boolean {
    if (!isDiffReplace(diff)) {
      return false
    }

    const beforeKind = this.takeGeneratedColumnAttrKind(diff.beforeValue)
    const afterKind = this.takeGeneratedColumnAttrKind(diff.afterValue)

    return (
      (beforeKind === AttrKind.GeneratedExpr && afterKind === PgAttrKind.Identity) ||
      (beforeKind === PgAttrKind.Identity && afterKind === AttrKind.GeneratedExpr)
    )
  }

  private resolveDiffSideValue(diff: Diff): unknown {
    if (isDiffAdd(diff)) {
      return diff.afterValue
    }
    if (isDiffRemove(diff)) {
      return diff.beforeValue
    }
    if (isDiffReplace(diff)) {
      return diff.afterValue ?? diff.beforeValue
    }

    return undefined
  }

  private isGeneratedColumnAttr(value: object): value is { kind: GeneratedColumnAttrKind } {
    return 'kind' in value && (
      value.kind === AttrKind.GeneratedExpr ||
      value.kind === PgAttrKind.Identity
    )
  }

  private findSourceIndexForRow(
    sourceIndexes: readonly Index[],
    indexRow: DdlApiIndexRowValueWithDiffs,
    rowIndex: number,
  ): Index | undefined {
    if (indexRow.indexName && isNamedIndexTitle(indexRow.indexName)) {
      const namedIndex = sourceIndexes.find(index => index.name === indexRow.indexName)
      if (namedIndex) {
        return namedIndex
      }
    }

    return sourceIndexes[rowIndex]
  }

  private resolveArrayElementDiff(
    arrayDiffs: DiffsRecord | undefined,
    elementIndex: number,
  ): Diff | undefined {
    if (!arrayDiffs || elementIndex < 0) {
      return undefined
    }

    return arrayDiffs[String(elementIndex)]
      ?? arrayDiffs[elementIndex]
  }

  private getDiffsRecord(owner: unknown): DiffsRecord | undefined {
    if (typeof owner !== 'object' || owner === null) {
      return undefined
    }

    const { diffsMetaKey } = this.diffMetaKeys
    return takeIfDiffsRecord(Reflect.get(owner, diffsMetaKey))
  }

  private attachInheritedWholeTableDiff(
    rowDiffs: ColumnCrawlDiffsRecord | IndexCrawlDiffsRecord,
    wholeTableDiff: Diff | undefined,
  ): void {
    if (wholeTableDiff && !rowDiffs[NODE_LEVEL_DIFF_KEY]) {
      rowDiffs[NODE_LEVEL_DIFF_KEY] = wholeTableDiff
    }
  }

  private attachInheritedWholeTableDiffToSection(
    section: DdlApiTableOrientedSpecColumnsSectionWithDiffs | DdlApiTableOrientedSpecIndexesSectionWithDiffs,
    wholeTableDiff: Diff | undefined,
  ): void {
    if (!wholeTableDiff) {
      return
    }

    this.mergeDiffsIntoTarget(section, { [NODE_LEVEL_DIFF_KEY]: wholeTableDiff })
  }

  private mergeDiffsIntoTarget(target: object, diffs: DiffsRecord | ColumnCrawlDiffsRecord): void {
    const entries = Object
      .entries(diffs)
      .filter(
        (entry): entry is [string, Diff | DiffsRecord] => entry[1] !== undefined,
      )
    if (entries.length === 0) {
      return
    }

    const { diffsMetaKey } = this.diffMetaKeys
    const existingDiffs = takeIfDiffsRecord(Reflect.get(target, diffsMetaKey)) ?? {}
    Reflect.set(target, diffsMetaKey, {
      ...existingDiffs,
      ...Object.fromEntries(entries),
    })
  }

  private isDdlApiTableOrientedSpecWithDiffs(value: unknown): value is DdlApiTableOrientedSpecWithDiffs {
    if (!this.isDdlApiTableOrientedSpec(value)) {
      return false
    }

    const { diffsMetaKey, aggregatedDiffsMetaKey } = this.diffMetaKeys
    return diffsMetaKey in value || aggregatedDiffsMetaKey in value
  }
}
