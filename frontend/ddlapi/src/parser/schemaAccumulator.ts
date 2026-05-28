// Private module — mutable builder state for the two-pass parser.

import type { SchemaType } from '../types'
import type { Table, Schema, SchemaObject, Column, Index, IndexPart, ForeignKey, Realm } from '../schema'
import { DDLAPI_VERSION } from '../schema'
import type { Attr } from '../attrs'
import type { SourceRange } from './positions'

export type PendingLike = {
  table: Table
  tableKey: string
  sourceKey: string
  stmtRange?: SourceRange
}

export type PendingFK = {
  fk: ForeignKey
  tableKey: string
  refTableKey: string     // resolved "schema.table" key
  refColumnNames: string[]
}

export type PendingIndexPart = {
  part: IndexPart
  columnKey: string       // "schema.table.column"
}

export type OrphanIndex = {
  index: Index
  tableKey: string        // target "schema.table"
  schemaName: string
}

type MutableSchema = {
  name: string
  tables: Table[]
  objects: SchemaObject[]
}

export class SchemaAccumulator {
  private readonly schemas = new Map<string, MutableSchema>()

  readonly tableRegistry = new Map<string, Table>()
  readonly columnRegistry = new Map<string, Column>()
  readonly typeRegistry = new Map<string, SchemaType>()
  /** key: "schemaName.indexName" — populated by createIndex and createTable handlers */
  readonly indexRegistry = new Map<string, Index>()
  /** key: "schemaName.typeName" — covers enum, domain, composite, range */
  readonly typeNameLookup = new Map<string, SchemaObject>()

  readonly pendingLikes: PendingLike[] = []
  readonly pendingFKs: PendingFK[] = []
  readonly pendingIndexParts: PendingIndexPart[] = []
  readonly orphanIndexes: OrphanIndex[] = []

  private readonly skippedTables = new Set<string>()

  getOrCreateSchema(name: string): { tables: Table[]; objects: SchemaObject[] } {
    let s = this.schemas.get(name)
    if (!s) {
      s = { name, tables: [], objects: [] }
      this.schemas.set(name, s)
    }
    return s
  }

  registerTable(schemaName: string, table: Table): void {
    const key = `${schemaName}.${table.name}`
    this.getOrCreateSchema(schemaName).tables.push(table)
    this.tableRegistry.set(key, table)
  }

  registerColumn(schemaName: string, tableName: string, col: Column): void {
    this.columnRegistry.set(`${schemaName}.${tableName}.${col.name}`, col)
  }

  registerType(schemaName: string, typeName: string, type: SchemaType & SchemaObject): void {
    this.getOrCreateSchema(schemaName).objects.push(type as SchemaObject)
    this.typeRegistry.set(`${schemaName}.${typeName}`, type as SchemaType)
    this.typeNameLookup.set(`${schemaName}.${typeName}`, type as SchemaObject)
  }

  registerOrphanIndex(index: Index, tableKey: string, schemaName: string): void {
    this.getOrCreateSchema(schemaName).objects.push(index)
    this.orphanIndexes.push({ index, tableKey, schemaName })
  }

  addSchemaObject(schemaName: string, obj: SchemaObject): void {
    this.getOrCreateSchema(schemaName).objects.push(obj)
    // Register named objects (composite/range types) in typeNameLookup for COMMENT ON TYPE
    const name = (obj as { name?: string }).name
    if (name) {
      this.typeNameLookup.set(`${schemaName}.${name}`, obj)
    }
  }

  skipTable(tableKey: string): void {
    this.skippedTables.add(tableKey)
  }

  isSkipped(tableKey: string): boolean {
    return this.skippedTables.has(tableKey)
  }

  removeTable(schemaName: string, tableName: string): void {
    this.tableRegistry.delete(`${schemaName}.${tableName}`)
    const schema = this.schemas.get(schemaName)
    if (schema) {
      const idx = schema.tables.findIndex(t => t.name === tableName)
      if (idx !== -1) schema.tables.splice(idx, 1)
    }
  }

  removeFromSchemaObjects(schemaName: string, obj: SchemaObject): void {
    const schema = this.schemas.get(schemaName)
    if (schema) {
      const idx = schema.objects.indexOf(obj)
      if (idx !== -1) schema.objects.splice(idx, 1)
    }
  }

  /**
   * Appends an index to an existing table's indexes array.
   * Centralises the `as unknown` cast needed to mutate readonly Table.indexes.
   */
  appendTableIndex(tableKey: string, index: Index): void {
    const table = this.tableRegistry.get(tableKey)
    if (!table) return
    const existing = (table.indexes ?? []) as Index[]
      ; (table as unknown as Record<string, unknown>)['indexes'] = [...existing, index]
  }

  /**
   * Appends a single attr to an existing table's attrs array.
   * Centralises the `as unknown` cast needed to mutate readonly Table.attrs.
   */
  appendTableAttr(tableKey: string, attr: Attr): void {
    const table = this.tableRegistry.get(tableKey)
    if (!table) return
    const existing = (table.attrs ?? []) as Attr[]
      ; (table as unknown as Record<string, unknown>)['attrs'] = [...existing, attr]
  }

  buildRealm(): Realm {
    const schemasList: Schema[] = []
    for (const [, s] of this.schemas) {
      const schema: Schema = {
        name: s.name,
        ...(s.tables.length > 0 && { tables: s.tables }),
        ...(s.objects.length > 0 && { objects: s.objects }),
      }
      schemasList.push(schema)
    }
    return { ddlapi: DDLAPI_VERSION, schemas: schemasList }
  }
}
