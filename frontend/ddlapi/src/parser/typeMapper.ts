// Private module — maps pgsql-parser TypeName AST nodes to ddlapi SchemaType.

import type { TypeName, Node } from '@pgsql/types'
import type { SchemaType } from '../types'
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
    case 'bool':      return boolType('boolean')
    case 'int2':      return integerType('smallint')
    case 'int4':      return integerType('integer')
    case 'int8':      return integerType('bigint')
    case 'float4':    return floatType('real')
    case 'float8':    return floatType('double precision')
    case 'numeric':   return p0 !== undefined ? decimalType('numeric', { precision: p0, scale: p1 }) : decimalType('numeric')
    case 'varchar':   return p0 !== undefined ? stringType('character varying', { size: p0 }) : stringType('character varying')
    case 'bpchar':    return p0 !== undefined ? stringType('character', { size: p0 }) : stringType('character')
    case 'text':      return stringType('text')
    case 'bytea':     return binaryType('bytea')
    case 'date':      return timeType('date')
    case 'time':      return p0 !== undefined ? timeType('time', { precision: p0 }) : timeType('time')
    case 'timetz':    return p0 !== undefined ? timeType('time', { precision: p0 }) : timeType('time')
    case 'timestamp': return p0 !== undefined ? timeType('timestamp', { precision: p0 }) : timeType('timestamp')
    case 'timestamptz': return p0 !== undefined ? timeType('timestamp', { precision: p0 }) : timeType('timestamp')
    case 'interval':  return unsupportedType('interval')
    case 'json':      return jsonType('json')
    case 'jsonb':     return jsonType('jsonb')
    case 'uuid':      return uuidType('uuid')
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
    case 'point':     return spatialType('point')
    case 'line':      return spatialType('line')
    case 'lseg':      return spatialType('lseg')
    case 'box':       return spatialType('box')
    case 'path':      return spatialType('path')
    case 'polygon':   return spatialType('polygon')
    case 'circle':    return spatialType('circle')
    default:          return unsupportedType(pgName)
  }
}

const SERIAL: Record<string, string> = {
  smallserial: 'smallserial', serial2: 'smallserial',
  serial: 'serial',           serial4: 'serial',
  bigserial: 'bigserial',     serial8: 'bigserial',
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
