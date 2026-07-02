import { Diff, DIFF_META_KEY, DiffAction, nonBreaking } from '../src'
import type { Column, EnumType, Realm, Schema, Table } from '@netcracker/qubership-apihub-ddlapi'
import { ObjectKind } from '@netcracker/qubership-apihub-ddlapi'
import { diffSql } from './helper/ddl'
import { diffsMatcher } from './helper/matchers'

// Shared diff-instance & merged-document contract. When one logical
// entity is referenced from several places, the change to it must be the SAME Diff instance
// at every reference site in `merged`, and appear once in `diffs`.
//
// `merged` has the same shape as a ddlapi `Realm` (diff metadata is attached under symbol
// keys, which do not affect the structural type), so we navigate it as one.

const firstSchema = (merged: unknown): Schema => (merged as Realm).schemas[0]
const findTable = (merged: unknown, name: string): Table => firstSchema(merged).tables!.find(t => t.name === name)!
const findColumn = (table: Table, name: string): Column => table.columns!.find(c => c.name === name)!
const findEnumObject = (merged: unknown): EnumType | undefined =>
  firstSchema(merged).objects?.find((o): o is EnumType => o.kind === ObjectKind.EnumType)

// Reads the Diff attached to a merged node for one of its properties (the engine stores diff
// metadata on the container node under the DIFF_META_KEY symbol, keyed by property key).
const diffAt = (node: object, key: PropertyKey): Diff | undefined =>
  (node as { [DIFF_META_KEY]?: Record<PropertyKey, Diff> })[DIFF_META_KEY]?.[key]

describe('shared-instance / merged-document contract', () => {
  it('an enum used by several columns: value change ⇒ one shared diff at every column', async () => {
    const beforeSql = `
      create type mood as enum ('a');
      create table t(m1 mood, m2 mood);
    `
    const afterSql = `
      create type mood as enum ('a', 'b');
      create table t(m1 mood, m2 mood);
    `
    const { diffs, merged } = await diffSql(beforeSql, afterSql)

    // Exactly one value-add diff, non-breaking (E1).
    expect(diffs).toHaveLength(1) // the single shared enum value add
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: 'b',
        afterDeclarationPaths: [['schemas', 0, 'objects', 0, 'values', 1]],
      }),
    ]))

    // The enum is one shared instance in merged: reached via either column and via
    // schema.objects, it is the same object reference.
    const t = findTable(merged, 't')
    const enumViaM1 = findColumn(t, 'm1').type!.type as EnumType
    const enumViaM2 = findColumn(t, 'm2').type!.type as EnumType
    expect(enumViaM1).toBe(enumViaM2)

    const enumObject = findEnumObject(merged)
    expect(enumObject).toBeDefined()
    expect(enumViaM1).toBe(enumObject)

    // The value-add Diff is the SAME instance reached via either column's enum and via
    // schema.objects — and is exactly the diff reported in `diffs`.
    const valueAddDiff = diffAt(enumViaM1.values, 1)
    expect(valueAddDiff).toBe(diffs[0])
    expect(diffAt(enumViaM2.values, 1)).toBe(valueAddDiff)
    expect(diffAt(enumObject!.values, 1)).toBe(valueAddDiff)
  })

  it('a column in a primary key and a foreign key: type change ⇒ one shared diff at every site', async () => {
    const beforeSql = `
      create table t(id int, primary key (id));
      create table u(uid int, ref int, constraint fk_u foreign key (ref) references t(id));
    `
    const afterSql = `
      create table t(id bigint, primary key (id));
      create table u(uid int, ref int, constraint fk_u foreign key (ref) references t(id));
    `
    const { diffs, merged } = await diffSql(beforeSql, afterSql)

    // One /type-name diff (same family int→bigint → non-breaking), shared across sites.
    expect(diffs).toHaveLength(1) // the single shared column /type-name replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: 'integer',
        afterValue: 'bigint',
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'type']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'type']],
      }),
    ]))

    const t = findTable(merged, 't')
    const idColumn = findColumn(t, 'id')
    const pkColumn = t.primaryKey!.parts![0].column!
    const u = findTable(merged, 'u')
    const fk = u.foreignKeys![0]
    const fkRefColumn = fk.refColumns![0]

    // The same Column instance is reached via table.columns, the primary-key part, and the
    // foreign key's refColumns; fk.refTable is the same Table instance.
    expect(pkColumn).toBe(idColumn)
    expect(fk.refTable).toBe(t)
    expect(fkRefColumn).toBe(idColumn)

    // The /type-name Diff is the SAME instance at every one of those reference sites — and is
    // exactly the diff reported in `diffs`.
    const typeChangeDiff = diffAt(idColumn.type!.type, 'type')
    expect(typeChangeDiff).toBe(diffs[0])
    expect(diffAt(pkColumn.type!.type, 'type')).toBe(typeChangeDiff)
    expect(diffAt(fkRefColumn.type!.type, 'type')).toBe(typeChangeDiff)
  })

  it('a change reached via fk.refTable is the same Diff (appears once)', async () => {
    const beforeSql = `
      create table t(id int, primary key (id));
      create table u(ref int, constraint fk_u foreign key (ref) references t(id));
    `
    const afterSql = `
      create table t(id int, primary key (id), note text);
      create table u(ref int, constraint fk_u foreign key (ref) references t(id));
    `
    const { diffs, merged } = await diffSql(beforeSql, afterSql)
    // The added column on t appears once, even though t is reachable via u.foreignKeys[].refTable.
    expect(diffs).toHaveLength(1) // the single added column on t
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ name: 'note' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 1]],
      }),
    ]))

    const tables = (merged as Realm).schemas[0].tables
    expect(tables).toBeDefined()
    const t = tables!.find((tbl: Table) => tbl.name === 't')!
    const u = tables!.find((tbl: Table) => tbl.name === 'u')
    expect(u!.foreignKeys![0].refTable).toBe(t)
  })
})
