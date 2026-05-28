import {
  DDLAPI_VERSION,
  ObjectKind, TypeKind, ExprKind, AttrKind, ReferenceOption,
  type Expr, type Literal, type RawExpr, type NamedDefault, type UnknownExpr,
  type Attr, type Comment, type Check,
  type SchemaType, type BoolType, type IntegerType, type EnumType, type UnknownType,
  type SchemaObject, type Realm, type Schema, type Table, type Column, type ColumnType,
  type Index, type IndexPart, type ForeignKey, type View,
  newRealm, newSchema, newTable, newView,
  newColumn, newNullableColumn, columnType, newIndex, newUniqueIndex, newPrimaryKey,
  newIndexPart, newColumnPart, newExprPart, newForeignKey, newCheck,
  findAttr, replaceOrAppendAttr, removeAttr, underlyingExpr,
  boolType, integerType, decimalType, floatType, stringType, binaryType,
  timeType, jsonType, spatialType, uuidType, unsupportedType, enumType,
  comment, charset, collation, generatedExpr,
  literal, rawExpr, namedDefault,
} from '@netcracker/qubership-apihub-ddlapi'

// ── Task 2: Constants ────────────────────────────────────────────────────────

describe('ReferenceOption', () => {
  test('values match SQL keywords', () => {
    expect(ReferenceOption.Cascade).toBe('CASCADE')
    expect(ReferenceOption.NoAction).toBe('NO ACTION')
    expect(ReferenceOption.Restrict).toBe('RESTRICT')
    expect(ReferenceOption.SetNull).toBe('SET NULL')
    expect(ReferenceOption.SetDefault).toBe('SET DEFAULT')
  })
})

describe('TypeKind', () => {
  test('BoolType value', () => {
    expect(TypeKind.BoolType).toBe('BoolType')
  })
  test('all TypeKind values are strings', () => {
    for (const v of Object.values(TypeKind)) {
      expect(typeof v).toBe('string')
    }
  })
})

describe('ObjectKind', () => {
  test('values', () => {
    expect(ObjectKind.Table).toBe('Table')
    expect(ObjectKind.View).toBe('View')
    expect(ObjectKind.Index).toBe('Index')
    expect(ObjectKind.ForeignKey).toBe('ForeignKey')
    expect(ObjectKind.Check).toBe('Check')
    expect(ObjectKind.NamedDefault).toBe('NamedDefault')
    expect(ObjectKind.EnumType).toBe('EnumType')
  })
})

describe('ExprKind', () => {
  test('values', () => {
    expect(ExprKind.Literal).toBe('Literal')
    expect(ExprKind.RawExpr).toBe('RawExpr')
  })
})

describe('AttrKind', () => {
  test('values', () => {
    expect(AttrKind.Comment).toBe('Comment')
    expect(AttrKind.Charset).toBe('Charset')
    expect(AttrKind.Collation).toBe('Collation')
    expect(AttrKind.Check).toBe('Check')
    expect(AttrKind.GeneratedExpr).toBe('GeneratedExpr')
  })
})

describe('dual-role kinds', () => {
  test('Check appears in both ObjectKind and AttrKind with same value', () => {
    expect(ObjectKind.Check).toBe(AttrKind.Check)
  })
  test('EnumType appears in both ObjectKind and TypeKind with same value', () => {
    expect(ObjectKind.EnumType).toBe(TypeKind.EnumType)
  })
})

// ── Task 3: Expr union ───────────────────────────────────────────────────────

function describeExpr(e: Expr): string {
  switch (e.kind) {
    case ExprKind.Literal: return `literal:${(e as Literal).v}`
    case ExprKind.RawExpr: return `raw:${(e as RawExpr).x}`
    case ObjectKind.NamedDefault: return `named:${(e as NamedDefault).name}`
    default:
      return `unknown:${(e as UnknownExpr).kind}`
  }
}

