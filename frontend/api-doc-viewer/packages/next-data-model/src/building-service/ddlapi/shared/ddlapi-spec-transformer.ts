import {
  DdlApiColumnRowValue,
  DdlApiColumnTypeValue,
  DdlApiForeignKeyTarget,
  DdlApiIndexRowValue,
  DdlApiSectionHeaderRowValue,
  DdlApiTableRowValue,
} from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { TableKey } from "@apihub/next-data-model/shared/ddlapi/types/table-key";
import {
  isBinaryType,
  isBoolType,
  isDecimalType,
  isEnumType,
  isFloatType,
  isIntegerType,
  isJSONType,
  isPgDomainSchemaType,
  isSchemaTypeWithTypeName,
  isSpatialType,
  isStringType,
  isTimeType,
  isUnsupportedType,
  isUUIDType,
  PgDomainSchemaType,
} from "@apihub/next-data-model/shared/ddlapi/guards";
import { formatDdlExpr } from "@apihub/next-data-model/shared/ddlapi/format-ddl-expr";
import {
  AttrKind,
  Column,
  ColumnType,
  Expr,
  findAttr,
  ForeignKey,
  Index,
  PgAttrKind,
  PgObjectKind,
  Realm,
  SchemaType,
  Table,
  TypeKind,
} from "@netcracker/qubership-apihub-ddlapi";
import { isObject } from "../../../utilities";
import {
  DDL_API_COLUMNS_SECTION_TITLE,
  DDL_API_INDEXES_SECTION_TITLE,
} from "../json-crawl-entities/transformers/constants/constants";
import { BuildingServiceLogger } from "../../../loggers";

export interface DdlApiTableOrientedSpecColumnsSection extends DdlApiSectionHeaderRowValue {
  readonly items: readonly DdlApiColumnRowValue[];
}

export interface DdlApiTableOrientedSpecIndexesSection extends DdlApiSectionHeaderRowValue {
  readonly items: readonly DdlApiIndexRowValue[];
}

/** Crawl-ready table document produced from a normalized or merged DDL source. */
export interface DdlApiTableOrientedSpec extends DdlApiTableRowValue {
  readonly columns: DdlApiTableOrientedSpecColumnsSection;
  readonly indexes: DdlApiTableOrientedSpecIndexesSection;
}

export class DdlApiSpecTransformer {
  constructor(
    protected readonly logger: BuildingServiceLogger,
  ) { }

  public transformSourceToTableOrientedSpec(
    source: unknown,
    tableKey: TableKey,
  ): DdlApiTableOrientedSpec | null {
    if (this.isDdlApiTableOrientedSpec(source)) {
      return source
    }

    const realm = this.extractRealm(source)
    if (!realm) {
      this.logger.debug('[DDL API] Unsupported source shape for table key:', tableKey, source)
      return null
    }

    const table = this.findTableInRealm(realm, tableKey)
    if (!table) {
      this.logger.debug(
        '[DDL API] Table not found in realm:',
        tableKey,
        'available schemas:',
        realm.schemas.map(schema => schema.name),
      )
      return null
    }

    return this.buildTableOrientedSpecFromRealm(realm, table, tableKey)
  }

  protected buildTableOrientedSpecFromRealm(
    realm: Realm,
    table: Table,
    tableKey: TableKey,
  ): DdlApiTableOrientedSpec {
    const tableComment = findAttr(table.attrs, AttrKind.Comment)

    return {
      tableName: table.name,
      schemaName: tableKey.schemaName,
      ...(tableComment ? { description: tableComment.text } : {}),
      columns: {
        title: DDL_API_COLUMNS_SECTION_TITLE,
        items: (table.columns ?? []).map(column =>
          this.buildColumnRowValue(realm, table, column, tableKey.schemaName),
        ),
      },
      indexes: {
        title: DDL_API_INDEXES_SECTION_TITLE,
        items: (table.indexes ?? []).map(index => this.buildIndexRowValue(index)),
      },
    }
  }

  protected extractRealm(source: unknown): Realm | null {
    if (this.isRealm(source)) {
      return source
    }

    if (isObject(source) && this.isRealm(source.realm)) {
      return source.realm
    }

    return null
  }

