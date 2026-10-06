import { readFileSync } from 'fs'
import path from 'path'
import { literal, rawExpr, TypeKind } from '@netcracker/qubership-apihub-ddlapi'
import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import { DdlApiSpecTransformer } from '../../src/building-service/ddlapi/shared/ddlapi-spec-transformer'
import { DDL_COLUMN_GENERATED_BY } from '../../src/model/ddlapi/tree/node-value'
import { formatDefaultValueDisplayString, formatDefaultValueForDisplay, formatDdlExpr } from '../../src/shared/ddlapi/format-ddl-expr'
import { createBuildingServiceLogger } from '../../src/loggers'

describe('formatDdlExpr', () => {
  it('formats literal expressions', () => {
    expect(formatDdlExpr(literal('true'))).toBe('true')
  })

  it('formats raw expressions', () => {
    expect(formatDdlExpr(rawExpr('gen_random_uuid()'))).toBe('gen_random_uuid()')
  })

  it('unwraps SQL string literals for default value display', () => {
    expect(formatDefaultValueDisplayString("'draft'")).toBe('draft')
    expect(formatDefaultValueDisplayString("'1 day'")).toBe('1 day')
    expect(formatDefaultValueDisplayString("'\\x0102'")).toBe('\\x0102')
    expect(formatDefaultValueDisplayString("b'101'")).toBe("b'101'")
    expect(formatDefaultValueDisplayString('0')).toBe('0')
    expect(formatDefaultValueDisplayString("it''s fine")).toBe("it''s fine")
    expect(formatDefaultValueDisplayString("'it''s'")).toBe("it's")
  })

  it('formats default expr literals without surrounding quotes', () => {
    expect(formatDefaultValueForDisplay(literal("'pending'"))).toBe('pending')
  })

  // Regression for packages/samples/ddlapi/escaping-spec-chars: a column default's `E'...'`
  // literal has its named escapes (`\n`/`\r`/`\t`) resolved into real control-character bytes by
  // ddlapi's parser before this layer ever sees the value (confirmed empirically - see
  // escapeControlCharsForDisplay's doc comment in format-ddl-expr.ts). Rendering those bytes as-is
  // either breaks the single-line `Default` row (a real newline) or is invisible (CR/TAB) - the
  // row must show the same escape notation a person would type/read, matching the literal's
  // original SQL content, not the resolved byte.
  it('re-escapes resolved control-character bytes for display, matching the original SQL literal', () => {
    expect(formatDefaultValueDisplayString("'before\nafter'")).toBe('before\\nafter')
    expect(formatDefaultValueDisplayString("'before\rafter'")).toBe('before\\rafter')
    expect(formatDefaultValueDisplayString("'before\r\nafter'")).toBe('before\\r\\nafter')
    expect(formatDefaultValueDisplayString("'column-one\tcolumn-two'")).toBe('column-one\\tcolumn-two')
  })

  // ddlapi never resolves a `\\` escape into a real single-backslash byte - it always leaves the
  // literal two-character `\\` sequence untouched, prefix and quotes included (even when a
  // `\n`/`\r`/`\t` escape elsewhere in the same literal IS resolved). `unwrapSqlStringLiteral`
  // therefore treats an `E`-prefixed value exactly like a `b'...'` bit literal: since `value[0]`
  // is `E`, not the opening quote, it is left completely untouched - the row shows the literal SQL
  // source text verbatim, the same way it appears in the DDL, rather than a partially-stripped
  // value that would misleadingly look like a resolved one.
  it('leaves an unresolved E-string literal completely verbatim, prefix and quotes included', () => {
    expect(formatDefaultValueDisplayString("E'path\\\\to\\\\file'")).toBe("E'path\\\\to\\\\file'")
  })

  it('leaves unicode content and quote-only literals unaffected', () => {
    expect(formatDefaultValueDisplayString("'café — 日本語 — Ω — 🚀'")).toBe('café — 日本語 — Ω — 🚀')
    expect(formatDefaultValueDisplayString("'it''s fine'")).toBe("it's fine")
    expect(formatDefaultValueDisplayString("'''fixed'''")).toBe("'fixed'")
  })
})