describe('Expr', () => {
  test('Literal has v field', () => {
    const lit: Literal = { kind: ExprKind.Literal, v: '42' }
    expect(lit.v).toBe('42')
    expect(describeExpr(lit)).toBe('literal:42')
  })

  test('RawExpr has x field', () => {
    const raw: RawExpr = { kind: ExprKind.RawExpr, x: 'uuid()' }
    expect(raw.x).toBe('uuid()')
    expect(describeExpr(raw)).toBe('raw:uuid()')
  })

  test('NamedDefault uses ObjectKind.NamedDefault as kind', () => {
    const lit: Literal = { kind: ExprKind.Literal, v: '0' }
    const nd: NamedDefault = { kind: ObjectKind.NamedDefault, name: 'seq_next', expr: lit }
    expect(nd.kind).toBe('NamedDefault')
    expect(nd.expr).toBe(lit)
    expect(describeExpr(nd)).toBe('named:seq_next')
  })

  test('UnknownExpr passes through', () => {
    const unk: UnknownExpr = { kind: 'MySQLExpr', extra: true }
    expect(describeExpr(unk)).toBe('unknown:MySQLExpr')
  })

  test('NamedDefault.expr is typed as Literal | RawExpr (not full Expr union)', () => {
    const lit: Literal = { kind: ExprKind.Literal, v: '1' }
    const nd: NamedDefault = { kind: ObjectKind.NamedDefault, name: 'n', expr: lit }
    expect(nd.expr.kind).toBe(ExprKind.Literal)
  })
})

// ── Task 4: Attr union ───────────────────────────────────────────────────────

function describeAttr(a: Attr): string {
  switch (a.kind) {
    case AttrKind.Comment: return `comment:${a.text}`
    case AttrKind.Charset: return `charset:${a.v}`
    case AttrKind.Collation: return `collation:${a.v}`
    case AttrKind.Check: return `check:${a.expr}`
    case AttrKind.GeneratedExpr: return `gen:${a.expr}`
    default: {
      const unk: { kind: string } = a
      return `unknown:${unk.kind}`
    }
  }
}

describe('Attr', () => {
  test('Comment', () => {
    const c: Comment = { kind: AttrKind.Comment, text: 'hi' }
    expect(describeAttr(c)).toBe('comment:hi')
  })

  test('Check (attr role)', () => {
    const ch: Check = { kind: AttrKind.Check, expr: 'age > 0', name: 'age_check' }
    expect(ch.name).toBe('age_check')
    expect(describeAttr(ch)).toBe('check:age > 0')
  })

  test('Check with optional name absent', () => {
    const ch: Check = { kind: AttrKind.Check, expr: 'x > 0' }
    expect(ch.name).toBeUndefined()
  })

  test('UnknownAttr passes through', () => {
    const unk: Attr = { kind: 'MySQLAttr', extra: 'data' }
    expect(describeAttr(unk)).toBe('unknown:MySQLAttr')
  })
})

// ── Task 5: SchemaType union ─────────────────────────────────────────────────

function describeType(t: SchemaType): string {
  switch (t.kind) {
    case TypeKind.BoolType: return `bool:${t.t}`
    case TypeKind.IntegerType: return `int:${t.t}`
    case TypeKind.DecimalType: return `decimal:${t.t}`
    case TypeKind.FloatType: return `float:${t.t}`
    case TypeKind.StringType: return `string:${t.t}`
    case TypeKind.BinaryType: return `binary:${t.t}`
    case TypeKind.TimeType: return `time:${t.t}`
    case TypeKind.JSONType: return `json:${t.t}`
    case TypeKind.SpatialType: return `spatial:${t.t}`
    case TypeKind.UUIDType: return `uuid:${t.t}`
    case TypeKind.UnsupportedType: return `unsupported:${t.t}`
    case TypeKind.EnumType: return `enum:${(t as EnumType).values.join(',')}`
    default:
      return `unknown:${(t as UnknownType).kind}`
  }
}

