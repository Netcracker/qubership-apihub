import { annotation, breaking, Diff, DiffAction, nonBreaking } from '../src'
import { diffSql } from './helper/ddl'
import { diffsMatcher } from './helper/matchers'

// Guards the identity-key mapping resolvers. A reorder must not surface as
// spurious add/remove; an add/remove of one element must surface as exactly one diff.
// Field assertions only — description strings live in ddl.description.test.ts.

describe('name-keyed resolvers', () => {
  it('reordering tables ⇒ no diffs', async () => {
    const beforeSql = `
      create table a(id int);
      create table b(id int);
    `
    const afterSql = `
      create table b(id int);
      create table a(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toBeEmpty()
  })

  it('reordering columns ⇒ no diffs', async () => {
    const beforeSql = 'create table t(a int, b int);'
    const afterSql = 'create table t(b int, a int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toBeEmpty()
  })

  it('adding one table ⇒ exactly one element-level diff', async () => {
    const beforeSql = `
      create table a(id int);
    `
    const afterSql = `
      create table a(id int);
      create table b(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // only the added table
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ kind: 'Table', name: 'b' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 1]],
      }),
    ]))
  })

  it('removing one column ⇒ exactly one element-level diff', async () => {
    const beforeSql = 'create table t(a int, b int);'
    const afterSql = 'create table t(b int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // only the removed column
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        type: breaking,
        beforeValue: expect.objectContaining({ name: 'a' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0]],
      }),
    ]))
  })
})

// An inline `UNIQUE` column constraint parses to an index with no name, so `indexes[]` falls
// back to keying an element by the columns it covers.
describe('unnamed indexes', () => {
  it('an unchanged table with unnamed unique indexes ⇒ no diffs', async () => {
    const sql = 'create table t(id int unique, code int unique);'
    const { diffs } = await diffSql(sql, sql)
    expect(diffs).toBeEmpty()
  })

  it('reordering unnamed unique indexes ⇒ no diffs', async () => {
    const beforeSql = 'create table t(id int unique, code int unique);'
    const afterSql = 'create table t(code int unique, id int unique);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toBeEmpty()
  })

  it('adding one unnamed unique index ⇒ exactly one element-level diff', async () => {
    const beforeSql = 'create table t(id int unique, code int);'
    const afterSql = 'create table t(id int unique, code int unique);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // only the added index
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'indexes', 1]],
      }),
    ]))
  })

  it('a named index never collides with an unnamed one on the same column', async () => {
    // The named index is called `id`, the unnamed one covers column `id`: the two key spaces
    // are kept apart, so renaming the named index does not map it onto the unnamed one.
    const beforeSql = `
      create table t(id int unique);
      create index id on t(id);
    `
    const afterSql = `
      create table t(id int unique);
      create index renamed on t(id);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ action: DiffAction.remove, type: nonBreaking }),
      expect.objectContaining({ action: DiffAction.add, type: nonBreaking }),
    ]))
  })
})

// An inline `REFERENCES` clause parses to a foreign key with no name, so `foreignKeys[]` falls
// back to keying an element by the columns it covers.
describe('unnamed foreign keys', () => {
  it('an unchanged table with unnamed foreign keys ⇒ no diffs', async () => {
    const sql = `
      create table p(id int primary key, code int unique);
      create table t(a int references p(id), b int references p(code));
    `
    const { diffs } = await diffSql(sql, sql)
    expect(diffs).toBeEmpty()
  })

  it('retargeting an unnamed foreign key ⇒ one diff on its referenced table, not a remove and an add', async () => {
    const beforeSql = `
      create table legacy(id int primary key);
      create table target(id int primary key);
      create table t(ref int references legacy(id));
    `
    const afterSql = `
      create table legacy(id int primary key);
      create table target(id int primary key);
      create table t(ref int references target(id));
    `
    const refTablePath = ['schemas', 0, 'tables', 2, 'foreignKeys', 0, 'refTable']
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the refTable change
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeDeclarationPaths: [refTablePath],
        afterDeclarationPaths: [refTablePath],
      }),
    ]))
  })

  it('moving an unnamed foreign key to another column ⇒ a remove and an add', async () => {
    const beforeSql = `
      create table p(id int primary key);
      create table t(a int references p(id), b int);
    `
    const afterSql = `
      create table p(id int primary key);
      create table t(a int, b int references p(id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ action: DiffAction.remove, type: nonBreaking }),
      expect.objectContaining({ action: DiffAction.add, type: nonBreaking }),
    ]))
  })

  it('a named foreign key never collides with an unnamed one on the same column', async () => {
    // The named key is called `a`, the unnamed one covers column `a`: the two key spaces are kept
    // apart, so renaming the named key does not map it onto the unnamed one.
    const beforeSql = `
      create table p(id int primary key);
      create table t(a int references p(id), constraint a foreign key (a) references p(id));
    `
    const afterSql = `
      create table p(id int primary key);
      create table t(a int references p(id), constraint renamed foreign key (a) references p(id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({ action: DiffAction.remove, type: nonBreaking }),
      expect.objectContaining({ action: DiffAction.add, type: nonBreaking }),
    ]))
  })
})

describe('attrs composite-key + enum values set', () => {
  it('a Comment text change ⇒ exactly one diff (attr keyed by kind)', async () => {
    const beforeSql = `
      create table t(id int);
      comment on column t.id is 'before';
    `
    const afterSql = `
      create table t(id int);
      comment on column t.id is 'after';
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the single Comment text replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: annotation,
        beforeValue: 'before',
        afterValue: 'after',
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0, 'text']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0, 'text']],
      }),
    ]))
  })

  it('two checks with different names map independently (change one ⇒ one diff)', async () => {
    const beforeSql = 'create table t(id int, age int, constraint c_id check (id > 0), constraint c_age check (age > 0));'
    const afterSql = 'create table t(id int, age int, constraint c_id check (id > 0), constraint c_age check (age > 18));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // only c_age changed; c_id maps to itself
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: 'age > 0',
        afterValue: 'age > 18',
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'attrs', 1, 'expr']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'attrs', 1, 'expr']],
      }),
    ]))
  })

  it('enum value reorder ⇒ 0 diffs (set semantics)', async () => {
    const beforeSql = `
      create type mood as enum ('happy', 'sad');
      create table t(m mood);
    `
    const afterSql = `
      create type mood as enum ('sad', 'happy');
      create table t(m mood);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toBeEmpty()
  })

  it('enum value add fires at element granularity ⇒ one diff', async () => {
    const beforeSql = `
      create type mood as enum ('happy');
      create table t(m mood);
    `
    const afterSql = `
      create type mood as enum ('happy', 'sad', 'neutral');
      create table t(m mood);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(2) // the two added value elements
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: 'sad',
        afterDeclarationPaths: [['schemas', 0, 'objects', 0, 'values', 1]],
      }),
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: 'neutral',
        afterDeclarationPaths: [['schemas', 0, 'objects', 0, 'values', 2]],
      }),
    ]))
  })
})
