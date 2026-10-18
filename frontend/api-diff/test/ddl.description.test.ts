import { annotation, Diff } from '../src'
import { DESCRIPTION_VALUE_MAX_LENGTH } from '../src/ddl'
import { diffSql } from './helper/ddl'

const onlyDescription = (diffs: Diff[]): string | undefined => {
  expect(diffs).toHaveLength(1)
  return diffs[0].description
}

// Human-readable description strings for ddlapi diffs. Article-less wording; the `in schema`
// clause is omitted for the default schema (public). The action is bracketed
// (`[Added]`/`[Deleted]`/`[Changed]`) and entity names / values are wrapped in apostrophes.
// Potentially long free-text values are truncated at DESCRIPTION_VALUE_MAX_LENGTH. Tests are
// grouped by the schema element they describe.

describe('tables', () => {
  it('added table', async () => {
    const beforeSql = `
      create table a(id int);
    `
    const afterSql = `
      create table a(id int);
      create table b(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] table 'b'")
  })

  it('deleted table', async () => {
    const beforeSql = `
      create table a(id int);
      create table b(id int);
    `
    const afterSql = `
      create table a(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] table 'b'")
  })
})

describe('columns', () => {
  it('added column', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int, name varchar(50));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] column 'name' to table 't'")
  })

  it('deleted column', async () => {
    const beforeSql = 'create table t(id int, name varchar(50));'
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] column 'name' from table 't'")
  })

  it('added column in a non-default schema includes the in-schema clause', async () => {
    const beforeSql = 'create table s.t(id int);'
    const afterSql = 'create table s.t(id int, name varchar(50));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] column 'name' to table 't' in schema 's'")
  })
})

describe('column type', () => {
  it('int → bigint', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id bigint);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'id' of table 't' from 'integer' to 'bigint'")
  })

  it('varchar(50) → varchar(200)', async () => {
    const beforeSql = 'create table t(name varchar(50));'
    const afterSql = 'create table t(name varchar(200));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'name' of table 't' from 'varchar(50)' to 'varchar(200)'")
  })

  it('enum → text reports the type change only', async () => {
    const beforeSql = `
      create type mood as enum ('happy', 'sad');
      create table t(m mood);
    `
    const afterSql = `
      create type mood as enum ('happy', 'sad');
      create table t(m text);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'm' of table 't' from 'mood' to 'text'")
  })

  it('text → enum reports the type change only', async () => {
    const beforeSql = `
      create type mood as enum ('happy', 'sad');
      create table t(m text);
    `
    const afterSql = `
      create type mood as enum ('happy', 'sad');
      create table t(m mood);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'm' of table 't' from 'text' to 'mood'")
  })

  it('int → text', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id text);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'id' of table 't' from 'integer' to 'text'")
  })

  it('numeric precision/scale change renders the whole type', async () => {
    const beforeSql = 'create table t(n numeric(10,2));'
    const afterSql = 'create table t(n numeric(10,0));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'n' of table 't' from 'numeric(10,2)' to 'numeric(10,0)'")
  })
})

describe('column nullability', () => {
  it('not null → null', async () => {
    const beforeSql = 'create table t(id int not null);'
    const afterSql = 'create table t(id int null);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] constraint for column 'id' of table 't' from 'NOT NULL' to 'NULL'")
  })

  it('null → not null', async () => {
    const beforeSql = 'create table t(id int null);'
    const afterSql = 'create table t(id int not null);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] constraint for column 'id' of table 't' from 'NULL' to 'NOT NULL'")
  })

  // Neither side writes the nullability, so the values are materialized from defaults and the
  // only declaration path is the synthetic `#defaults` origin. The description has to resolve the
  // column from the crawl route instead, or it degrades to printing that origin.
  it('implied by a primary key that gains a column', async () => {
    const beforeSql = 'create table t(id int, tenant_id int, constraint pk primary key (id));'
    const afterSql = 'create table t(id int, tenant_id int, constraint pk primary key (id, tenant_id));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs.map(d => d.description)).toEqual(expect.arrayContaining([
      "[Changed] constraint for column 'tenant_id' of table 't' from 'NULL' to 'NOT NULL'",
    ]))
  })

  it('implied by a primary key that loses a column', async () => {
    const beforeSql = 'create table t(id int, tenant_id int, constraint pk primary key (id, tenant_id));'
    const afterSql = 'create table t(id int, tenant_id int, constraint pk primary key (id));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs.map(d => d.description)).toEqual(expect.arrayContaining([
      "[Changed] constraint for column 'tenant_id' of table 't' from 'NOT NULL' to 'NULL'",
    ]))
  })

  it('implied by adding a primary key', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int, constraint pk primary key (id));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs.map(d => d.description)).toEqual(expect.arrayContaining([
      "[Changed] constraint for column 'id' of table 't' from 'NULL' to 'NOT NULL'",
    ]))
  })
})