describe('SchemaType', () => {
  test('BoolType', () => {
    const bt: BoolType = { kind: TypeKind.BoolType, t: 'boolean' }
    expect(describeType(bt)).toBe('bool:boolean')
  })

  test('IntegerType with unsigned', () => {
    const it: IntegerType = { kind: TypeKind.IntegerType, t: 'bigint', unsigned: true }
    expect(it.unsigned).toBe(true)
    expect(describeType(it)).toBe('int:bigint')
  })

  test('EnumType as SchemaType', () => {
    const et: EnumType = { kind: TypeKind.EnumType, values: ['a', 'b'] }
    expect(describeType(et)).toBe('enum:a,b')
  })

  test('EnumType optional t and schema', () => {
    const et: EnumType = { kind: TypeKind.EnumType, values: ['x'], t: 'status' }
    expect(et.t).toBe('status')
    expect(et.schema).toBeUndefined()
  })

  test('UnknownType escape hatch', () => {
    const unk: UnknownType = { kind: 'point', srid: 4326 }
    expect(describeType(unk)).toBe('unknown:point')
  })
})

// ── Task 6: Schema interfaces ─────────────────────────────────────────────────

describe('Schema interfaces', () => {
  test('ColumnType.null is optional boolean', () => {
    const ct: ColumnType = { type: { kind: TypeKind.BoolType, t: 'bool' } }
    expect(ct.null).toBeUndefined()
    const ctExplicitFalse: ColumnType = { type: { kind: TypeKind.BoolType, t: 'bool' }, null: false }
    expect(ctExplicitFalse.null).toBe(false)
  })

  test('ColumnType with raw', () => {
    const ct: ColumnType = {
      type: { kind: TypeKind.IntegerType, t: 'int' },
      raw: 'int',
      null: true,
    }
    expect(ct.raw).toBe('int')
    expect(ct.null).toBe(true)
  })

  test('EnumType is valid as both SchemaType and SchemaObject', () => {
    const et: EnumType = { kind: TypeKind.EnumType, values: ['a', 'b'] }
    const asType: SchemaType = et
    const asObj: SchemaObject = et
    expect(asType.kind).toBe(TypeKind.EnumType)
    expect(asObj.kind).toBe(ObjectKind.EnumType)
    expect(TypeKind.EnumType).toBe(ObjectKind.EnumType)
  })

  test('Check is valid as both Attr and SchemaObject', () => {
    const ch: Check = { kind: AttrKind.Check, expr: 'x > 0' }
    const asAttr: Attr = ch
    const asObj: SchemaObject = ch
    expect(asAttr.kind).toBe(AttrKind.Check)
    expect(asObj.kind).toBe(ObjectKind.Check)
  })

  test('NamedDefault is valid as both Expr and SchemaObject', () => {
    const nd: NamedDefault = {
      kind: ObjectKind.NamedDefault,
      name: 'seq',
      expr: { kind: ExprKind.RawExpr, x: 'NEXT VALUE FOR seq' },
    }
    const asExpr: Expr = nd
    const asObj: SchemaObject = nd
    expect(asExpr.kind).toBe('NamedDefault')
    expect(asObj.kind).toBe('NamedDefault')
  })

  test('minimal object graph with plain object literals', () => {
    const col: Column = { name: 'id', type: { type: { kind: TypeKind.IntegerType, t: 'int' }, null: false } }
    const pk: Index = { kind: ObjectKind.Index, name: 'PRIMARY', unique: true, parts: [{ seqNo: 0, c: col }] }
    const tbl: Table = { kind: ObjectKind.Table, name: 'users', columns: [col], primaryKey: pk }
    const schema: Schema = { name: 'public', tables: [tbl] }
    const realm: Realm = { ddlapi: DDLAPI_VERSION, schemas: [schema] }

    expect(realm.schemas[0].name).toBe('public')
    expect(realm.schemas[0].tables?.[0].name).toBe('users')
    expect(realm.schemas[0].tables?.[0].primaryKey?.parts?.[0].c).toBe(col)
  })

  test('Index.kind is ObjectKind.Index', () => {
    const idx: Index = { kind: ObjectKind.Index, unique: false }
    expect(idx.kind).toBe('Index')
  })

  test('ForeignKey.kind is ObjectKind.ForeignKey', () => {
    const fk: ForeignKey = { kind: ObjectKind.ForeignKey }
    expect(fk.kind).toBe('ForeignKey')
  })

  test('optional fields default to undefined', () => {
    const tbl: Table = { kind: ObjectKind.Table, name: 't' }
    expect(tbl.columns).toBeUndefined()
    expect(tbl.indexes).toBeUndefined()
    expect(tbl.attrs).toBeUndefined()
  })
})

