import {
  BinaryType,
  BoolType,
  DecimalType,
  EnumType,
  FloatType,
  IntegerType,
  JSONType,
  PgObjectKind,
  SchemaType,
  SpatialType,
  StringType,
  TimeType,
  TypeKind,
  UnsupportedType,
  UUIDType,
} from '@netcracker/qubership-apihub-ddlapi'
import { isObject } from '../../../utilities'

export interface PgDomainSchemaType {
  kind: typeof PgObjectKind.Domain
  type: string
  baseType?: SchemaType
}

export function isPgDomainSchemaType(value: unknown): value is PgDomainSchemaType {
  return isObject(value)
    && value.kind === PgObjectKind.Domain
    && typeof value.type === 'string'
}

export function isBoolType(value: SchemaType): value is BoolType {
  return value.kind === TypeKind.BoolType && typeof value.type === 'string'
}

export function isIntegerType(value: SchemaType): value is IntegerType {
  return value.kind === TypeKind.IntegerType && typeof value.type === 'string'
}

export function isDecimalType(value: SchemaType): value is DecimalType {
  return value.kind === TypeKind.DecimalType && typeof value.type === 'string'
}

export function isFloatType(value: SchemaType): value is FloatType {
  return value.kind === TypeKind.FloatType && typeof value.type === 'string'
}

export function isStringType(value: SchemaType): value is StringType {
  return value.kind === TypeKind.StringType && typeof value.type === 'string'
}

export function isBinaryType(value: SchemaType): value is BinaryType {
  return value.kind === TypeKind.BinaryType && typeof value.type === 'string'
}

export function isTimeType(value: SchemaType): value is TimeType {
  return value.kind === TypeKind.TimeType && typeof value.type === 'string'
}

export function isJSONType(value: SchemaType): value is JSONType {
  return value.kind === TypeKind.JSONType && typeof value.type === 'string'
}

export function isSpatialType(value: SchemaType): value is SpatialType {
  return value.kind === TypeKind.SpatialType && typeof value.type === 'string'
}

export function isUUIDType(value: SchemaType): value is UUIDType {
  return value.kind === TypeKind.UUIDType && typeof value.type === 'string'
}

export function isEnumType(value: SchemaType): value is EnumType {
  return value.kind === TypeKind.EnumType && Array.isArray(value.values)
}

export function isUnsupportedType(value: SchemaType): value is UnsupportedType {
  return value.kind === TypeKind.UnsupportedType && typeof value.type === 'string'
}

export function isSchemaTypeWithTypeName(value: SchemaType): value is SchemaType & { type: string } {
  return typeof value.type === 'string'
}