describe('column default', () => {
  it('added default (literal)', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int default 5);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] default '5' for column 'id' of table 't'")
  })

  it('deleted default (literal)', async () => {
    const beforeSql = 'create table t(id int default 5);'
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] default '5' for column 'id' of table 't'")
  })

  it('added default (raw expression)', async () => {
    const beforeSql = 'create table t(ts timestamp);'
    const afterSql = 'create table t(ts timestamp default now());'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] default 'now()' for column 'ts' of table 't'")
  })

  it('changed default (literal)', async () => {
    const beforeSql = 'create table t(id int default 5);'
    const afterSql = 'create table t(id int default 7);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] default for column 'id' of table 't' from '5' to '7'")
  })

  it('changed default (raw expression)', async () => {
    const beforeSql = 'create table t(ts timestamp default now());'
    const afterSql = 'create table t(ts timestamp default current_timestamp);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] default for column 'ts' of table 't' from 'now()' to 'CURRENT_TIMESTAMP'")
  })
})

describe('column collation', () => {
  it('added collation', async () => {
    const beforeSql = 'create table t(c text);'
    const afterSql = 'create table t(c text collate "C");'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] collation 'C' for column 'c' of table 't'")
  })

  it('deleted collation', async () => {
    const beforeSql = 'create table t(c text collate "C");'
    const afterSql = 'create table t(c text);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] collation 'C' for column 'c' of table 't'")
  })

  it('changed collation', async () => {
    const beforeSql = 'create table t(c text collate "C");'
    const afterSql = 'create table t(c text collate "POSIX");'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] collation for column 'c' of table 't' from 'C' to 'POSIX'")
  })
})

describe('column generated expression', () => {
  it('added generated expression', async () => {
    const beforeSql = 'create table t(a int, b int);'
    const afterSql = 'create table t(a int, b int generated always as (a * 2) stored);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] generated expression 'a * 2' for column 'b' of table 't'")
  })

  it('deleted generated expression', async () => {
    const beforeSql = 'create table t(a int, b int generated always as (a * 2) stored);'
    const afterSql = 'create table t(a int, b int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] generated expression 'a * 2' for column 'b' of table 't'")
  })

  it('changed generated expression', async () => {
    const beforeSql = 'create table t(a int, b int generated always as (a * 2) stored);'
    const afterSql = 'create table t(a int, b int generated always as (a * 3) stored);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] generated expression for column 'b' of table 't' from 'a * 2' to 'a * 3'")
  })
})

// COMMENT ON column / table produces an annotation-typed diff. (COMMENT ON SCHEMA is parsed
// but never attaches a node, so a schema-level comment description is not producible here.)
describe('comments (descriptions)', () => {
  it('added column description', async () => {
    const beforeSql = `
      create table t(id int);
    `
    const afterSql = `
      create table t(id int);
      comment on column t.id is 'hello';
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Added] description 'hello' for column 'id' of table 't'")
  })

  it('deleted column description', async () => {
    const beforeSql = `
      create table t(id int);
      comment on column t.id is 'hello';
    `
    const afterSql = `
      create table t(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Deleted] description 'hello' for column 'id' of table 't'")
  })

  it('changed column description', async () => {
    const beforeSql = `
      create table t(id int);
      comment on column t.id is 'a';
    `
    const afterSql = `
      create table t(id int);
      comment on column t.id is 'b';
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Changed] description for column 'id' of table 't' from 'a' to 'b'")
  })

  it('added table description', async () => {
    const beforeSql = `
      create table t(id int);
    `
    const afterSql = `
      create table t(id int);
      comment on table t is 'the table';
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Added] description 'the table' for table 't'")
  })

  it('deleted table description', async () => {
    const beforeSql = `
      create table t(id int);
      comment on table t is 'the table';
    `
    const afterSql = `
      create table t(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Deleted] description 'the table' for table 't'")
  })

  it('changed table description', async () => {
    const beforeSql = `
      create table t(id int);
      comment on table t is 'a';
    `
    const afterSql = `
      create table t(id int);
      comment on table t is 'b';
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Changed] description for table 't' from 'a' to 'b'")
  })
})