// ── Task 7: Schema-structure factories ───────────────────────────────────────

describe('newRealm', () => {
  test('empty realm', () => {
    const r = newRealm()
    expect(r.ddlapi).toBe(DDLAPI_VERSION)
    expect(r.schemas).toEqual([])
    expect(r.attrs).toBeUndefined()
    expect(r.objects).toBeUndefined()
  })

  test('realm with schemas', () => {
    const s = newSchema('public')
    const r = newRealm([s])
    expect(r.ddlapi).toBe(DDLAPI_VERSION)
    expect(r.schemas).toHaveLength(1)
    expect(r.schemas[0].name).toBe('public')
  })
})

describe('newSchema', () => {
  test('name only — optional fields undefined', () => {
    const s = newSchema('mydb')
    expect(s.name).toBe('mydb')
    expect(s.tables).toBeUndefined()
    expect(s.views).toBeUndefined()
    expect(s.attrs).toBeUndefined()
    expect(s.objects).toBeUndefined()
  })

  test('schema with tables', () => {
    const t = newTable('users')
    const s = newSchema('pub', { tables: [t] })
    expect(s.tables?.[0].name).toBe('users')
  })
})

describe('newTable', () => {
  test('name only — optional fields undefined', () => {
    const t = newTable('orders')
    expect(t.kind).toBe(ObjectKind.Table)
    expect(t.name).toBe('orders')
    expect(t.columns).toBeUndefined()
    expect(t.indexes).toBeUndefined()
    expect(t.primaryKey).toBeUndefined()
    expect(t.foreignKeys).toBeUndefined()
    expect(t.attrs).toBeUndefined()
    expect(t.deps).toBeUndefined()
  })
})

describe('newView', () => {
  test('basic view', () => {
    const v = newView('active_users', { def: 'SELECT * FROM users WHERE active = 1' })
    expect(v.kind).toBe(ObjectKind.View)
    expect(v.name).toBe('active_users')
    expect(v.def).toContain('SELECT')
    expect(v.columns).toBeUndefined()
  })
})

// ── Task 8: Column, constraint, and index-part factories ─────────────────────

describe('newColumn', () => {
  test('name only', () => {
    const c = newColumn('email')
    expect(c.name).toBe('email')
    expect(c.type).toBeUndefined()
    expect(c.default).toBeUndefined()
    expect(c.attrs).toBeUndefined()
  })

  test('with type', () => {
    const c = newColumn('id', { type: columnType(integerType('int')) })
    expect(c.type?.null).toBeUndefined()
    expect(c.type?.type.kind).toBe(TypeKind.IntegerType)
  })
})

describe('newNullableColumn', () => {
  test('has null: true on columnType', () => {
    const c = newNullableColumn('bio')
    expect(c.name).toBe('bio')
    expect(c.type?.null).toBe(true)
  })
})