  protected findTableInRealm(realm: Realm, tableKey: TableKey): Table | undefined {
    const schema = realm.schemas.find(currentSchema => currentSchema.name === tableKey.schemaName)
    if (!schema) {
      return undefined
    }

    return schema.tables?.find(currentTable => currentTable.name === tableKey.name)
  }

  protected isRealm(value: unknown): value is Realm {
    if (!isObject(value)) {
      return false
    }
    return typeof value.ddlapi === 'string' && Array.isArray(value.schemas)
  }

  protected isDdlApiTableOrientedSpec(value: unknown): value is DdlApiTableOrientedSpec {
    if (!isObject(value)) {
      return false
    }
    if (typeof value.tableName !== 'string') {
      return false
    }
    if (!isObject(value.columns) || !Array.isArray(value.columns.items)) {
      return false
    }
    if (!isObject(value.indexes) || !Array.isArray(value.indexes.items)) {
      return false
    }
    return true
  }

  private buildColumnRowValue(
    realm: Realm,
    table: Table,
    column: Column,
    owningSchemaName: string,
  ): DdlApiColumnRowValue {
    const comment = findAttr(column.attrs, AttrKind.Comment)
    const identity = column.attrs?.find(attribute => attribute.kind === PgAttrKind.Identity)
    const generatedExpr = findAttr(column.attrs, AttrKind.GeneratedExpr)
    const isGenerated = identity !== undefined || generatedExpr !== undefined
    const foreignKey = this.findForeignKeyForColumn(table, column)
    const isForeignKey = foreignKey !== undefined
    const foreignKeyTarget = isForeignKey && foreignKey
      ? this.buildForeignKeyTarget(realm, foreignKey, column, owningSchemaName)
      : undefined

    const columnType = this.formatColumnType(column.type)
    const schemaType = column.type?.type
    const enumValues = schemaType && isEnumType(schemaType) ? schemaType.values : undefined

    return {
      columnName: column.name,
      columnType,
      ...(enumValues ? { enumValues } : {}),
      isPrimaryKey: this.isPrimaryKeyColumn(table, column),
      isForeignKey,
      ...(foreignKeyTarget ? { foreignKeyTarget } : {}),
      isGenerated,
      ...(identity ? { generatedBy: 'identity' as const } : {}),
      ...(generatedExpr && !identity ? { generatedBy: 'expression' as const } : {}),
      ...(generatedExpr ? { generatedExpression: generatedExpr.expr } : {}),
      isUnique: this.isUniqueColumn(table, column),
      isNotNull: column.type?.null === false,
      ...(column.default !== undefined ? { defaultValue: formatDdlExpr(column.default) } : {}),
      ...(comment ? { description: comment.text } : {}),
    }
  }

  private buildIndexRowValue(index: Index): DdlApiIndexRowValue {
    const partNames = (index.parts ?? [])
      .slice()
      .sort((left, right) => left.seqNo - right.seqNo)
      .map(part => this.formatIndexPartName(part))
      .filter(partName => partName.length > 0)

    const comment = findAttr(index.attrs, AttrKind.Comment)

    return {
      ...(index.name ? { indexName: index.name } : {}),
      partNames,
      isUnique: index.unique === true,
      ...(comment ? { description: comment.text } : {}),
    }
  }

  private findSchemaNameForTable(realm: Realm, table: Table): string | undefined {
    for (const schema of realm.schemas) {
      if (schema.tables?.some(currentTable => currentTable === table)) {
        return schema.name
      }
    }
    return undefined
  }

  private isPrimaryKeyColumn(table: Table, column: Column): boolean {
    return (table.primaryKey?.parts ?? []).some(part => part.column === column)
  }

  private isUniqueColumn(table: Table, column: Column): boolean {
    return (table.indexes ?? []).some(index =>
      index.unique === true
      && index.parts?.length === 1
      && index.parts[0]?.column === column,
    )
  }

  private isSameForeignKeyColumn(foreignKeyColumn: Column, column: Column): boolean {
    return foreignKeyColumn === column || foreignKeyColumn.name === column.name
  }