describe('enum values', () => {
  it('added enum value', async () => {
    const beforeSql = `
      create type mood as enum ('happy', 'sad');
      create table t(m mood);
    `
    const afterSql = `
      create type mood as enum ('happy', 'sad', 'neutral');
      create table t(m mood);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] value 'neutral' to enum 'mood'")
  })

  it('removed enum value', async () => {
    const beforeSql = `
      create type mood as enum ('happy', 'sad', 'neutral');
      create table t(m mood);
    `
    const afterSql = `
      create type mood as enum ('happy', 'sad');
      create table t(m mood);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] value 'neutral' from enum 'mood'")
  })
})

describe('enum types', () => {
  it('added enum lists its values', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = `
      create type mood as enum ('happy', 'sad');
      create table t(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] enum 'mood' with values 'happy', 'sad'")
  })

  it('deleted enum with one value uses the singular', async () => {
    const beforeSql = `
      create type mood as enum ('happy');
      create table t(id int);
    `
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] enum 'mood' with value 'happy'")
  })

  it('deleted enum with no values names the enum only', async () => {
    const beforeSql = `
      create type mood as enum ();
      create table t(id int);
    `
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] enum 'mood'")
  })

  it('added enum in a non-default schema includes the in-schema clause', async () => {
    const beforeSql = 'create table s.t(id int);'
    const afterSql = `
      create type s.mood as enum ('happy', 'sad');
      create table s.t(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] enum 'mood' in schema 's' with values 'happy', 'sad'")
  })
})