describe('columnType', () => {
  test('null omitted when not specified', () => {
    const ct = columnType(boolType('boolean'))
    expect(ct.null).toBeUndefined()
    expect(ct.raw).toBeUndefined()
  })

  test('explicit null: true', () => {
    const ct = columnType(stringType('varchar'), { null: true, raw: 'varchar(255)' })
    expect(ct.null).toBe(true)
    expect(ct.raw).toBe('varchar(255)')
  })

  test('explicit null: false', () => {
    const ct = columnType(integerType('int'), { null: false })
    expect(ct.null).toBe(false)
  })
})

describe('newPrimaryKey', () => {
  test('seqNo auto-assigned sequentially starting at 0', () => {
    const id = newColumn('id', { type: columnType(integerType('int')) })
    const pk = newPrimaryKey([id])
    expect(pk.parts).toHaveLength(1)
    expect(pk.parts?.[0].seqNo).toBe(0)
    expect(pk.parts?.[0].c).toBe(id)   // same reference
  })

  test('composite PK — seqNo 0,1,2', () => {
    const a = newColumn('a')
    const b = newColumn('b')
    const c = newColumn('c')
    const pk = newPrimaryKey([a, b, c])
    expect(pk.parts?.map(p => p.seqNo)).toEqual([0, 1, 2])
  })

  test('PK parts share same Column object reference as table.columns', () => {
    const id = newColumn('id', { type: columnType(integerType('int')) })
    const pk = newPrimaryKey([id])
    const tbl = newTable('users', { columns: [id], primaryKey: pk })
    expect(tbl.primaryKey?.parts?.[0].c).toBe(tbl.columns?.[0])
  })
})

describe('newIndexPart / newColumnPart / newExprPart', () => {
  test('newIndexPart defaults seqNo to 0', () => {
    const p = newIndexPart()
    expect(p.seqNo).toBe(0)
    expect(p.c).toBeUndefined()
    expect(p.x).toBeUndefined()
  })

  test('newColumnPart wraps column', () => {
    const col = newColumn('name')
    const p = newColumnPart(col, { seqNo: 2 })
    expect(p.seqNo).toBe(2)
    expect(p.c).toBe(col)
  })

  test('newExprPart wraps expression', () => {
    const x = rawExpr('lower(email)')
    const p = newExprPart(x)
    expect(p.seqNo).toBe(0)
    expect(p.x).toBe(x)
  })
})

describe('newForeignKey', () => {
  test('FK column and refColumn hold same references as table columns', () => {
    const userId = newColumn('user_id', { type: columnType(integerType('int')) })
    const id = newColumn('id', { type: columnType(integerType('int')) })
    const posts = newTable('posts', { columns: [userId] })
    const users = newTable('users', { columns: [id] })

    const fk = newForeignKey('fk_post_user', {
      columns: [userId],
      refTable: users,
      refColumns: [id],
      onDelete: ReferenceOption.Cascade,
    })

    expect(fk.kind).toBe(ObjectKind.ForeignKey)
    expect(fk.symbol).toBe('fk_post_user')
    expect(fk.columns?.[0]).toBe(posts.columns?.[0])   // same reference
    expect(fk.refColumns?.[0]).toBe(users.columns?.[0]) // same reference
    expect(fk.onDelete).toBe(ReferenceOption.Cascade)
  })

  test('newForeignKey without symbol', () => {
    const fk = newForeignKey()
    expect(fk.symbol).toBeUndefined()
    expect(fk.columns).toBeUndefined()
  })
})

describe('newCheck', () => {
  test('with name', () => {
    const ch = newCheck('age > 0', 'chk_age')
    expect(ch.kind).toBe(AttrKind.Check)
    expect(ch.expr).toBe('age > 0')
    expect(ch.name).toBe('chk_age')
  })

  test('without name', () => {
    const ch = newCheck('price > 0')
    expect(ch.name).toBeUndefined()
  })
})

describe('newIndex / newUniqueIndex', () => {
  test('newIndex no name', () => {
    const idx = newIndex()
    expect(idx.kind).toBe(ObjectKind.Index)
    expect(idx.name).toBeUndefined()
    expect(idx.unique).toBeUndefined()
  })

  test('newUniqueIndex sets unique: true', () => {
    const idx = newUniqueIndex('ux_email')
    expect(idx.unique).toBe(true)
    expect(idx.name).toBe('ux_email')
  })
})