describe('escaping-spec-chars samples: Default row display matches the original SQL literal', () => {
  const samplesRoot = path.join(__dirname, '../../../samples/ddlapi/escaping-spec-chars')

  const expectedDisplayByCase: Record<string, string> = {
    'default-value-backslash': "E'path\\\\to\\\\file'",
    'default-value-cr': 'before\\rafter',
    'default-value-crlf': 'before\\r\\nafter',
    'default-value-embedded-single-quotes': "it's fine",
    'default-value-lf': 'before\\nafter',
    'default-value-quoted': "'fixed'",
    'default-value-tab': 'column-one\\tcolumn-two',
    'default-value-unicode': 'café — 日本語 — Ω — 🚀',
  }

  it.each(Object.keys(expectedDisplayByCase))('case %s', async (caseId) => {
    const sql = readFileSync(path.join(samplesRoot, caseId, 'sample.sql'), 'utf8')
    const realm = await buildFromDdl(sql)
    const column = realm.schemas[0]?.tables?.[0]?.columns?.find((c) => c.name === 'label')
    expect(column?.default).toBeDefined()
    expect(formatDefaultValueForDisplay(column!.default!)).toBe(expectedDisplayByCase[caseId])
  })
})

describe('DdlApiSpecTransformer column row value', () => {
  const transformer = new DdlApiSpecTransformer(createBuildingServiceLogger())

  it('extracts defaultValue from Column.default', async () => {
    const realm = await buildFromDdl(`
      CREATE TABLE public.users (
        enabled boolean NOT NULL DEFAULT true
      );
    `)
    const spec = transformer.transformSourceToTableOrientedSpec(realm, {
      schemaName: 'public',
      name: 'users',
    })

    expect(spec?.columns.items[0]?.defaultValue).toBe('true')
  })

  it('unwraps single quotes from text column defaults', async () => {
    const realm = await buildFromDdl(`
      CREATE TABLE public.t (
        sample_col text DEFAULT 'draft'
      );
    `)
    const spec = transformer.transformSourceToTableOrientedSpec(realm, {
      schemaName: 'public',
      name: 't',
    })

    expect(spec?.columns.items[0]?.defaultValue).toBe('draft')
  })

  it('extracts generatedExpression from GENERATED ALWAYS AS columns', async () => {
    const realm = await buildFromDdl(`
      CREATE TABLE public.employees (
        first_name text NOT NULL,
        last_name text NOT NULL,
        full_name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED
      );
    `)
    const spec = transformer.transformSourceToTableOrientedSpec(realm, {
      schemaName: 'public',
      name: 'employees',
    })

    const fullNameColumn = spec?.columns.items.find(column => column.columnName === 'full_name')
    expect(fullNameColumn?.generatedBy).toBe(DDL_COLUMN_GENERATED_BY.Expression)
    expect(fullNameColumn?.generatedExpression).toBe("(first_name || ' ') || last_name")
    expect(fullNameColumn?.defaultValue).toBeUndefined()
  })

  it('formats parameterized column type labels with a space before parentheses', async () => {
    const realm = await buildFromDdl(`
      CREATE TABLE public.items (
        amount numeric(10, 2) NOT NULL,
        code character varying(30) NOT NULL
      );
    `)
    const spec = transformer.transformSourceToTableOrientedSpec(realm, {
      schemaName: 'public',
      name: 'items',
    })

    const amountColumn = spec?.columns.items.find(column => column.columnName === 'amount')
    const codeColumn = spec?.columns.items.find(column => column.columnName === 'code')

    expect(amountColumn?.columnType.label).toBe('numeric (10, 2)')
    expect(codeColumn?.columnType.label).toBe('varchar (30)')
  })

  it('exposes enumValues on the column row when column type is EnumType', async () => {
    const realm = await buildFromDdl(`
      CREATE TYPE mood AS ENUM ('happy', 'sad', 'neutral');
      CREATE TABLE public.journal (
        feeling mood NOT NULL
      );
    `)
    const spec = transformer.transformSourceToTableOrientedSpec(realm, {
      schemaName: 'public',
      name: 'journal',
    })

    const feelingColumn = spec?.columns.items.find(column => column.columnName === 'feeling')
    expect(feelingColumn?.columnType.kind).toBe(TypeKind.EnumType)
    expect(feelingColumn?.enumValues).toEqual(['happy', 'sad', 'neutral'])
    if (feelingColumn?.columnType.kind === TypeKind.EnumType) {
      expect(feelingColumn.enumValues).toBe(feelingColumn.columnType.values)
    }
  })

  it('formats unsupported precomposed type labels with a space before parentheses', async () => {
    const realm = await buildFromDdl(`
      CREATE TABLE public.flags (
        fixed bit(8) NOT NULL,
        variable bit varying(16) NOT NULL
      );
    `)
    const spec = transformer.transformSourceToTableOrientedSpec(realm, {
      schemaName: 'public',
      name: 'flags',
    })

    const fixedColumn = spec?.columns.items.find(column => column.columnName === 'fixed')
    const variableColumn = spec?.columns.items.find(column => column.columnName === 'variable')

    expect(fixedColumn?.columnType.label).toBe('bit (8)')
    expect(variableColumn?.columnType.label).toBe('bit varying (16)')
  })

  it('reads foreignKeyTarget from the names the foreign key holds', async () => {
    const realm = await buildFromDdl(`
      CREATE TABLE public.parent (
        id bigint PRIMARY KEY
      );

      CREATE TABLE public.t (
        ref_id bigint REFERENCES public.parent (id)
      );
    `)
    const spec = transformer.transformSourceToTableOrientedSpec(realm, {
      schemaName: 'public',
      name: 't',
    })

    const refIdColumn = spec?.columns.items.find(column => column.columnName === 'ref_id')
    expect(refIdColumn?.isForeignKey).toBe(true)
    expect(refIdColumn?.foreignKeyTargets).toEqual([{
      schemaName: 'public',
      tableName: 'parent',
      columnName: 'id',
    }])
  })

  it('reads foreignKeyTarget in a partial realm that lacks the referenced table', async () => {
    const fullRealm = await buildFromDdl(`
      CREATE TABLE public.user_data (
        user_id character varying PRIMARY KEY
      );

      CREATE TABLE public.ai_chat (
        user_id character varying NOT NULL REFERENCES public.user_data (user_id)
      );
    `)
    const aiChat = fullRealm.schemas
      .find(schema => schema.name === 'public')
      ?.tables?.find(table => table.name === 'ai_chat')
    expect(aiChat).toBeDefined()

    const partialRealm = {
      ddlapi: fullRealm.ddlapi,
      schemas: [{ name: 'public', tables: [aiChat!] }],
    }

    const spec = transformer.transformSourceToTableOrientedSpec(partialRealm, {
      schemaName: 'public',
      name: 'ai_chat',
    })

    const userIdColumn = spec?.columns.items.find(column => column.columnName === 'user_id')
    expect(userIdColumn?.isForeignKey).toBe(true)
    expect(userIdColumn?.foreignKeyTargets).toEqual([{
      schemaName: 'public',
      tableName: 'user_data',
      columnName: 'user_id',
    }])
  })

  it('reads the target schema from refTable when another schema has a table with the same name', async () => {
    const fullRealm = await buildFromDdl(`
      CREATE TABLE public.parent (
        id bigint PRIMARY KEY
      );

      CREATE TABLE custom.parent (
        id bigint PRIMARY KEY
      );

      CREATE TABLE custom.t (
        ref_id bigint REFERENCES custom.parent (id)
      );
    `)
    const publicSchema = fullRealm.schemas.find(schema => schema.name === 'public')!
    const customT = fullRealm.schemas
      .find(schema => schema.name === 'custom')
      ?.tables?.find(table => table.name === 't')
    expect(customT).toBeDefined()

    // custom.parent is absent, and the only table named `parent` is in another schema.
    const partialRealm = {
      ddlapi: fullRealm.ddlapi,
      schemas: [publicSchema, { name: 'custom', tables: [customT!] }],
    }

    const spec = transformer.transformSourceToTableOrientedSpec(partialRealm, {
      schemaName: 'custom',
      name: 't',
    })

    const refIdColumn = spec?.columns.items.find(column => column.columnName === 'ref_id')
    expect(refIdColumn?.foreignKeyTargets).toEqual([{
      schemaName: 'custom',
      tableName: 'parent',
      columnName: 'id',
    }])
  })

  it('reads the target schema from refTable across schemas', async () => {
    const realm = await buildFromDdl(`
      CREATE SCHEMA custom;

      CREATE TABLE custom.parent (
        id bigint PRIMARY KEY
      );

      CREATE TABLE public.t (
        ref_id bigint REFERENCES custom.parent (id)
      );
    `)
    const spec = transformer.transformSourceToTableOrientedSpec(realm, {
      schemaName: 'public',
      name: 't',
    })

    const refIdColumn = spec?.columns.items.find(column => column.columnName === 'ref_id')
    expect(refIdColumn?.foreignKeyTargets).toEqual([{
      schemaName: 'custom',
      tableName: 'parent',
      columnName: 'id',
    }])
  })
})

describe('DdlApiSpecTransformer index row value', () => {
  const transformer = new DdlApiSpecTransformer(createBuildingServiceLogger())

  it('extracts description from COMMENT ON INDEX', async () => {
    const realm = await buildFromDdl(`
      CREATE TABLE public.users (
        login character varying(30) NOT NULL
      );

      CREATE INDEX users_login_idx ON public.users (login);

      COMMENT ON INDEX users_login_idx IS 'Stub index comment for ddlapi sample fixture tests.';
    `)
    const spec = transformer.transformSourceToTableOrientedSpec(realm, {
      schemaName: 'public',
      name: 'users',
    })

    expect(spec?.indexes.items[0]?.description).toBe(
      'Stub index comment for ddlapi sample fixture tests.',
    )
  })
})
