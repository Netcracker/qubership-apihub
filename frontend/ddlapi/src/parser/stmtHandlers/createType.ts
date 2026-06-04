// Private module — handles CREATE TYPE (enum, composite, range).

import type { CreateEnumStmt, CompositeTypeStmt, CreateRangeStmt, RawStmt, Node, ColumnDef, TypeName } from '@pgsql/types'
import type { Column, SchemaObject } from '../../schema'
import type { SchemaType } from '../../types'
import { DdlErrorKind } from '../../constants'
import { PgObjectKind } from '../../postgres.constants'
import { enumType, unsupportedType } from '../../factories'
import { mapTypeName } from '../typeMapper'
import type { SchemaAccumulator } from '../schemaAccumulator'
import { strVal, stmtRangeOf } from '../astHelpers'
import type { DdlNonFatalError } from '../buildFromDdl'

// ── CREATE TYPE ... AS ENUM ───────────────────────────────────────────────────

export function handleCreateEnum(
  stmt: CreateEnumStmt,
  rawStmt: RawStmt,
  defaultSchemaName: string,
  acc: SchemaAccumulator,
  onError: (e: DdlNonFatalError) => void,
): void {
  const typeNameParts = (stmt.typeName ?? []) as Node[]
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
      objectKind: 'EnumType',
      qualifiedName,
      message: `Duplicate type: ${qualifiedName}`,
      ...(range && { range }),
    })
    return
  }

  const vals = (stmt.vals ?? []) as Node[]
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
  const schemaName = (typevar as { schemaname?: string }).schemaname ?? defaultSchemaName
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

  const coldeflist = (stmt.coldeflist ?? []) as Node[]
  const fields: Column[] = coldeflist.map(n => {
    const cd = (n as Record<string, unknown>)['ColumnDef'] as ColumnDef | undefined
    if (!cd) return { name: 'unknown' } as Column
    const colName = cd.colname ?? 'unknown'
    const tn = cd.typeName as TypeName | undefined
    const type = tn ? mapTypeName(tn) : unsupportedType('unknown')
    return {
      name: colName,
      type: { type },
    } as Column
  })

  const obj: SchemaObject = {
    kind: PgObjectKind.CompositeType,
    name: typeName,
    schema: schemaName,
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
  const typeNameParts = (stmt.typeName ?? []) as Node[]
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
  const params = (stmt.params ?? []) as Node[]
  let subtype: string | undefined
  const rangeParams: Record<string, string> = {}

  for (const p of params) {
    const de = (p as Record<string, unknown>)['DefElem'] as Record<string, unknown> | undefined
    if (!de) continue
    const name = de['defname'] as string | undefined
    const arg = de['arg'] as Node | undefined
    if (!name || !arg) continue

    if (name === 'subtype') {
      const tn = (arg as Record<string, unknown>)['TypeName'] as { names?: Node[] } | undefined
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
    schema: schemaName,
    ...(subtype !== undefined && { subtype }),
    ...(Object.keys(rangeParams).length > 0 && { params: rangeParams }),
  } as SchemaObject

  acc.addSchemaObject(schemaName, obj)
}