// ── Task 9: Type, attr, and expr factories ───────────────────────────────────

describe('type factories', () => {
  test('boolType', () => {
    const t = boolType('boolean')
    expect(t.kind).toBe(TypeKind.BoolType)
    expect(t.t).toBe('boolean')
  })

  test('integerType with unsigned', () => {
    const t = integerType('bigint', { unsigned: true })
    expect(t.kind).toBe(TypeKind.IntegerType)
    expect(t.unsigned).toBe(true)
  })

  test('integerType without opts — unsigned undefined', () => {
    const t = integerType('int')
    expect(t.unsigned).toBeUndefined()
    expect(t.attrs).toBeUndefined()
  })

  test('decimalType', () => {
    const t = decimalType('decimal', { precision: 10, scale: 2 })
    expect(t.precision).toBe(10)
    expect(t.scale).toBe(2)
    expect(t.unsigned).toBeUndefined()
  })

  test('floatType', () => {
    const t = floatType('float', { precision: 24 })
    expect(t.precision).toBe(24)
  })

  test('stringType — size omitted by default', () => {
    const t = stringType('varchar', { size: 255 })
    expect(t.size).toBe(255)
    const t2 = stringType('text')
    expect(t2.size).toBeUndefined()
  })

  test('binaryType — size 0 is valid', () => {
    const t = binaryType('binary', { size: 0 })
    expect(t.size).toBe(0)
    const t2 = binaryType('blob')
    expect(t2.size).toBeUndefined()
  })

  test('timeType', () => {
    const t = timeType('timestamp', { precision: 6 })
    expect(t.precision).toBe(6)
  })

  test('jsonType / spatialType / uuidType / unsupportedType', () => {
    expect(jsonType('json').kind).toBe(TypeKind.JSONType)
    expect(spatialType('point').kind).toBe(TypeKind.SpatialType)
    expect(uuidType('uuid').kind).toBe(TypeKind.UUIDType)
    expect(unsupportedType('custom').kind).toBe(TypeKind.UnsupportedType)
  })

  test('enumType as SchemaType and SchemaObject', () => {
    const et = enumType(['a', 'b'], { t: 'mood' })
    expect(et.kind).toBe(TypeKind.EnumType)
    expect(et.t).toBe('mood')
    const asType: SchemaType = et
    const asObj: SchemaObject = et
    expect(asType.kind).toBe(asObj.kind)
  })
})

describe('attr factories', () => {
  test('comment', () => {
    const a = comment('hello')
    expect(a.kind).toBe(AttrKind.Comment)
    expect(a.text).toBe('hello')
  })

  test('charset / collation', () => {
    expect(charset('utf8mb4').v).toBe('utf8mb4')
    expect(collation('utf8mb4_unicode_ci').v).toBe('utf8mb4_unicode_ci')
  })

  test('generatedExpr with type', () => {
    const g = generatedExpr('first || last', 'STORED')
    expect(g.expr).toBe('first || last')
    expect(g.type).toBe('STORED')
  })

  test('generatedExpr without type', () => {
    const g = generatedExpr('x * 2')
    expect(g.type).toBeUndefined()
  })

})

describe('expr factories', () => {
  test('literal', () => {
    const l = literal('42')
    expect(l.kind).toBe(ExprKind.Literal)
    expect(l.v).toBe('42')
  })

  test('rawExpr', () => {
    const r = rawExpr('uuid()')
    expect(r.kind).toBe(ExprKind.RawExpr)
    expect(r.x).toBe('uuid()')
  })

  test('namedDefault', () => {
    const inner = literal('0')
    const nd = namedDefault('seq_next', inner)
    expect(nd.kind).toBe(ObjectKind.NamedDefault)
    expect(nd.name).toBe('seq_next')
    expect(nd.expr).toBe(inner)
    expect(nd.attrs).toBeUndefined()
  })

  test('namedDefault with attrs', () => {
    const nd = namedDefault('nd', rawExpr('NEXT VALUE FOR s'), [comment('a sequence default')])
    expect(nd.attrs).toHaveLength(1)
  })
})

