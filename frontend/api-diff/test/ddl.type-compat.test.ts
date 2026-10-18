import { SqlTypeName, TypeKind } from '@netcracker/qubership-apihub-ddlapi'
import { consumptionFamily, sameConsumptionFamily } from '../src/ddl/ddl.classify'
import { DIALECT_DIFF_POSTGRES, TypeConsumptionFamily } from '../src/ddl'

// Pure-function tests for the SQL type-compatibility model. No engine.

const type = (kind: string, sqlType = 'x') => ({ kind, type: sqlType })
const family = (kind: string, sqlType?: string) =>
  consumptionFamily(type(kind, sqlType), DIALECT_DIFF_POSTGRES)
const same = (a: string, b: string) =>
  sameConsumptionFamily(type(a), type(b), DIALECT_DIFF_POSTGRES)
const sameTemporal = (a: string, b: string) =>
  sameConsumptionFamily(type(TypeKind.TimeType, a), type(TypeKind.TimeType, b), DIALECT_DIFF_POSTGRES)

describe('consumptionFamily (core kinds)', () => {
  it('maps each core kind to its family', () => {
    expect(family(TypeKind.BoolType)).toBe(TypeConsumptionFamily.Boolean)
    expect(family(TypeKind.IntegerType)).toBe(TypeConsumptionFamily.Numeric)
    expect(family(TypeKind.DecimalType)).toBe(TypeConsumptionFamily.Numeric)
    expect(family(TypeKind.FloatType)).toBe(TypeConsumptionFamily.Numeric)
    expect(family(TypeKind.StringType)).toBe(TypeConsumptionFamily.Textual)
    expect(family(TypeKind.BinaryType)).toBe(TypeConsumptionFamily.Binary)
    expect(family(TypeKind.JSONType)).toBe(TypeConsumptionFamily.Json)
    expect(family(TypeKind.UUIDType)).toBe(TypeConsumptionFamily.Uuid)
    expect(family(TypeKind.EnumType)).toBe(TypeConsumptionFamily.Enum)
  })

  it('gives each SQL temporal type its own family', () => {
    expect(family(TypeKind.TimeType, SqlTypeName.Date)).toBe(TypeConsumptionFamily.Date)
    expect(family(TypeKind.TimeType, SqlTypeName.Time)).toBe(TypeConsumptionFamily.Time)
    expect(family(TypeKind.TimeType, SqlTypeName.Timestamp)).toBe(TypeConsumptionFamily.Timestamp)
  })

  it('maps Spatial / Unsupported / unknown kinds to opaque', () => {
    expect(family(TypeKind.SpatialType)).toBe(TypeConsumptionFamily.Opaque)
    // A temporal type the core does not model falls through the same way.
    expect(family(TypeKind.TimeType, 'interval')).toBe(TypeConsumptionFamily.Opaque)
    expect(family(TypeKind.UnsupportedType)).toBe(TypeConsumptionFamily.Opaque)
    expect(family('SomePgEscapeHatchType')).toBe(TypeConsumptionFamily.Opaque)
  })
})

describe('sameConsumptionFamily', () => {
  it('intra-family ⇒ true (non-breaking)', () => {
    // numeric: smallint→integer→bigint, float→decimal
    expect(same(TypeKind.IntegerType, TypeKind.IntegerType)).toBe(true)
    expect(same(TypeKind.IntegerType, TypeKind.DecimalType)).toBe(true)
    expect(same(TypeKind.FloatType, TypeKind.DecimalType)).toBe(true)
    // textual
    expect(same(TypeKind.StringType, TypeKind.StringType)).toBe(true)
    // temporal, within one SQL type
    expect(sameTemporal(SqlTypeName.Date, SqlTypeName.Date)).toBe(true)
    expect(sameTemporal(SqlTypeName.Timestamp, SqlTypeName.Timestamp)).toBe(true)
  })

  it('across SQL temporal types ⇒ false (breaking)', () => {
    expect(sameTemporal(SqlTypeName.Date, SqlTypeName.Timestamp)).toBe(false)
    expect(sameTemporal(SqlTypeName.Timestamp, SqlTypeName.Date)).toBe(false)
    expect(sameTemporal(SqlTypeName.Time, SqlTypeName.Timestamp)).toBe(false)
  })

  it('cross-family ⇒ false (breaking)', () => {
    expect(same(TypeKind.IntegerType, TypeKind.StringType)).toBe(false)
    expect(same(TypeKind.TimeType, TypeKind.StringType)).toBe(false)
    expect(same(TypeKind.IntegerType, TypeKind.BoolType)).toBe(false)
    expect(same(TypeKind.EnumType, TypeKind.StringType)).toBe(false)
  })

  it('opaque on either side ⇒ false (conservative breaking)', () => {
    expect(same(TypeKind.UnsupportedType, TypeKind.UnsupportedType)).toBe(false)
    expect(same(TypeKind.IntegerType, TypeKind.UnsupportedType)).toBe(false)
    expect(same(TypeKind.SpatialType, TypeKind.SpatialType)).toBe(false)
  })
})
