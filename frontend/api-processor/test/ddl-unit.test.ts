/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { parseDdlFile } from '../src/apitypes/ddl/ddl.parser'
import { buildDdlDocument } from '../src/apitypes/ddl/ddl.document'
import { DDL_DOCUMENT_TYPE } from '../src/apitypes/ddl/ddl.consts'
import { isOwnPackageDocument } from '../src/components/compare/compare.ddl'
import { BuildConfigFile } from '../src/types'
import { FILE_FORMAT_SQL } from '../src/consts'

const makeSqlBlob = (sql: string): Blob => new Blob([sql], { type: 'text/plain' })

const USERS_SQL = `CREATE TABLE public.users (
  id    bigint       PRIMARY KEY,
  email varchar(255) NOT NULL
);
COMMENT ON TABLE public.users IS 'Registered users';
`

describe('DDL parser', () => {
  test('returns undefined for a non-.sql/.ddl file (lets the next builder claim it)', async () => {
    const result = await parseDdlFile('schema.json', makeSqlBlob('{}'))
    expect(result).toBeUndefined()
  })

  test('parses a .sql file into { realm, originalSql } with verbatim source', async () => {
    const result = await parseDdlFile('shop.sql', makeSqlBlob(USERS_SQL))
    expect(result).toBeDefined()
    expect(result!.type).toBe(DDL_DOCUMENT_TYPE.DDL)
    expect(result!.format).toBe(FILE_FORMAT_SQL)
    expect(result!.data.originalSql).toBe(USERS_SQL)
    expect(result!.data.realm.schemas.length).toBeGreaterThan(0)
    // source keeps the original bytes verbatim
    await expect(result!.source.text()).resolves.toBe(USERS_SQL)
  })

  test('claims the .ddl extension as well', async () => {
    const result = await parseDdlFile('shop.ddl', makeSqlBlob(USERS_SQL))
    expect(result).toBeDefined()
    expect(result!.type).toBe(DDL_DOCUMENT_TYPE.DDL)
    expect(result!.format).toBe('ddl')
  })

  test('rejects on invalid SQL syntax (DdlParseError is not swallowed)', async () => {
    await expect(parseDdlFile('broken.sql', makeSqlBlob('CREATE TABLE ( ;'))).rejects.toBeDefined()
  })

  test('collects non-fatal onError issues (out-of-scope statement) onto data.issues', async () => {
    const sql = `${USERS_SQL}\nALTER TABLE public.users ADD COLUMN nickname varchar(50);\n`
    const result = await parseDdlFile('shop.sql', makeSqlBlob(sql))
    expect(result).toBeDefined()
    // issues ride on ParsedDdlData (not TextFile.errors), so the generic parse→Error path is bypassed
    expect(result!.errors).toBeUndefined()
    expect(result!.data.issues.length).toBeGreaterThan(0)
    expect(result!.data.issues.some((e) => e.kind === 'out-of-scope-statement')).toBe(true)
    // the partial Realm is still built — the table is present despite the skipped ALTER
    expect(result!.data.realm.schemas.some((s) => (s.tables ?? []).length > 0)).toBe(true)
  })
})

describe('DDL document builder', () => {
  const file: BuildConfigFile = { fileId: 'shop.sql', slug: 'shop', apiKind: 'bwc' }

  test('produces a ddl VersionDocument with verbatim source, no operations, and an internal document', async () => {
    const parsed = await parseDdlFile('shop.sql', makeSqlBlob(USERS_SQL))
    const document = await buildDdlDocument(parsed!, file, undefined as never)

    expect(document.type).toBe(DDL_DOCUMENT_TYPE.DDL)
    expect(document.format).toBe(FILE_FORMAT_SQL)
    expect(document.slug).toBe('shop')
    expect(document.operationIds).toEqual([])
    expect(document.apiKind).toBe('bwc')
    // the dumped document is the original SQL verbatim
    await expect(document.source!.text()).resolves.toBe(USERS_SQL)
    // the internal document went through normalize → denormalize → serialize and is non-empty
    expect(document.versionInternalDocument.versionDocumentId).toBe('shop')
    expect(document.versionInternalDocument.serializedVersionDocument).toBeTruthy()
    expect(typeof document.versionInternalDocument.serializedVersionDocument).toBe('string')
  })
})

describe('isOwnPackageDocument (own/reference-package discrimination)', () => {
  const packageId = 'group/shop'

  test('treats an absent packageRef as an own document', () => {
    expect(isOwnPackageDocument(undefined, packageId)).toBe(true)
    expect(isOwnPackageDocument('', packageId)).toBe(true)
  })

  test('treats a packageRef whose packageId segment matches as own (real-backend shape)', () => {
    // the host documents endpoint encodes own docs as `packageId@version[@revision]`
    expect(isOwnPackageDocument(`${packageId}@v1`, packageId)).toBe(true)
    expect(isOwnPackageDocument(`${packageId}@v1@2`, packageId)).toBe(true)
  })

  test('treats a packageRef pointing at a different package as foreign (reference-package doc)', () => {
    expect(isOwnPackageDocument('group/other@v1@2', packageId)).toBe(false)
    expect(isOwnPackageDocument('group/shop-extra@v1', packageId)).toBe(false)
  })
})
