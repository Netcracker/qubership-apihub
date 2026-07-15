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

import { describe, expect, test } from '@jest/globals'
import { Editor, LocalRegistry, VERSIONS_PATH, loadFileAsStringFromRegistry } from './helpers'
import { BUILD_TYPE, VERSION_STATUS } from '../src/consts'
import { DdlEntity, DdlEntityIndex, PackageDdlEntity, PackageDdlFile } from '../src/types/package/ddl'

const PACKAGE_ID = 'ddl-build'

function createDdlEditor(registry?: LocalRegistry): Editor {
  const reg = registry ?? LocalRegistry.openPackage(PACKAGE_ID)
  return new Editor(PACKAGE_ID, {
    packageId: PACKAGE_ID,
    version: 'v1',
    status: VERSION_STATUS.RELEASE,
    buildType: BUILD_TYPE.BUILD,
    files: [],
  }, {}, reg)
}

const entityById = (entities: DdlEntityIndex, id: string): DdlEntity | undefined => entities.get(id)

const USERS_ENTITY = {
  ddlEntityId: 'public-table-users',
  kind: 'table',
  name: 'users',
  schemaName: 'public',
  description: 'Registered users', // from COMMENT ON TABLE
  search: { useEntityDataAsSearchText: true },
  documentId: 'shop.sql',
  versionInternalDocumentId: 'shop',
}
const PRODUCTS_ENTITY = {
  ddlEntityId: 'shop-table-products',
  kind: 'table',
  name: 'products',
  schemaName: 'shop',
  description: '', // no COMMENT ON → empty
  search: { useEntityDataAsSearchText: true },
  documentId: 'shop.sql',
  versionInternalDocumentId: 'shop',
}

describe('DDL Build', () => {
  test('builds DDL entities from a multi-table .sql with schema defaulting and comments', async () => {
    const editor = createDdlEditor()
    const result = await editor.run({ files: [{ fileId: 'shop.sql' }] })

    // one document, no operations, two table entities
    expect(result.documents.size).toBe(1)
    expect(result.operations.size).toBe(0)
    expect(result.ddlEntities.size).toBe(2)

    // unqualified table → schema defaults to `public`; qualified table keeps its schema
    expect(entityById(result.ddlEntities, USERS_ENTITY.ddlEntityId)).toMatchObject(USERS_ENTITY)
    expect(entityById(result.ddlEntities, PRODUCTS_ENTITY.ddlEntityId)).toMatchObject(PRODUCTS_ENTITY)
  })

  test('publishes ddl.json (index, payload stripped) + ddl/<id> SQL files', async () => {
    const registry = LocalRegistry.openPackage(PACKAGE_ID)
    const editor = createDdlEditor(registry)

    const result = await editor.run({ files: [{ fileId: 'shop.sql' }] })
    await registry.publishPackage(result, editor.builder.builderContext(editor.config), editor.config)

    // ddl.json — grouped by kind, index rows without `data`
    const index: PackageDdlFile = JSON.parse((await loadFileAsStringFromRegistry(VERSIONS_PATH, `${PACKAGE_ID}/v1`, 'ddl.json'))!)
    expect(index.tables).toHaveLength(2)

    const usersIndex = index.tables.find((t: PackageDdlEntity) => t.ddlEntityId === USERS_ENTITY.ddlEntityId)
    expect(usersIndex).toMatchObject(USERS_ENTITY)
    expect(usersIndex).not.toHaveProperty('data')

    // the qualified, comment-less second table is indexed too (schema kept, description '')
    const productsIndex = index.tables.find((t: PackageDdlEntity) => t.ddlEntityId === PRODUCTS_ENTITY.ddlEntityId)
    expect(productsIndex).toMatchObject(PRODUCTS_ENTITY)
    expect(productsIndex).not.toHaveProperty('data')

    // ddl/<ddlEntityId> — per-entity SQL (no extension), the table's slice from the DDL extractor:
    // the users slice carries its CREATE TABLE, COMMENT ON, and index — and nothing about products
    const usersSql = await loadFileAsStringFromRegistry(VERSIONS_PATH, `${PACKAGE_ID}/v1/ddl`, USERS_ENTITY.ddlEntityId)
    expect(usersSql).toBeTruthy()
    expect(usersSql).toContain('CREATE TABLE users')
    expect(usersSql).toContain('idx_users_email')
    expect(usersSql).not.toContain('products')

    const productsSql = await loadFileAsStringFromRegistry(VERSIONS_PATH, `${PACKAGE_ID}/v1/ddl`, PRODUCTS_ENTITY.ddlEntityId)
    expect(productsSql).toBeTruthy()
    expect(productsSql).toContain('CREATE TABLE shop.products')
    expect(productsSql).not.toContain('users')

    // documents.json back-link: the entity references the document, the document carries no ddlEntityIds
    const documents = JSON.parse((await loadFileAsStringFromRegistry(VERSIONS_PATH, `${PACKAGE_ID}/v1`, 'documents.json'))!)
    const ddlDoc = documents.documents.find((d: { fileId: string }) => d.fileId === 'shop.sql')
    expect(ddlDoc).toMatchObject({ type: 'ddl', format: 'sql', operationIds: [] })
    expect(ddlDoc).not.toHaveProperty('ddlEntityIds')
  }, 30000)
})
