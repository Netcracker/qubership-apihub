import { DiffAction, nonBreaking } from '../src'
import { diffSql } from './helper/ddl'
import { diffsMatcher } from './helper/matchers'

// Constraints & access structures. All non-breaking for a reader: a constraint or access
// structure never makes a previously-valid SELECT fail to execute.
// Field assertions only — description strings live in ddl.description.test.ts.

describe('indexes / primary key / unique', () => {
  it('add index ⇒ one non-breaking diff', async () => {
    const beforeSql = `
      create table t(id int, name text);
    `
    const afterSql = `
      create table t(id int, name text);
      create index idx_name on t(name);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added index
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ kind: 'Index', name: 'idx_name' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'indexes', 0]],
      }),
    ]))
  })

  it('remove index ⇒ one non-breaking diff', async () => {
    const beforeSql = `
      create table t(id int, name text);
      create index idx_name on t(name);
    `
    const afterSql = `
      create table t(id int, name text);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the removed index
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        type: nonBreaking,
        beforeValue: expect.objectContaining({ kind: 'Index', name: 'idx_name' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'indexes', 0]],
      }),
    ]))
  })

  it('primary key add ⇒ one non-breaking diff', async () => {
    const beforeSql = 'create table t(id int not null);'
    const afterSql = 'create table t(id int not null, primary key (id));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added primary key
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ kind: 'Index' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'primaryKey']],
      }),
    ]))
  })

  it('unique flip true→false ⇒ one non-breaking diff', async () => {
    const beforeSql = `
      create table t(name text);
      create unique index u on t(name);
    `
    const afterSql = `
      create table t(name text);
      create index u on t(name);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the unique flag flip
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: true,
        afterValue: false,
        // after side resolves to the `unique:false` default origin, so assert the before path
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'indexes', 0, 'unique']],
      }),
    ]))
  })

  it('reorder index columns ⇒ two non-breaking seqNo replace diffs (not add/remove)', async () => {
    const beforeSql = `
      create table t(a int, b int);
      create index idx on t(a, b);
    `
    const afterSql = `
      create table t(a int, b int);
      create index idx on t(b, a);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(2) // the two moved parts' seqNo
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: 0,
        afterValue: 1,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'indexes', 0, 'parts', 0, 'seqNo']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'indexes', 0, 'parts', 1, 'seqNo']],
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: 1,
        afterValue: 0,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'indexes', 0, 'parts', 1, 'seqNo']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'indexes', 0, 'parts', 0, 'seqNo']],
      }),
    ]))
  })

  it('add a column to a composite index ⇒ one non-breaking part add', async () => {
    const beforeSql = `
      create table t(a int, b int);
      create index idx on t(a);
    `
    const afterSql = `
      create table t(a int, b int);
      create index idx on t(a, b);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added index part
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ column: expect.objectContaining({ name: 'b' }) }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'indexes', 0, 'parts', 1]],
      }),
    ]))
  })
})

describe('foreign keys', () => {
  // Shared fixtures: the add/remove tests use them with swapped before/after roles.
  const NO_FK = `
    create table t(id int, primary key (id));
    create table u(uid int, ref int);
  `
  const WITH_FK = `
    create table t(id int, primary key (id));
    create table u(uid int, ref int, constraint fk_u foreign key (ref) references t(id));
  `

  it('add foreign key ⇒ one non-breaking diff', async () => {
    const beforeSql = NO_FK
    const afterSql = WITH_FK
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added foreign key
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ kind: 'ForeignKey', symbol: 'fk_u' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 1, 'foreignKeys', 0]],
      }),
    ]))
  })

  it('remove foreign key ⇒ one non-breaking diff', async () => {
    const beforeSql = WITH_FK
    const afterSql = NO_FK
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the removed foreign key
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        type: nonBreaking,
        beforeValue: expect.objectContaining({ kind: 'ForeignKey', symbol: 'fk_u' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 1, 'foreignKeys', 0]],
      }),
    ]))
  })

  it('change onDelete ⇒ one non-breaking diff', async () => {
    const beforeSql = `
      create table t(id int, primary key (id));
      create table u(ref int, constraint fk_u foreign key (ref) references t(id) on delete no action);
    `
    const afterSql = `
      create table t(id int, primary key (id));
      create table u(ref int, constraint fk_u foreign key (ref) references t(id) on delete cascade);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the onDelete change
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: 'NO ACTION',
        afterValue: 'CASCADE',
        beforeDeclarationPaths: [['schemas', 0, 'tables', 1, 'foreignKeys', 0, 'onDelete']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 1, 'foreignKeys', 0, 'onDelete']],
      }),
    ]))
  })
})

describe('check constraints', () => {
  it('add check ⇒ one non-breaking diff', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int, constraint c_pos check (id > 0));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added check
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ kind: 'Check', name: 'c_pos', expr: 'id > 0' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'attrs', 0]],
      }),
    ]))
  })

  it('change a check expr ⇒ one non-breaking diff', async () => {
    const beforeSql = 'create table t(id int, constraint c_pos check (id > 0));'
    const afterSql = 'create table t(id int, constraint c_pos check (id > 5));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the check expr change
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: 'id > 0',
        afterValue: 'id > 5',
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'attrs', 0, 'expr']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'attrs', 0, 'expr']],
      }),
    ]))
  })

  it('two checks with different names map independently (change one ⇒ one diff)', async () => {
    const beforeSql = 'create table t(id int, age int, constraint c_id check (id > 0), constraint c_age check (age > 0));'
    const afterSql = 'create table t(id int, age int, constraint c_id check (id > 0), constraint c_age check (age > 18));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // only c_age changed
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
})