describe('indexes and primary keys', () => {
  it('added index lists its key column', async () => {
    const beforeSql = `
      create table t(id int, name text);
    `
    const afterSql = `
      create table t(id int, name text);
      create index idx_name on t(name);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] index 'idx_name' on column 'name' of table 't'")
  })

  it('added unique index includes the kind word', async () => {
    const beforeSql = `
      create table t(id int, name text);
    `
    const afterSql = `
      create table t(id int, name text);
      create unique index idx_name on t(name);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] unique index 'idx_name' on column 'name' of table 't'")
  })

  it('added composite index lists all key columns', async () => {
    const beforeSql = `
      create table t(a int, b int);
    `
    const afterSql = `
      create table t(a int, b int);
      create index idx on t(a, b);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] index 'idx' on columns 'a', 'b' of table 't'")
  })

  it('added primary key', async () => {
    const beforeSql = 'create table t(id int not null);'
    const afterSql = 'create table t(id int not null, primary key (id));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] primary key on column 'id' of table 't'")
  })

  it('added composite primary key lists all key columns', async () => {
    const beforeSql = 'create table t(a int not null, b int not null);'
    const afterSql = 'create table t(a int not null, b int not null, primary key (a, b));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] primary key on columns 'a', 'b' of table 't'")
  })

  it('removed index', async () => {
    const beforeSql = `
      create table t(id int, name text);
      create index idx_name on t(name);
    `
    const afterSql = `
      create table t(id int, name text);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] index 'idx_name' on column 'name' of table 't'")
  })

  it('removed primary key', async () => {
    const beforeSql = 'create table t(id int not null, primary key (id));'
    const afterSql = 'create table t(id int not null);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] primary key on column 'id' of table 't'")
  })

  it('unique flip renders from/to', async () => {
    const beforeSql = `
      create table t(name text);
      create unique index u on t(name);
    `
    const afterSql = `
      create table t(name text);
      create index u on t(name);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] index 'u' on table 't' from 'UNIQUE' to 'NON-UNIQUE'")
  })

  it('unique flip of an unnamed index names its columns, not a primary key', async () => {
    const beforeSql = `
      create table t(id int, c1 int);
      create index on t(c1);
    `
    const afterSql = `
      create table t(id int, c1 int);
      create unique index on t(c1);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] index on column 'c1' of table 't' from 'NON-UNIQUE' to 'UNIQUE'")
  })

  it('unique flip of an unnamed index in a non-default schema names that schema', async () => {
    const beforeSql = `
      create table s.t(a int, b int);
      create unique index on s.t(a, b);
    `
    const afterSql = `
      create table s.t(a int, b int);
      create index on s.t(a, b);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] index on columns 'a', 'b' of table 't' in schema 's' from 'UNIQUE' to 'NON-UNIQUE'")
  })

  it('added column key part to an index', async () => {
    const beforeSql = `
      create table t(a int, b int);
      create index idx on t(a);
    `
    const afterSql = `
      create table t(a int, b int);
      create index idx on t(a, b);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] column 'b' to index 'idx' of table 't'")
  })

  it('removed column key part from an index', async () => {
    const beforeSql = `
      create table t(a int, b int);
      create index idx on t(a, b);
    `
    const afterSql = `
      create table t(a int, b int);
      create index idx on t(a);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] column 'b' from index 'idx' of table 't'")
  })

  it('added expression key part to an index', async () => {
    const beforeSql = `
      create table t(a int, b int);
      create index idx on t(a);
    `
    const afterSql = `
      create table t(a int, b int);
      create index idx on t(a, lower(b::text));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] expression 'lower(b::text)' to index 'idx' of table 't'")
  })

  it('removed expression key part from an index', async () => {
    const beforeSql = `
      create table t(a int, b int);
      create index idx on t(a, lower(b::text));
    `
    const afterSql = `
      create table t(a int, b int);
      create index idx on t(a);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] expression 'lower(b::text)' from index 'idx' of table 't'")
  })

  it('unnamed unique index names its kind, not a primary key', async () => {
    // An inline UNIQUE column constraint has no name, so the description cannot quote one —
    // it must still say what the index is rather than falling back to the primary-key wording.
    const beforeSql = 'create table t(id int, code int);'
    const afterSql = 'create table t(id int unique, code int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs.map(d => d.description)).toContain("[Added] unique index on column 'id' of table 't'")
  })

  it('added key column to an existing primary key', async () => {
    const beforeSql = 'create table t(id int not null, tenant_id int not null, primary key (id));'
    const afterSql = 'create table t(id int not null, tenant_id int not null, primary key (id, tenant_id));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] column 'tenant_id' to primary key of table 't'")
  })

  it('removed key column from an existing primary key', async () => {
    const beforeSql = 'create table t(id int not null, tenant_id int not null, primary key (id, tenant_id));'
    const afterSql = 'create table t(id int not null, tenant_id int not null, primary key (id));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] column 'tenant_id' from primary key of table 't'")
  })

  it('column reorder ⇒ one position description per moved part', async () => {
    const beforeSql = `
      create table t(a int, b int);
      create index idx on t(a, b);
    `
    const afterSql = `
      create table t(a int, b int);
      create index idx on t(b, a);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(2)
    // seqNo is 0-based in the model and rendered 1-based: a moves 1→2, b moves 2→1.
    expect(diffs.map(d => d.description).sort()).toEqual([
      "[Changed] position of column 'a' in index 'idx' of table 't' from '1' to '2'",
      "[Changed] position of column 'b' in index 'idx' of table 't' from '2' to '1'",
    ])
  })

  it('primary key column reorder ⇒ one position description per moved column', async () => {
    const beforeSql = 'create table t(a int not null, b int not null, primary key (a, b));'
    const afterSql = 'create table t(a int not null, b int not null, primary key (b, a));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(2)
    expect(diffs.map(d => d.description).sort()).toEqual([
      "[Changed] position of column 'a' in primary key of table 't' from '1' to '2'",
      "[Changed] position of column 'b' in primary key of table 't' from '2' to '1'",
    ])
  })

  it('middle column removed from a primary key ⇒ the removal and the next column moving up', async () => {
    const beforeSql = 'create table t(a int not null, b int not null, c int not null, primary key (a, b, c));'
    const afterSql = 'create table t(a int not null, b int not null, c int not null, primary key (a, c));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs.map(d => d.description).sort()).toEqual([
      "[Changed] position of column 'c' in primary key of table 't' from '3' to '2'",
      "[Deleted] column 'b' from primary key of table 't'",
    ])
  })

  it('primary key column reorder in a non-default schema includes the in-schema clause', async () => {
    const beforeSql = 'create table s.t(a int not null, b int not null, primary key (a, b));'
    const afterSql = 'create table s.t(a int not null, b int not null, primary key (b, a));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs.map(d => d.description)).toContain(
      "[Changed] position of column 'a' in primary key of table 't' in schema 's' from '1' to '2'",
    )
  })
})

