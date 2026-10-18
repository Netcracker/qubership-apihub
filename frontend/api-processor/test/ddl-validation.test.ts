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
import { documentOf, Editor, errorNotificationsOf, notificationsInCategory, LocalRegistry, notificationOf } from './helpers'
import { BUILD_TYPE, MESSAGE_CATEGORY, MESSAGE_SEVERITY, VERSION_STATUS } from '../src/consts'
import { BuildConfigFile, BuildResult } from '../src/types'

const PACKAGE_ID = 'ddl-validation'

const build = (sql: string): Promise<BuildResult> => {
  const registry = LocalRegistry.openPackage(PACKAGE_ID)
  return registry.publishFromContent(
    { 'shop.sql': sql },
    // draft: these tests are about what gets reported, not about whether a release may publish
    { packageId: PACKAGE_ID, version: 'v1', status: VERSION_STATUS.DRAFT, buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] },
  )
}

// the slugify-collision fixtures (duplicate.sql, dup-users.sql) live with the build fixtures under
// test/projects/ddl-build; drive them through the Editor so they stay put and shared
const buildFixtureFiles = (files: BuildConfigFile[]): Promise<BuildResult> => {
  const fixturePackageId = 'ddl-build'
  const editor = new Editor(fixturePackageId, {
    packageId: fixturePackageId,
    version: 'v1',
    status: VERSION_STATUS.DRAFT,
    buildType: BUILD_TYPE.BUILD,
    files: [],
  }, {}, LocalRegistry.openPackage(fixturePackageId))
  return editor.run({ files })
}

describe('DDL validation', () => {
  test('invalid SQL is reported, not fatal — the file publishes with its bytes', async () => {
    const result = await build('CREATE TABLE ( ;')

    const document = documentOf(result, 'shop.sql')
    expect(document.source).toBeDefined()
    expect(result.ddlEntities.size).toBe(0)

    const parseFailure = notificationOf(result.notifications, MESSAGE_CATEGORY.ParseFile)
    expect(parseFailure.severity).toBe(MESSAGE_SEVERITY.Error)
    expect(parseFailure.documentId).toBe(document.slug)
  })

  test('a within-file duplicate object is an Error, reported not thrown', async () => {
    // two CREATE TABLE users in one file → buildFromDdl emits duplicate-object
    const result = await build('CREATE TABLE users (id bigint PRIMARY KEY);\nCREATE TABLE users (id bigint PRIMARY KEY);')

    // exactly one notification: the same defect must not surface under a second category as well
    expect(result.notifications).toHaveLength(1)
    expect(result.notifications[0]).toMatchObject({
      category: MESSAGE_CATEGORY.DdlDuplicateObject,
      severity: MESSAGE_SEVERITY.Error,
      documentId: 'shop',
    })
  })

  test('out-of-scope statements are reported one per statement and do not abort', async () => {
    const result = await build(
      'CREATE TABLE users (id bigint PRIMARY KEY);\nALTER TABLE users ADD COLUMN x int;\nDROP TABLE old;',
    )
    // one notification per out-of-scope statement (ALTER + DROP) — D7. Error, because the built Realm is
    // incomplete and a release must not ship an incomplete DDL contract.
    const errors = errorNotificationsOf(result.notifications)
    expect(errors.length).toBeGreaterThanOrEqual(2)
    expect(result.notifications.every(n => n.documentId === 'shop')).toBe(true)
    expect(result.notifications.every(n => n.category === MESSAGE_CATEGORY.DdlParseIssue)).toBe(true)
    // reported one by one rather than aborting, and the table it did build is still published
    expect(result.ddlEntities.size).toBe(1)
  })

  test('an unresolved reference is reported; the partial entity is still built (no incomplete flag)', async () => {
    const result = await build('CREATE TABLE orders (id bigint PRIMARY KEY, uid bigint REFERENCES missing(id));')
    const errors = errorNotificationsOf(result.notifications)
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(result.ddlEntities.size).toBe(1)
    const [entity] = result.ddlEntities.values()
    expect(entity).not.toHaveProperty('incomplete')
    expect(entity).not.toHaveProperty('partial')
  })

  test('a clean DDL build produces no notifications', async () => {
    const result = await build('CREATE TABLE users (id bigint PRIMARY KEY, email text NOT NULL);')
    expect(result.notifications).toHaveLength(0)
  })

  test('reports two tables that collide on ddlEntityId within the same document (D10)', async () => {
    // `"user name"` and `"user-name"` are distinct tables to Postgres but both slugify to the same id
    // `public-table-user-name` (slugify preserves case but maps space → hyphen)
    const result = await buildFixtureFiles([{ fileId: 'duplicate.sql' }])

    expect(result.notifications.map(({ category }) => category)).toEqual([MESSAGE_CATEGORY.DdlEntityBuild])
    expect(result.notifications[0].severity).toBe(MESSAGE_SEVERITY.Error)
    expect(result.notifications[0].message).toMatch(/Duplicate DDL entity ID/)
  })

  test('reports a ddlEntityId collision across documents against both (Task 6)', async () => {
    // both files define public.users → same id from different documents
    const result = await buildFixtureFiles([{ fileId: 'shop.sql' }, { fileId: 'dup-users.sql' }])

    const duplicates = notificationsInCategory(result.notifications, MESSAGE_CATEGORY.DdlDuplicateEntity)
    expect(duplicates).toHaveLength(2)
    expect(duplicates.map(({ documentId }) => documentId).sort()).toEqual(['dup-users', 'shop'])
  })
})
