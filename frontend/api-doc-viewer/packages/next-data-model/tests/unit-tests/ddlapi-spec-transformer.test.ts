import { literal, rawExpr, TypeKind } from '@netcracker/qubership-apihub-ddlapi'
import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import { DdlApiSpecTransformer } from '../../src/building-service/ddlapi/shared/ddlapi-spec-transformer'
import { formatDdlExpr } from '../../src/shared/ddlapi/format-ddl-expr'
import { createBuildingServiceLogger } from '../../src/loggers'

describe('formatDdlExpr', () => {
  it('formats literal expressions', () => {
    expect(formatDdlExpr(literal('true'))).toBe('true')
  })

  it('formats raw expressions', () => {
    expect(formatDdlExpr(rawExpr('gen_random_uuid()'))).toBe('gen_random_uuid()')
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
    expect(fullNameColumn?.generatedBy).toBe('expression')
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

  it('resolves foreignKeyTarget when refTable is present in the full realm', async () => {
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
    expect(refIdColumn?.foreignKeyTarget).toEqual({
      schemaName: 'public',
      tableName: 'parent',
      columnName: 'id',
    })
  })

  it('resolves foreignKeyTarget in a single-table partial realm with embedded refTable', async () => {
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
    expect(userIdColumn?.foreignKeyTarget).toEqual({
      schemaName: 'public',
      tableName: 'user_data',
      columnName: 'user_id',
    })
  })

  it('resolves foreignKeyTarget when FK column objects differ from table.columns by reference', async () => {
    const fullRealm = await buildFromDdl(`
      CREATE TABLE public.parent (
        id bigint PRIMARY KEY
      );

      CREATE TABLE public.t (
        ref_id bigint REFERENCES public.parent (id)
      );
    `)
    const tTable = fullRealm.schemas
      .find(schema => schema.name === 'public')
      ?.tables?.find(table => table.name === 't')
    expect(tTable?.foreignKeys?.[0]).toBeDefined()

    const foreignKey = tTable!.foreignKeys![0]!
    const duplicatedForeignKey = {
      ...foreignKey,
      columns: foreignKey.columns?.map(column => ({ ...column })),
    }
    const tableWithDuplicatedForeignKeyColumns = {
      ...tTable!,
      foreignKeys: [duplicatedForeignKey],
    }

    const partialRealm = {
      ddlapi: fullRealm.ddlapi,
      schemas: [{ name: 'public', tables: [tableWithDuplicatedForeignKeyColumns] }],
    }

    const spec = transformer.transformSourceToTableOrientedSpec(partialRealm, {
      schemaName: 'public',
      name: 't',
    })

    const refIdColumn = spec?.columns.items.find(column => column.columnName === 'ref_id')
    expect(refIdColumn?.isForeignKey).toBe(true)
    expect(refIdColumn?.foreignKeyTarget).toEqual({
      schemaName: 'public',
      tableName: 'parent',
      columnName: 'id',
    })
  })

  it('resolves foreignKeyTarget schema via refTable reference across schemas', async () => {
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
    expect(refIdColumn?.foreignKeyTarget).toEqual({
      schemaName: 'custom',
      tableName: 'parent',
      columnName: 'id',
    })
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
