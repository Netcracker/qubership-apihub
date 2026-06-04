// Private module — maps pgsql-parser TypeName AST nodes to ddlapi SchemaType.

import type { TypeName, Node } from '@pgsql/types'
import type { SchemaType } from '../types'
import { SqlTypeName } from '../constants'
import { PgSqlTypeName } from '../postgres.constants'
import {
  boolType, integerType, decimalType, floatType, stringType,
  binaryType, timeType, jsonType, spatialType, uuidType, unsupportedType,
} from '../factories'

function ival(node: Node): number | undefined {
  const c = (node as Record<string, unknown>)['A_Const'] as Record<string, unknown> | undefined
  if (!c) return undefined
  const iv = (c['ival'] as Record<string, unknown> | undefined)?.['ival']
  return typeof iv === 'number' ? iv : undefined
}

function typmod(typmods: Node[] | undefined, i: number): number | undefined {
  if (!typmods || i >= typmods.length) return undefined
  const n = typmods[i]
  return n ? ival(n) : undefined
}

function sval(node: Node | undefined): string | undefined {
  if (!node) return undefined
  const s = (node as Record<string, unknown>)['String'] as Record<string, unknown> | undefined
  return typeof s?.['sval'] === 'string' ? (s['sval'] as string) : undefined
}

function pgCatalog(pgName: string, typmods?: Node[]): SchemaType {
  const p0 = typmod(typmods, 0)
  const p1 = typmod(typmods, 1)
  switch (pgName) {
    case 'bool':      return boolType(SqlTypeName.Boolean)
    case 'int2':      return integerType(SqlTypeName.SmallInt)
    case 'int4':      return integerType(SqlTypeName.Integer)
    case 'int8':      return integerType(SqlTypeName.BigInt)
    case 'float4':    return floatType(SqlTypeName.Real)
    case 'float8':    return floatType(SqlTypeName.DoublePrecision)
    case 'numeric':   return p0 !== undefined ? decimalType(SqlTypeName.Numeric, { precision: p0, scale: p1 }) : decimalType(SqlTypeName.Numeric)
    case 'varchar':   return p0 !== undefined ? stringType(SqlTypeName.Varchar, { size: p0 }) : stringType(SqlTypeName.Varchar)
    case 'bpchar':    return p0 !== undefined ? stringType(SqlTypeName.Char, { size: p0 }) : stringType(SqlTypeName.Char)
    case 'text':      return stringType(PgSqlTypeName.Text)
    case 'bytea':     return binaryType(PgSqlTypeName.Bytea)
    case 'date':      return timeType(SqlTypeName.Date)
    case 'time':      return p0 !== undefined ? timeType(SqlTypeName.Time, { precision: p0 }) : timeType(SqlTypeName.Time)
    case 'timetz':    return p0 !== undefined ? timeType(SqlTypeName.Time, { precision: p0 }) : timeType(SqlTypeName.Time)
    case 'timestamp': return p0 !== undefined ? timeType(SqlTypeName.Timestamp, { precision: p0 }) : timeType(SqlTypeName.Timestamp)
    case 'timestamptz': return p0 !== undefined ? timeType(SqlTypeName.Timestamp, { precision: p0 }) : timeType(SqlTypeName.Timestamp)
    case 'interval':  return unsupportedType('interval')
    case 'json':      return jsonType(PgSqlTypeName.Json)
    case 'jsonb':     return jsonType(PgSqlTypeName.Jsonb)
    case 'uuid':      return uuidType(PgSqlTypeName.Uuid)
    case 'xml':       return unsupportedType('xml')
    case 'money':     return unsupportedType('money')
    case 'bit':       return unsupportedType(p0 !== undefined ? `bit(${p0})` : 'bit')
    case 'varbit':    return unsupportedType(p0 !== undefined ? `bit varying(${p0})` : 'bit varying')
    case 'inet':      return unsupportedType('inet')
    case 'cidr':      return unsupportedType('cidr')
    case 'macaddr':   return unsupportedType('macaddr')
    case 'macaddr8':  return unsupportedType('macaddr8')
    case 'tsvector':  return unsupportedType('tsvector')
    case 'tsquery':   return unsupportedType('tsquery')
    case 'point':     return spatialType(PgSqlTypeName.Point)
    case 'line':      return spatialType(PgSqlTypeName.Line)
    case 'lseg':      return spatialType(PgSqlTypeName.Lseg)
    case 'box':       return spatialType(PgSqlTypeName.Box)
    case 'path':      return spatialType(PgSqlTypeName.Path)
    case 'polygon':   return spatialType(PgSqlTypeName.Polygon)
    case 'circle':    return spatialType(PgSqlTypeName.Circle)
    default:          return unsupportedType(pgName)
  }
}

const SERIAL: Record<string, string> = {
  smallserial: PgSqlTypeName.SmallSerial, serial2: PgSqlTypeName.SmallSerial,
  serial:      PgSqlTypeName.Serial,      serial4: PgSqlTypeName.Serial,
  bigserial:   PgSqlTypeName.BigSerial,   serial8: PgSqlTypeName.BigSerial,
}

/** Maps a pgsql-parser TypeName AST node to a ddlapi SchemaType. */
export function mapTypeName(tn: TypeName): SchemaType {
  const names = tn.names ?? []

  if (tn.arrayBounds && tn.arrayBounds.length > 0) {
    return unsupportedType(names.map(n => sval(n) ?? '').filter(Boolean).join('.'))
  }

  const s0 = sval(names[0])
  const s1 = sval(names[1])

  if (s0 === 'pg_catalog' && s1) return pgCatalog(s1, tn.typmods)
  if (s0 && SERIAL[s0])          return integerType(SERIAL[s0])
  if (!s0)                        return unsupportedType('unknown')

  // pgsql-parser emits some built-in types without pg_catalog prefix
  // (e.g. bytea, text, jsonb, uuid).  pgCatalog() returns unsupportedType
  // for unrecognised names, which is also the correct fallback for
  // unqualified user-defined types like `mood`.
  if (!s1) return pgCatalog(s0, tn.typmods)

  return unsupportedType(`${s0}.${s1}`)
}

/**
 * Returns the raw type name string for a TypeName node.
 * Used to store the unresolved name in unsupportedType until pass-2 upgrade.
 */
export function rawTypeName(tn: TypeName): string {
  const names = tn.names ?? []
  const s0 = sval(names[0])
  const s1 = sval(names[1])
  if (s0 === 'pg_catalog') return s1 ?? 'unknown'
  if (!s0) return 'unknown'
  return s1 ? `${s0}.${s1}` : s0
}
