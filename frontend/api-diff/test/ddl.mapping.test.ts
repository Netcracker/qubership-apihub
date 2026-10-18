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