// ── Full Realm graph via factories only ──────────────────────────────────────

describe('full Realm graph via factories', () => {
  test('build and verify', () => {
    const id = newColumn('id', { type: columnType(integerType('int')) })
    const name = newColumn('name', { type: columnType(stringType('varchar', { size: 255 })) })
    const bio = newNullableColumn('bio')
    const pk = newPrimaryKey([id])
    const uxName = newUniqueIndex('ux_name', { parts: [newColumnPart(name, { seqNo: 0 })] })

    const userId = newColumn('user_id', { type: columnType(integerType('int')) })
    const content = newColumn('content', { type: columnType(stringType('text')) })
    const postPk = newPrimaryKey([newColumn('id', { type: columnType(integerType('int')) })])

    const users = newTable('users', {
      columns: [id, name, bio],
      primaryKey: pk,
      indexes: [uxName],
      attrs: [comment('User table')],
    })

    const posts = newTable('posts', {
      columns: [userId, content],
      primaryKey: postPk,
      foreignKeys: [
        newForeignKey('fk_posts_user', {
          columns: [userId],
          refTable: users,
          refColumns: [id],
          onDelete: ReferenceOption.Cascade,
        }),
      ],
    })

    const schema = newSchema('public', { tables: [users, posts] })
    const realm = newRealm([schema])

    // structure
    expect(realm.schemas[0].tables).toHaveLength(2)

    // PK part references same Column as table.columns
    expect(users.primaryKey?.parts?.[0].c).toBe(users.columns?.[0])

    // FK references same Column objects
    const fk = posts.foreignKeys?.[0]
    expect(fk?.columns?.[0]).toBe(posts.columns?.[0])
    expect(fk?.refColumns?.[0]).toBe(users.columns?.[0])

    // index part references same Column
    expect(users.indexes?.[0].parts?.[0].c).toBe(users.columns?.[1])

    // nullable column
    expect(bio.type?.null).toBe(true)

    // FK onDelete
    expect(fk?.onDelete).toBe(ReferenceOption.Cascade)
  })
})

// ── Task 10: Attr utilities and underlyingExpr ───────────────────────────────

describe('findAttr', () => {
  test('finds first matching attr', () => {
    const attrs: Attr[] = [comment('doc'), charset('utf8mb4')]
    const found = findAttr(attrs, AttrKind.Comment)
    expect(found?.text).toBe('doc')
  })

  test('returns undefined when not found', () => {
    const attrs: Attr[] = [comment('doc')]
    expect(findAttr(attrs, AttrKind.Charset)).toBeUndefined()
  })

  test('returns undefined for undefined input', () => {
    expect(findAttr(undefined, AttrKind.Comment)).toBeUndefined()
  })
})

