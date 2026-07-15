import { apiDiff, breaking, Diff, DiffAction, nonBreaking, unclassified } from '../src'
import { buildRealm, diffSql } from './helper/ddl'
import { diffsMatcher } from './helper/matchers'

// Behavioural ddlapi diff tests: assert action / type / before|afterValue /
// before|afterDeclarationPaths only. Human-readable description strings are asserted
// exclusively in ddl.description.test.ts (to keep the impact surface of wording changes small).

describe('engine registration', () => {
  it('identical realms produce no diffs', async () => {
    const sql = 'create table t(id int);'
    const { diffs } = await diffSql(sql, sql)
    expect(diffs).toBeEmpty()
  })

  it('throws a spec-mismatch error when comparing ddlapi against another spec type', async () => {
    const sql = 'create table t(id int);'
    const realm = await buildRealm(sql)
    const openapi = { openapi: '3.0.0', info: { title: 't', version: '1' }, paths: {} }
    expect(() => apiDiff(realm, openapi)).toThrow(/Specification cannot be different/)
  })
})

describe('rule tree — type canonicalization & node suppression', () => {
  it('identical realms ⇒ 0 diffs', async () => {
    const sql = 'create table orders(id int, name varchar(50));'
    const { diffs } = await diffSql(sql, sql)
    expect(diffs).toBeEmpty()
  })

  it('a raw-only change (same canonical type) ⇒ 0 diffs', async () => {
    const beforeSql = 'create table t(id integer);'
    const afterSql = 'create table t(id int4);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toBeEmpty()
  })

  it('kind + raw are suppressed inside a real type change ⇒ only the /type-name diff', async () => {
    // int→text flips the SchemaType `kind` (IntegerType→StringType) and `raw`; without
    // suppression those would surface as separate kind/raw diffs. With `/kind` + `/raw`
    // suppression, the only diff is the canonical type-name change — text and int share
    // no size/precision, so there is no extra structural diff here.
    const beforeSql = 'create table t(c int);'
    const afterSql = 'create table t(c text);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // only the /type-name replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: breaking,
        beforeValue: 'integer',
        afterValue: 'text',
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'type']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'type']],
      }),
    ]))
  })

  it('an unknown object kind change ⇒ unclassified (dialect/core miss falls back)', async () => {
    const sql = 'create table t(id int);'
    const before = await buildRealm(sql)
    const after = await buildRealm(sql)
    ;(after as any).schemas[0].objects = [{ kind: 'MysteryThing', name: 'm' }]
    const { diffs } = apiDiff(before, after)
    expect(diffs).toHaveLength(1) // the single unknown object add
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: unclassified,
        afterValue: expect.objectContaining({ kind: 'MysteryThing', name: 'm' }),
      }),
    ]))
  })
})

describe('table and column classification', () => {
  it('added table ⇒ add / non-breaking', async () => {
    const beforeSql = `
      create table a(id int);
    `
    const afterSql = `
      create table a(id int);
      create table b(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added table
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ kind: 'Table', name: 'b' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 1]],
      }),
    ]))
  })

  it('deleted table ⇒ remove / breaking', async () => {
    const beforeSql = `
      create table a(id int);
      create table b(id int);
    `
    const afterSql = `
      create table a(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the deleted table
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        type: breaking,
        beforeValue: expect.objectContaining({ kind: 'Table', name: 'b' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 1]],
      }),
    ]))
  })

  it('added column ⇒ add / non-breaking', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int, name varchar(50));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added column
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ name: 'name' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 1]],
      }),
    ]))
  })

  it('deleted column ⇒ remove / breaking', async () => {
    const beforeSql = 'create table t(id int, name varchar(50));'
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the deleted column
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        type: breaking,
        beforeValue: expect.objectContaining({ name: 'name' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 1]],
      }),
    ]))
  })
})