describe('foreign keys', () => {
  it('added foreign key names local and referenced columns', async () => {
    const beforeSql = `
      create table t(id int, primary key (id));
      create table u(uid int, ref int);
    `
    const afterSql = `
      create table t(id int, primary key (id));
      create table u(uid int, ref int, constraint fk_u foreign key (ref) references t(id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] foreign key 'fk_u' on column 'ref' of table 'u' referencing column 'id' of table 't'")
  })

  it('added composite foreign key lists local and referenced columns', async () => {
    const beforeSql = `
      create table t(x int, y int, primary key (x, y));
      create table u(a int, b int);
    `
    const afterSql = `
      create table t(x int, y int, primary key (x, y));
      create table u(a int, b int, constraint fk foreign key (a, b) references t(x, y));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] foreign key 'fk' on columns 'a', 'b' of table 'u' referencing columns 'x', 'y' of table 't'")
  })

  it('referenced table in another schema names that schema', async () => {
    const beforeSql = `
      create table s.t(id int, primary key (id));
      create table u(ref int);
    `
    const afterSql = `
      create table s.t(id int, primary key (id));
      create table u(ref int, constraint fk_u foreign key (ref) references s.t(id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] foreign key 'fk_u' on column 'ref' of table 'u' referencing column 'id' of table 't' in schema 's'")
  })

  it('removed foreign key', async () => {
    const beforeSql = `
      create table t(id int, primary key (id));
      create table u(uid int, ref int, constraint fk_u foreign key (ref) references t(id));
    `
    const afterSql = `
      create table t(id int, primary key (id));
      create table u(uid int, ref int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] foreign key 'fk_u' on column 'ref' of table 'u' referencing column 'id' of table 't'")
  })

  it('changed on-delete action', async () => {
    const beforeSql = `
      create table t(id int, primary key (id));
      create table u(ref int, constraint fk_u foreign key (ref) references t(id) on delete no action);
    `
    const afterSql = `
      create table t(id int, primary key (id));
      create table u(ref int, constraint fk_u foreign key (ref) references t(id) on delete cascade);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] on-delete action of foreign key 'fk_u' on table 'u' from 'NO ACTION' to 'CASCADE'")
  })

  // A key's columns, referenced columns and referenced table point at entities declared
  // elsewhere. Each change is reported on the key and names the part of the key that changed.
  it('changed key columns', async () => {
    const beforeSql = `
      create table parent(id int primary key);
      create table child(a int, b int, constraint fk_c foreign key (a) references parent (id));
    `
    const afterSql = `
      create table parent(id int primary key);
      create table child(a int, b int, constraint fk_c foreign key (b) references parent (id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] columns of foreign key 'fk_c' on table 'child' from 'a' to 'b'")
  })

  it('changed key columns of a composite key lists them all', async () => {
    const beforeSql = `
      create table parent(x int, y int, primary key (x, y));
      create table child(a int, b int, c int, constraint fk_c foreign key (a, b) references parent (x, y));
    `
    const afterSql = `
      create table parent(x int, y int, primary key (x, y));
      create table child(a int, b int, c int, constraint fk_c foreign key (a, c) references parent (x, y));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] columns of foreign key 'fk_c' on table 'child' from 'a, b' to 'a, c'")
  })

  it('changed referenced columns', async () => {
    const beforeSql = `
      create table t(id int unique, code int unique);
      create table u(ref int, constraint fk_u_t foreign key (ref) references t (id));
    `
    const afterSql = `
      create table t(id int unique, code int unique);
      create table u(ref int, constraint fk_u_t foreign key (ref) references t (code));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] referenced columns of foreign key 'fk_u_t' on table 'u' from 'id' to 'code'")
  })

  it('changed referenced table renders from/to', async () => {
    const beforeSql = `
      create table legacy(id int primary key);
      create table target(id int primary key);
      create table u(ref int, constraint fk_u_ref foreign key (ref) references legacy (id));
    `
    const afterSql = `
      create table legacy(id int primary key);
      create table target(id int primary key);
      create table u(ref int, constraint fk_u_ref foreign key (ref) references target (id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] referenced table of foreign key 'fk_u_ref' on table 'u' from 'legacy' to 'target'")
  })

  it('changed schema of the referenced table renders qualified from/to', async () => {
    const beforeSql = `
      create table a.t(id int primary key);
      create table t(id int primary key);
      create table u(ref int, constraint fk_u_ref foreign key (ref) references a.t (id));
    `
    const afterSql = `
      create table a.t(id int primary key);
      create table t(id int primary key);
      create table u(ref int, constraint fk_u_ref foreign key (ref) references t (id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] referenced table of foreign key 'fk_u_ref' on table 'u' from 'a.t' to 't'")
  })

  it('changed schema and name of the referenced table render as one from/to', async () => {
    const beforeSql = `
      create table a.users(id int primary key);
      create table b.orders(id int primary key);
      create table u(ref int, constraint fk_u_ref foreign key (ref) references a.users (id));
    `
    const afterSql = `
      create table a.users(id int primary key);
      create table b.orders(id int primary key);
      create table u(ref int, constraint fk_u_ref foreign key (ref) references b.orders (id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] referenced table of foreign key 'fk_u_ref' on table 'u' from 'a.users' to 'b.orders'")
  })

  it('changed key columns in a non-default schema names that schema', async () => {
    const beforeSql = `
      create table s.parent(id int primary key);
      create table s.child(a int, b int, constraint fk_c foreign key (a) references s.parent (id));
    `
    const afterSql = `
      create table s.parent(id int primary key);
      create table s.child(a int, b int, constraint fk_c foreign key (b) references s.parent (id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] columns of foreign key 'fk_c' on table 'child' in schema 's' from 'a' to 'b'")
  })

  it('changed on-update action', async () => {
    const beforeSql = `
      create table t(id int, primary key (id));
      create table u(ref int, constraint fk_u foreign key (ref) references t(id) on update no action);
    `
    const afterSql = `
      create table t(id int, primary key (id));
      create table u(ref int, constraint fk_u foreign key (ref) references t(id) on update cascade);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] on-update action of foreign key 'fk_u' on table 'u' from 'NO ACTION' to 'CASCADE'")
  })

  // An inline `REFERENCES` clause gives the key no name, so its columns identify it.
  it('added unnamed foreign key names its columns', async () => {
    const beforeSql = `
      create table p(id int primary key);
      create table t(r int);
    `
    const afterSql = `
      create table p(id int primary key);
      create table t(r int references p(id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] foreign key on column 'r' of table 't' referencing column 'id' of table 'p'")
  })

  it('a named key replaced by an unnamed one on the same column', async () => {
    const beforeSql = `
      create table p(id int primary key);
      create table t(a int, constraint fk_t_p foreign key (a) references p(id));
    `
    const afterSql = `
      create table p(id int primary key);
      create table t(a int references p(id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs.map(diff => diff.description)).toEqual([
      "[Deleted] foreign key 'fk_t_p' on column 'a' of table 't' referencing column 'id' of table 'p'",
      "[Added] foreign key on column 'a' of table 't' referencing column 'id' of table 'p'",
    ])
  })

  it('changed referenced table of an unnamed foreign key', async () => {
    const beforeSql = `
      create table a(id int primary key);
      create table b(id int primary key);
      create table t(r int references a(id));
    `
    const afterSql = `
      create table a(id int primary key);
      create table b(id int primary key);
      create table t(r int references b(id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] referenced table of foreign key on column 'r' of table 't' from 'a' to 'b'")
  })

  it('changed referenced columns of an unnamed foreign key in a non-default schema', async () => {
    const beforeSql = `
      create table s.p(id int unique, code int unique);
      create table s.t(r int references s.p(id));
    `
    const afterSql = `
      create table s.p(id int unique, code int unique);
      create table s.t(r int references s.p(code));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] referenced columns of foreign key on column 'r' of table 't' in schema 's' from 'id' to 'code'")
  })

  it('changed on-delete action of an unnamed foreign key', async () => {
    const beforeSql = `
      create table p(id int primary key);
      create table t(r int references p(id) on delete no action);
    `
    const afterSql = `
      create table p(id int primary key);
      create table t(r int references p(id) on delete cascade);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] on-delete action of foreign key on column 'r' of table 't' from 'NO ACTION' to 'CASCADE'")
  })
})

describe('check constraints', () => {
  it('added check includes its expression', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int, constraint c_pos check (id > 0));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] check 'c_pos' on table 't' with expression 'id > 0'")
  })

  it('removed check includes its expression', async () => {
    const beforeSql = 'create table t(id int, constraint c_pos check (id > 0));'
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] check 'c_pos' on table 't' with expression 'id > 0'")
  })

  it('changed check expression renders from/to', async () => {
    const beforeSql = 'create table t(id int, constraint c_pos check (id > 0));'
    const afterSql = 'create table t(id int, constraint c_pos check (id > 5));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] expression of check 'c_pos' on table 't' from 'id > 0' to 'id > 5'")
  })
})