describe('replaceOrAppendAttr', () => {
  test('appends when attr kind not present', () => {
    const result = replaceOrAppendAttr([comment('old')], charset('utf8'))
    expect(result).toHaveLength(2)
    expect(result[1].kind).toBe(AttrKind.Charset)
  })

  test('replaces existing attr of same kind', () => {
    const result = replaceOrAppendAttr([comment('old')], comment('new'))
    expect(result).toHaveLength(1)
    expect((result[0] as Comment).text).toBe('new')
  })

  test('handles undefined input — returns array with single attr', () => {
    const result = replaceOrAppendAttr(undefined, comment('hi'))
    expect(result).toHaveLength(1)
  })

  test('does not mutate input array', () => {
    const original: Attr[] = [comment('a')]
    replaceOrAppendAttr(original, comment('b'))
    expect(original).toHaveLength(1)
    expect((original[0] as Comment).text).toBe('a')
  })

  test('two UnknownAttr values with different kind strings coexist', () => {
    const a1: Attr = { kind: 'DriverAttrA', data: 1 }
    const a2: Attr = { kind: 'DriverAttrB', data: 2 }
    const r1 = replaceOrAppendAttr(undefined, a1)
    const r2 = replaceOrAppendAttr(r1, a2)
    expect(r2).toHaveLength(2)
    expect(r2[0].kind).toBe('DriverAttrA')
    expect(r2[1].kind).toBe('DriverAttrB')
  })

  test('replacing UnknownAttr by same kind does not affect other kinds', () => {
    const a1: Attr = { kind: 'DriverAttrA', v: 1 }
    const a1v2: Attr = { kind: 'DriverAttrA', v: 2 }
    const a2: Attr = { kind: 'DriverAttrB', v: 99 }
    const base = replaceOrAppendAttr(replaceOrAppendAttr(undefined, a1), a2)
    const result = replaceOrAppendAttr(base, a1v2)
    expect(result).toHaveLength(2)
    expect((result[0] as { kind: string; v: number }).v).toBe(2)
    expect((result[1] as { kind: string; v: number }).v).toBe(99)
  })

  test('round-trip: find → replace → find', () => {
    const attrs = replaceOrAppendAttr([comment('v1'), charset('utf8')], comment('v2'))
    expect(findAttr(attrs, AttrKind.Comment)?.text).toBe('v2')
    expect(findAttr(attrs, AttrKind.Charset)?.v).toBe('utf8')
  })
})

describe('removeAttr', () => {
  test('removes matching attrs', () => {
    const attrs: Attr[] = [comment('doc'), charset('utf8'), comment('extra')]
    const result = removeAttr(attrs, AttrKind.Comment)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe(AttrKind.Charset)
  })

  test('returns empty array for undefined input', () => {
    expect(removeAttr(undefined, AttrKind.Comment)).toHaveLength(0)
  })

  test('does not mutate input', () => {
    const original: Attr[] = [comment('a'), charset('utf8')]
    removeAttr(original, AttrKind.Comment)
    expect(original).toHaveLength(2)
  })

  test('round-trip with replaceOrAppendAttr', () => {
    let attrs: readonly Attr[] = []
    attrs = replaceOrAppendAttr(attrs, comment('hello'))
    attrs = replaceOrAppendAttr(attrs, charset('utf8'))
    expect(findAttr(attrs, AttrKind.Comment)?.text).toBe('hello')
    attrs = removeAttr(attrs, AttrKind.Comment)
    expect(findAttr(attrs, AttrKind.Comment)).toBeUndefined()
    expect(findAttr(attrs, AttrKind.Charset)?.v).toBe('utf8')
  })
})

describe('underlyingExpr', () => {
  test('passes Literal through unchanged', () => {
    const lit = literal('42')
    expect(underlyingExpr(lit)).toBe(lit)
  })

  test('passes RawExpr through unchanged', () => {
    const raw = rawExpr('uuid()')
    expect(underlyingExpr(raw)).toBe(raw)
  })

  test('unwraps NamedDefault to inner Literal', () => {
    const inner = literal('0')
    const nd = namedDefault('seq', inner)
    const result = underlyingExpr(nd)
    expect(result).toBe(inner)
    expect(result.kind).toBe(ExprKind.Literal)
  })

  test('unwraps NamedDefault to inner RawExpr', () => {
    const inner = rawExpr('NEXT VALUE FOR seq')
    const nd = namedDefault('seq', inner)
    expect(underlyingExpr(nd)).toBe(inner)
  })

  test('throws on UnknownExpr', () => {
    const unk: Expr = { kind: 'CustomExpr', data: 1 }
    expect(() => underlyingExpr(unk)).toThrow("underlyingExpr: cannot unwrap UnknownExpr with kind 'CustomExpr'")
  })
})