  private findForeignKeyForColumn(table: Table, column: Column): ForeignKey | undefined {
    return table.foreignKeys?.find(foreignKey =>
      foreignKey.columns?.some(foreignKeyColumn => this.isSameForeignKeyColumn(foreignKeyColumn, column)),
    )
  }

  private buildForeignKeyTarget(
    realm: Realm,
    foreignKey: ForeignKey,
    column: Column,
    owningSchemaName: string,
  ): DdlApiForeignKeyTarget | undefined {
    const columnIndex = foreignKey.columns?.findIndex(foreignKeyColumn =>
      this.isSameForeignKeyColumn(foreignKeyColumn, column),
    ) ?? -1
    if (columnIndex < 0) {
      return undefined
    }

    const refTable = foreignKey.refTable
    const refColumn = foreignKey.refColumns?.[columnIndex]
    if (!refTable || !refColumn) {
      return undefined
    }

    const schemaName = this.resolveForeignKeyTargetSchemaName(realm, refTable, owningSchemaName)
    if (!schemaName) {
      return undefined
    }

    return {
      schemaName,
      tableName: refTable.name,
      columnName: refColumn.name,
    }
  }

  /**
   * Resolves the schema that owns `refTable`. Prefer referential lookup in the realm
   * (canonical after `buildFromDdl`); fall back to a unique name match, then the
   * owning table's schema for single-table / partial realms where `refTable` is
   * embedded but omitted from `schema.tables`.
   */
  private resolveForeignKeyTargetSchemaName(
    realm: Realm,
    refTable: Table,
    owningSchemaName: string,
  ): string | undefined {
    const schemaByReference = this.findSchemaNameForTable(realm, refTable)
    if (schemaByReference) {
      return schemaByReference
    }

    const schemaByUniqueTableName = this.findUniqueSchemaNameForTableName(realm, refTable.name)
    if (schemaByUniqueTableName) {
      return schemaByUniqueTableName
    }

    return owningSchemaName
  }

  private findUniqueSchemaNameForTableName(realm: Realm, tableName: string): string | undefined {
    const matchingSchemaNames = realm.schemas
      .filter(schema => schema.tables?.some(currentTable => currentTable.name === tableName))
      .map(schema => schema.name)

    if (matchingSchemaNames.length === 1) {
      return matchingSchemaNames[0]
    }

    return undefined
  }

  private formatColumnType(columnType: ColumnType | undefined): DdlApiColumnTypeValue {
    if (columnType?.raw) {
      return {
        kind: 'Raw',
        raw: columnType.raw,
        label: columnType.raw,
      }
    }

    if (!columnType?.type) {
      return {
        kind: 'Raw',
        raw: 'unknown',
        label: 'unknown',
      }
    }

    return this.formatSchemaType(columnType.type)
  }

