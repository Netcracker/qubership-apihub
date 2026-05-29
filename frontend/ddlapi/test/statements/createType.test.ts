import { buildFromDdl } from '../../src'
import { loadSql } from '../helpers/loadSql'
import { TypeKind, DdlErrorKind } from '../../src/constants'

describe('createType', () => {
  describe('enum', () => {
    test('enum-basic: creates EnumType in schema.objects', async () => {
      const realm = await buildFromDdl(loadSql('create-type/enum-basic.sql'))
      const schema = realm.schemas[0]!
      const et = schema.objects!.find(o => o.kind === TypeKind.EnumType)
      expect(et).toBeDefined()
      expect((et as unknown as { values: string[] }).values).toEqual(['happy', 'sad', 'neutral'])
    })

    test('enum-basic: registers EnumType in public schema', async () => {
      const realm = await buildFromDdl(loadSql('create-type/enum-basic.sql'))
      expect(realm.schemas[0]!.name).toBe('public')
      const et = realm.schemas[0]!.objects!.find(o => o.kind === TypeKind.EnumType)
      expect(et).toBeDefined()
    })

    test('enum-schema-qualified: placed in public schema', async () => {
      const realm = await buildFromDdl(loadSql('create-type/enum-schema-qualified.sql'))
      const pub = realm.schemas.find(s => s.name === 'public')!
      const et = pub.objects!.find(o => o.kind === TypeKind.EnumType)
      expect(et).toBeDefined()
      expect((et as unknown as { values: string[] }).values).toContain('active')
      expect((et as unknown as { values: string[] }).values).toContain('inactive')
    })

    test('enum-many-values: stores all 7 values', async () => {
      const realm = await buildFromDdl(loadSql('create-type/enum-many-values.sql'))
      const et = realm.schemas[0]!.objects!.find(o => o.kind === TypeKind.EnumType)
      expect((et as unknown as { values: string[] }).values).toHaveLength(7)
    })

    test('column referencing enum: type is upgraded to EnumType instance', async () => {
      const errors: unknown[] = []
      const realm = await buildFromDdl(
        `CREATE TYPE mood AS ENUM ('happy', 'sad');
         CREATE TABLE journal (id bigint PRIMARY KEY, feeling mood);`,
        { onError: e => errors.push(e) },
      )
      expect(errors).toHaveLength(0)
      const schema = realm.schemas[0]!
      const table = schema.tables!.find(t => t.name === 'journal')!
      const feelingCol = table.columns!.find(c => c.name === 'feeling')!
      // Type should be upgraded from UnsupportedType to EnumType
      expect(feelingCol.type!.type.kind).toBe(TypeKind.EnumType)
      // Referential equality: same instance as in schema.objects
      const enumObj = schema.objects!.find(o => o.kind === TypeKind.EnumType)!
      expect(feelingCol.type!.type).toBe(enumObj)
    })

    test('duplicate enum type: emits duplicate-object error', async () => {
      const errors: unknown[] = []
      await buildFromDdl(
        `CREATE TYPE mood AS ENUM ('a');
         CREATE TYPE mood AS ENUM ('b');`,
        { onError: e => errors.push(e) },
      )
      expect(errors).toHaveLength(1)
      expect((errors[0] as { kind: string }).kind).toBe(DdlErrorKind.DuplicateObject)
    })
  })

  describe('composite', () => {
    test('composite-simple: creates CompositeType UnknownObject in schema.objects', async () => {
      const realm = await buildFromDdl(loadSql('create-type/composite-simple.sql'))
      const schema = realm.schemas[0]!
      const ct = schema.objects!.find(o => o.kind === 'CompositeType')
      expect(ct).toBeDefined()
      expect((ct as { name: string }).name).toBe('complex_number')
      const fields = (ct as unknown as { fields: { name: string }[] }).fields
      expect(fields).toHaveLength(2)
      expect(fields[0]!.name).toBe('real_part')
      expect(fields[1]!.name).toBe('imag_part')
    })

    test('composite-with-array: parses without error', async () => {
      const errors: unknown[] = []
      await buildFromDdl(loadSql('create-type/composite-with-array.sql'), { onError: e => errors.push(e) })
      // Array fields are unsupportedType — that's fine, no errors expected
      expect(errors).toHaveLength(0)
    })

    test('duplicate composite type: emits duplicate-object error', async () => {
      const errors: unknown[] = []
      await buildFromDdl(
        `CREATE TYPE address AS (street text, city text);
         CREATE TYPE address AS (street text, city text, zip text);`,
        { onError: e => errors.push(e) },
      )
      expect(errors).toHaveLength(1)
      expect((errors[0] as { kind: string }).kind).toBe(DdlErrorKind.DuplicateObject)
    })
  })

  describe('range', () => {
    test('range-basic: creates RangeType UnknownObject with subtype', async () => {
      const realm = await buildFromDdl(loadSql('create-type/range-basic.sql'))
      const schema = realm.schemas[0]!
      const rt = schema.objects!.find(o => o.kind === 'RangeType')
      expect(rt).toBeDefined()
      expect((rt as { name: string }).name).toBe('float8range')
      expect((rt as { subtype?: string }).subtype).toBe('float8')
    })

    test('duplicate range type: emits duplicate-object error', async () => {
      const errors: unknown[] = []
      await buildFromDdl(
        `CREATE TYPE floatrange AS RANGE (SUBTYPE = float8);
         CREATE TYPE floatrange AS RANGE (SUBTYPE = float4);`,
        { onError: e => errors.push(e) },
      )
      expect(errors).toHaveLength(1)
      expect((errors[0] as { kind: string }).kind).toBe(DdlErrorKind.DuplicateObject)
    })
  })

  describe('createDomain', () => {
    test('simple: creates pg:domain object in schema.objects', async () => {
      const realm = await buildFromDdl(loadSql('create-domain/simple.sql'))
      const schema = realm.schemas[0]!
      const dt = schema.objects!.find(o => o.kind === 'pg:domain')
      expect(dt).toBeDefined()
      expect((dt as { t: string }).t).toBe('positive_int')
    })

    test('simple: baseType is IntegerType', async () => {
      const realm = await buildFromDdl(loadSql('create-domain/simple.sql'))
      const schema = realm.schemas[0]!
      const dt = schema.objects!.find(o => o.kind === 'pg:domain') as unknown as {
        baseType: { kind: string; t: string }
        checks?: unknown[]
      }
      expect(dt.baseType.kind).toBe(TypeKind.IntegerType)
      expect(dt.baseType.t).toBe('integer')
    })

    test('simple: CHECK constraint stored as checks array', async () => {
      const realm = await buildFromDdl(loadSql('create-domain/simple.sql'))
      const schema = realm.schemas[0]!
      const dt = schema.objects!.find(o => o.kind === 'pg:domain') as { checks?: { expr: string }[] }
      expect(dt.checks).toHaveLength(1)
      expect(dt.checks![0]!.expr).toBeTruthy()
    })

    test('with-not-null-default: NOT NULL and DEFAULT captured', async () => {
      const realm = await buildFromDdl(loadSql('create-domain/with-not-null-default.sql'))
      const schema = realm.schemas[0]!
      const dt = schema.objects!.find(o => o.kind === 'pg:domain') as {
        null?: boolean
        default?: unknown
      }
      expect(dt.null).toBe(false)
      expect(dt.default).toBeDefined()
    })

    test('with-named-constraint: CHECK has name', async () => {
      const realm = await buildFromDdl(loadSql('create-domain/with-named-constraint.sql'))
      const schema = realm.schemas[0]!
      const dt = schema.objects!.find(o => o.kind === 'pg:domain') as {
        checks?: { name?: string; expr: string }[]
      }
      expect(dt.checks![0]!.name).toBe('valid_zip')
    })

    test('column referencing domain: type resolves to shared pg:domain instance', async () => {
      const errors: unknown[] = []
      const realm = await buildFromDdl(
        `CREATE DOMAIN positive_int AS integer CHECK (VALUE > 0);
         CREATE TABLE items (id bigint PRIMARY KEY, qty positive_int);`,
        { onError: e => errors.push(e) },
      )
      expect(errors).toHaveLength(0)
      const schema = realm.schemas[0]!
      const table = schema.tables!.find(t => t.name === 'items')!
      const qtyCol = table.columns!.find(c => c.name === 'qty')!
      expect(qtyCol.type!.type.kind).toBe('pg:domain')
      // Referential equality — column type is the same object as schema.objects entry
      const domainObj = schema.objects!.find(o => o.kind === 'pg:domain')!
      expect(qtyCol.type!.type).toBe(domainObj)
    })
  })
})
