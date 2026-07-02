// Private module — handles CREATE TYPE (enum, composite, range).

import type { CreateEnumStmt, CompositeTypeStmt, CreateRangeStmt, RawStmt } from '@pgsql/types'
import type { Column, SchemaObject } from '../../schema'
import type { SchemaType } from '../../types'
import { DdlErrorKind, ObjectKind } from '../../constants'
import { PgObjectKind } from '../../postgres.constants'
import { enumType, unsupportedType } from '../../factories'
import { mapTypeName } from '../typeMapper'
import type { SchemaAccumulator } from '../schemaAccumulator'
import { strVal, stmtRangeOf, unwrapNode } from '../astHelpers'
import { PgNode } from '../pgAst'
import type { DdlNonFatalError } from '../buildFromDdl'

// ── CREATE TYPE ... AS ENUM ───────────────────────────────────────────────────

export function handleCreateEnum(
  stmt: CreateEnumStmt,
  rawStmt: RawStmt,
  defaultSchemaName: string,
  acc: SchemaAccumulator,
  onError: (e: DdlNonFatalError) => void,
): void {
  const typeNameParts = stmt.typeName ?? []
  const typeName = strVal(typeNameParts[typeNameParts.length - 1])
  if (!typeName) return
  const schemaName =
    typeNameParts.length > 1
      ? (strVal(typeNameParts[typeNameParts.length - 2]) ?? defaultSchemaName)
      : defaultSchemaName
  const qualifiedName = `${schemaName}.${typeName}`

  // Duplicate check
  if (acc.typeRegistry.has(qualifiedName)) {
    const range = stmtRangeOf(rawStmt)
    onError({
      kind: DdlErrorKind.DuplicateObject,
      objectKind: ObjectKind.EnumType,
      qualifiedName,
      message: `Duplicate type: ${qualifiedName}`,
      ...(range && { range }),
    })
    return
  }

  const vals = stmt.vals ?? []
  const values = vals.map(v => strVal(v) ?? '').filter(Boolean)

  const et = enumType(values, { type: typeName })

  acc.registerType(schemaName, typeName, et as SchemaType & SchemaObject)
}

// ── CREATE TYPE ... AS (...) (composite) ──────────────────────────────────────

export function handleCreateCompositeType(
  stmt: CompositeTypeStmt,
  rawStmt: RawStmt,
  defaultSchemaName: string,
  acc: SchemaAccumulator,
  onError: (e: DdlNonFatalError) => void,
): void {
  const typevar = stmt.typevar
  if (!typevar) return

  const typeName = typevar.relname ?? 'unknown'
  const schemaName = typevar.schemaname ?? defaultSchemaName
  const qualifiedName = `${schemaName}.${typeName}`

  // Duplicate check
  if (acc.typeNameLookup.has(qualifiedName)) {
    const range = stmtRangeOf(rawStmt)
    onError({
      kind: DdlErrorKind.DuplicateObject,
      objectKind: PgObjectKind.CompositeType,
      qualifiedName,
      message: `Duplicate type: ${qualifiedName}`,
      ...(range && { range }),
    })
    return
  }

  const coldeflist = stmt.coldeflist ?? []
  const fields: Column[] = coldeflist.map(n => {
    const cd = unwrapNode(n, PgNode.ColumnDef)
    if (!cd) return { name: 'unknown' } as Column
    const colName = cd.colname ?? 'unknown'
    const tn = cd.typeName
    const type = tn ? mapTypeName(tn) : unsupportedType('unknown')
    return {
      name: colName,
      type: { type },
    } as Column
  })

  const obj: SchemaObject = {
    kind: PgObjectKind.CompositeType,
    name: typeName,
    fields,
  } as SchemaObject

  acc.addSchemaObject(schemaName, obj)
}

// ── CREATE TYPE ... AS RANGE ──────────────────────────────────────────────────

export function handleCreateRangeType(
  stmt: CreateRangeStmt,
  rawStmt: RawStmt,
  defaultSchemaName: string,
  acc: SchemaAccumulator,
  onError: (e: DdlNonFatalError) => void,
): void {
  const typeNameParts = stmt.typeName ?? []
  const typeName = strVal(typeNameParts[typeNameParts.length - 1])
  if (!typeName) return
  const schemaName =
    typeNameParts.length > 1
      ? (strVal(typeNameParts[typeNameParts.length - 2]) ?? defaultSchemaName)
      : defaultSchemaName
  const qualifiedName = `${schemaName}.${typeName}`

  // Duplicate check
  if (acc.typeNameLookup.has(qualifiedName)) {
    const range = stmtRangeOf(rawStmt)
    onError({
      kind: DdlErrorKind.DuplicateObject,
      objectKind: PgObjectKind.RangeType,
      qualifiedName,
      message: `Duplicate type: ${qualifiedName}`,
      ...(range && { range }),
    })
    return
  }

  // Extract range params (subtype and others)
  const params = stmt.params ?? []
  let subtype: string | undefined
  const rangeParams: Record<string, string> = {}

  for (const p of params) {
    const de = unwrapNode(p, PgNode.DefElem)
    if (!de) continue
    const name = de.defname
    const arg = de.arg
    if (!name || !arg) continue

    if (name === 'subtype') {
      const tn = unwrapNode(arg, PgNode.TypeName)
      if (tn?.names) {
        subtype = strVal(tn.names[tn.names.length - 1])
      }
    } else {
      // Other range options (canonical, subtype_diff, etc.) — stored as-is
      const sval = strVal(arg)
      rangeParams[name] = sval ?? String(name)
    }
  }

  const obj: SchemaObject = {
    kind: PgObjectKind.RangeType,
    name: typeName,
    ...(subtype !== undefined && { subtype }),
    ...(Object.keys(rangeParams).length > 0 && { params: rangeParams }),
  } as SchemaObject

  acc.addSchemaObject(schemaName, obj)
}