  private formatSchemaType(schemaType: SchemaType): DdlApiColumnTypeValue {
    if (isPgDomainSchemaType(schemaType)) {
      return this.formatPgDomainType(schemaType)
    }

    const label = this.formatSchemaTypeLabel(schemaType)

    if (isBoolType(schemaType)) {
      return { kind: TypeKind.BoolType, typeName: schemaType.type, label }
    }
    if (isIntegerType(schemaType)) {
      return {
        kind: TypeKind.IntegerType,
        typeName: schemaType.type,
        label,
        ...(schemaType.unsigned !== undefined ? { unsigned: schemaType.unsigned } : {}),
      }
    }
    if (isDecimalType(schemaType)) {
      return {
        kind: TypeKind.DecimalType,
        typeName: schemaType.type,
        label,
        ...(schemaType.precision !== undefined ? { precision: schemaType.precision } : {}),
        ...(schemaType.scale !== undefined ? { scale: schemaType.scale } : {}),
        ...(schemaType.unsigned !== undefined ? { unsigned: schemaType.unsigned } : {}),
      }
    }
    if (isFloatType(schemaType)) {
      return {
        kind: TypeKind.FloatType,
        typeName: schemaType.type,
        label,
        ...(schemaType.precision !== undefined ? { precision: schemaType.precision } : {}),
        ...(schemaType.unsigned !== undefined ? { unsigned: schemaType.unsigned } : {}),
      }
    }
    if (isStringType(schemaType)) {
      return {
        kind: TypeKind.StringType,
        typeName: schemaType.type,
        label,
        ...(schemaType.size !== undefined ? { size: schemaType.size } : {}),
      }
    }
    if (isBinaryType(schemaType)) {
      return {
        kind: TypeKind.BinaryType,
        typeName: schemaType.type,
        label,
        ...(schemaType.size !== undefined ? { size: schemaType.size } : {}),
      }
    }
    if (isTimeType(schemaType)) {
      return {
        kind: TypeKind.TimeType,
        typeName: schemaType.type,
        label,
        ...(schemaType.precision !== undefined ? { precision: schemaType.precision } : {}),
        ...(schemaType.scale !== undefined ? { scale: schemaType.scale } : {}),
      }
    }
    if (isJSONType(schemaType)) {
      return { kind: TypeKind.JSONType, typeName: schemaType.type, label }
    }
    if (isSpatialType(schemaType)) {
      return { kind: TypeKind.SpatialType, typeName: schemaType.type, label }
    }
    if (isUUIDType(schemaType)) {
      return { kind: TypeKind.UUIDType, typeName: schemaType.type, label }
    }
    if (isEnumType(schemaType)) {
      return {
        kind: TypeKind.EnumType,
        label,
        ...(schemaType.type !== undefined ? { typeName: schemaType.type } : {}),
        values: schemaType.values,
      }
    }
    if (isUnsupportedType(schemaType)) {
      return { kind: TypeKind.UnsupportedType, typeName: schemaType.type, label }
    }

    return { kind: schemaType.kind, label: isSchemaTypeWithTypeName(schemaType) ? schemaType.type : schemaType.kind }
  }

  private formatPgDomainType(domainType: PgDomainSchemaType): DdlApiColumnTypeValue {
    const baseTypeLabel = domainType.baseType ? this.formatSchemaTypeLabel(domainType.baseType) : undefined
    return {
      kind: PgObjectKind.Domain,
      name: domainType.type,
      label: domainType.type,
      ...(baseTypeLabel ? { baseTypeLabel } : {}),
    }
  }

  private formatSchemaTypeLabel(schemaType: SchemaType): string {
    let label: string

    if (isDecimalType(schemaType)) {
      label = this.formatParameterizedTypeLabel(schemaType.type, schemaType.precision, schemaType.scale)
    } else if (isStringType(schemaType)) {
      label = this.formatParameterizedTypeLabel(schemaType.type, schemaType.size)
    } else if (isBinaryType(schemaType)) {
      label = this.formatParameterizedTypeLabel(schemaType.type, schemaType.size)
    } else if (isFloatType(schemaType)) {
      label = this.formatParameterizedTypeLabel(schemaType.type, schemaType.precision)
    } else if (isTimeType(schemaType)) {
      label = this.formatParameterizedTypeLabel(schemaType.type, schemaType.precision, schemaType.scale)
    } else if (isEnumType(schemaType)) {
      label = schemaType.type ?? schemaType.values[0] ?? 'enum'
    } else if (isSchemaTypeWithTypeName(schemaType)) {
      label = schemaType.type
    } else {
      label = schemaType.kind
    }

    return this.normalizeTypeLabelSpacing(label)
  }

  /** Ensures a space before `(` when parameters are embedded in the type string (e.g. `bit(8)`). */
  private normalizeTypeLabelSpacing(label: string): string {
    return label.replace(/(?<=\S)\(/g, ' (')
  }

  private formatParameterizedTypeLabel(typeName: string, ...parameters: readonly (number | undefined)[]): string {
    const definedParameters = parameters.filter((parameter): parameter is number => parameter !== undefined)
    if (definedParameters.length === 0) {
      return typeName
    }
    return `${typeName} (${definedParameters.join(', ')})`
  }

  private formatIndexPartName(part: { column?: { name: string }; expr?: Expr }): string {
    if (part.column?.name) {
      return part.column.name
    }

    if (!part.expr) {
      return ''
    }

    return formatDdlExpr(part.expr)
  }
}