// The SchemaType change is reported per-property (no collapse): a same-kind change is a
// single diff at the exact field that moved; the family-aware verdict rides on the /type name.
describe('type-change classification', () => {
  it('same-family type change (int→bigint) ⇒ /type-name replace / non-breaking', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id bigint);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the /type-name replace
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
  })

  it('same-family widening (varchar(50)→varchar(200)) ⇒ /size replace / non-breaking', async () => {
    const beforeSql = 'create table t(name varchar(50));'
    const afterSql = 'create table t(name varchar(200));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // only the /size replace (the type name is unchanged)
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: 50,
        afterValue: 200,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'size']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'size']],
      }),
    ]))
  })

  it('cross-family type change (int→text) ⇒ /type-name replace / breaking', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id text);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the /type-name replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: breaking,
        beforeValue: 'integer',
        afterValue: 'text',
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'type']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'type']],
      }),
    ]))
  })

  it('within-family precision loss (numeric(10,2)→int) ⇒ per-property, all non-breaking', async () => {
    const beforeSql = 'create table t(n numeric(10,2));'
    const afterSql = 'create table t(n int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    // numeric→integer keeps the numeric family (non-breaking), and the now-irrelevant
    // precision/scale are reported as their own removals.
    expect(diffs).toHaveLength(3) // /type-name replace + /precision remove + /scale remove
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: 'numeric',
        afterValue: 'integer',
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'type']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'type']],
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        type: nonBreaking,
        beforeValue: 10,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'precision']],
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        type: nonBreaking,
        beforeValue: 2,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'scale']],
      }),
    ]))
  })

  it('cross-family with shape delta (int→varchar(50)) ⇒ breaking /type + non-breaking /size', async () => {
    const beforeSql = 'create table t(c int);'
    const afterSql = 'create table t(c varchar(50));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    // The breaking verdict lands on the /type-name change; the added size is its own diff.
    expect(diffs).toHaveLength(2) // /type-name replace (breaking) + /size add
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: breaking,
        beforeValue: 'integer',
        afterValue: 'varchar',
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'type']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'type']],
      }),
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: 50,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type', 'size']],
      }),
    ]))
  })

})

describe('nullability classification', () => {
  it('not-null → nullable ⇒ replace / non-breaking', async () => {
    const beforeSql = 'create table t(id int not null);'
    const afterSql = 'create table t(id int null);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the nullability replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: false,
        afterValue: true,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
      }),
    ]))
  })

  it('nullable → not-null ⇒ replace / non-breaking', async () => {
    const beforeSql = 'create table t(id int null);'
    const afterSql = 'create table t(id int not null);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the nullability replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: true,
        afterValue: false,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
      }),
    ]))
  })

})

describe('enum value classification', () => {
  it('added enum value ⇒ add / non-breaking', async () => {
    const beforeSql = `
      create type mood as enum ('happy', 'sad');
      create table t(m mood);
    `
    const afterSql = `
      create type mood as enum ('happy', 'sad', 'neutral');
      create table t(m mood);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added enum value
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: 'neutral',
        afterDeclarationPaths: [['schemas', 0, 'objects', 0, 'values', 2]],
      }),
    ]))
  })

  it('removed enum value ⇒ remove / non-breaking', async () => {
    const beforeSql = `
      create type mood as enum ('happy', 'sad', 'neutral');
      create table t(m mood);
    `
    const afterSql = `
      create type mood as enum ('happy', 'sad');
      create table t(m mood);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the removed enum value
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        type: nonBreaking,
        beforeValue: 'neutral',
        beforeDeclarationPaths: [['schemas', 0, 'objects', 0, 'values', 2]],
      }),
    ]))
  })
})

describe('default classification', () => {
  it('added default ⇒ add / non-breaking', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int default 5);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added default
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ kind: 'Literal', value: '5' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default']],
      }),
    ]))
  })

  it('deleted default ⇒ remove / non-breaking', async () => {
    const beforeSql = 'create table t(id int default 5);'
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the deleted default
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        type: nonBreaking,
        beforeValue: expect.objectContaining({ kind: 'Literal', value: '5' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default']],
      }),
    ]))
  })

  it('changed default ⇒ replace / non-breaking', async () => {
    const beforeSql = 'create table t(id int default 5);'
    const afterSql = 'create table t(id int default 7);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the changed default value
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: '5',
        afterValue: '7',
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default', 'value']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default', 'value']],
      }),
    ]))
  })

  it('unchanged default ⇒ 0 diffs', async () => {
    const sql = 'create table t(id int default 5);'
    const { diffs } = await diffSql(sql, sql)
    expect(diffs).toHaveLength(0)
  })
})