describe(`long value truncation at DESCRIPTION_VALUE_MAX_LENGTH (${DESCRIPTION_VALUE_MAX_LENGTH})`, () => {
  const max = DESCRIPTION_VALUE_MAX_LENGTH
  // The renderer keeps the first `max` chars and appends an ellipsis when (and only when) the
  // value is longer than `max`.
  const truncated = (value: string): string => (value.length > max ? `${value.slice(0, max)}…` : value)

  it('comment longer than the limit is truncated with an ellipsis on add', async () => {
    const text = 'a'.repeat(max + 1)
    const beforeSql = 'create table t(id int);'
    const afterSql = `create table t(id int); comment on table t is '${text}';`
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe(`[Added] description '${truncated(text)}' for table 't'`)
  })

  it('comment of exactly the limit is not truncated (boundary)', async () => {
    const text = 'a'.repeat(max)
    const beforeSql = 'create table t(id int);'
    const afterSql = `create table t(id int); comment on table t is '${text}';`
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe(`[Added] description '${text}' for table 't'`)
  })

  it('both endpoints of a comment change are truncated independently', async () => {
    const beforeText = 'a'.repeat(max + 10)
    const afterText = 'b'.repeat(max + 10)
    const beforeSql = `create table t(id int); comment on table t is '${beforeText}';`
    const afterSql = `create table t(id int); comment on table t is '${afterText}';`
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe(`[Changed] description for table 't' from '${truncated(beforeText)}' to '${truncated(afterText)}'`)
  })

  it('check expression longer than the limit is truncated', async () => {
    // A single-operator comparison the parser stores verbatim; padded past `max` with a literal
    // sized from the constant so it is unambiguously over the limit.
    const expr = `id <> ${'9'.repeat(max)}`
    const beforeSql = 'create table t(id int);'
    const afterSql = `create table t(id int, constraint c check (${expr}));`
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe(`[Added] check 'c' on table 't' with expression '${truncated(expr)}'`)
  })

  it('generated expression longer than the limit is truncated', async () => {
    const expr = `a + ${'9'.repeat(max)}`
    const beforeSql = 'create table t(a int, b int);'
    const afterSql = `create table t(a int, b int generated always as (${expr}) stored);`
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe(`[Added] generated expression '${truncated(expr)}' for column 'b' of table 't'`)
  })
})
