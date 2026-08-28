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
import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import type { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { compareDdlDocuments } from '../src/apitypes/ddl/ddl.changes'
import { DdlComparePairContext } from '../src/types'
import { LocalRegistry, VERSIONS_PATH, loadFileAsStringFromRegistry } from './helpers'
import { BUILD_TYPE } from '../src/consts'

const ctx = (overrides: Partial<DdlComparePairContext> = {}): DdlComparePairContext => ({
  previousVersion: 'v1',
  currentVersion: 'v2',
  previousPackageId: 'pkg',
  currentPackageId: 'pkg',
  notifications: [],
  normalizedSpecFragmentsHashCache: new Map(),
  ...overrides,
})

const build = (sql: string): Promise<Realm> => buildFromDdl(sql)
const ids = (m: Map<string, Diff[]>): string[] => [...m.keys()].sort()

describe('compareDdlDocuments (per-pair DDL diff attribution)', () => {
  test('attributes a column change to the owning table', async () => {
    const prev = await build('CREATE TABLE users (id bigint PRIMARY KEY, email varchar(255) NOT NULL);')
    const curr = await build('CREATE TABLE users (id bigint PRIMARY KEY, email text NOT NULL, age int);')
    const { changesByEntityId } = compareDdlDocuments(prev, curr, ctx())
    expect(ids(changesByEntityId)).toEqual(['public-table-users'])
    expect(changesByEntityId.get('public-table-users')!.length).toBeGreaterThan(0)
  })

  test('represents added and removed tables', async () => {
    const prev = await build('CREATE TABLE a (id bigint PRIMARY KEY); CREATE TABLE b (id bigint PRIMARY KEY);')
    const curr = await build('CREATE TABLE a (id bigint PRIMARY KEY); CREATE TABLE c (id bigint PRIMARY KEY);')
    const { changesByEntityId } = compareDdlDocuments(prev, curr, ctx())
    // b removed, c added; a unchanged → not present
    expect(ids(changesByEntityId)).toEqual(['public-table-b', 'public-table-c'])
  })

  test('attributes index changes to the table (related parts)', async () => {
    const prev = await build('CREATE TABLE users (id bigint PRIMARY KEY, email text);')
    const curr = await build('CREATE TABLE users (id bigint PRIMARY KEY, email text); CREATE INDEX idx_users_email ON users (email);')
    const { changesByEntityId } = compareDdlDocuments(prev, curr, ctx())
    expect(ids(changesByEntityId)).toEqual(['public-table-users'])
  })

  test('fans a shared-type change out to every referencing table (D2)', async () => {
    const prev = await build(`CREATE TYPE status AS ENUM ('on','off');
      CREATE TABLE a (id bigint PRIMARY KEY, s status);
      CREATE TABLE b (id bigint PRIMARY KEY, s status);`)
    const curr = await build(`CREATE TYPE status AS ENUM ('on','off','idle');
      CREATE TABLE a (id bigint PRIMARY KEY, s status);
      CREATE TABLE b (id bigint PRIMARY KEY, s status);`)
    const { changesByEntityId } = compareDdlDocuments(prev, curr, ctx())
    expect(ids(changesByEntityId)).toEqual(['public-table-a', 'public-table-b'])
  })

  test('an orphan-type change (referenced by no table) yields no entry (D2)', async () => {
    const prev = await build('CREATE TYPE status AS ENUM (\'on\',\'off\'); CREATE TABLE a (id bigint PRIMARY KEY);')
    const curr = await build('CREATE TYPE status AS ENUM (\'on\',\'off\',\'idle\'); CREATE TABLE a (id bigint PRIMARY KEY);')
    const { changesByEntityId } = compareDdlDocuments(prev, curr, ctx())
    expect(changesByEntityId.size).toBe(0)
  })

  test('identical realms produce no changes', async () => {
    const same = 'CREATE TABLE users (id bigint PRIMARY KEY);'
    const { changesByEntityId } = compareDdlDocuments(await build(same), await build(same), ctx())
    expect(changesByEntityId.size).toBe(0)
  })

  test('builds an empty counterpart for a one-sided pair (whole .sql added)', async () => {
    const curr = await build('CREATE TABLE users (id bigint PRIMARY KEY); CREATE TABLE orders (id bigint PRIMARY KEY);')
    const { changesByEntityId } = compareDdlDocuments(undefined, curr, ctx())
    expect(ids(changesByEntityId)).toEqual(['public-table-orders', 'public-table-users'])
  })
})

const V1 = `CREATE TABLE users (id bigint PRIMARY KEY, email varchar(255) NOT NULL);
COMMENT ON TABLE users IS 'Users';
CREATE TABLE legacy (id bigint PRIMARY KEY);`
const V2 = `CREATE TABLE users (id bigint PRIMARY KEY, email text NOT NULL, age int);
COMMENT ON TABLE users IS 'Registered users';
CREATE TABLE orders (id bigint PRIMARY KEY, user_id bigint NOT NULL);`

describe('DDL changelog end-to-end (build with previousVersion)', () => {
  const PACKAGE_ID = 'ddl-changelog-e2e'

  test('emits ddl-comparisons sibling files keyed by ddlEntityId with metadata', async () => {
    const registry = LocalRegistry.openPackage(PACKAGE_ID)
    await registry.publishFromContent(
      { 'shop.sql': V1 },
      { packageId: PACKAGE_ID, version: 'v1', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] },
    )
    const result = await registry.publishFromContent(
      { 'shop.sql': V2 },
      { packageId: PACKAGE_ID, version: 'v2', previousVersion: 'v1', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] },
    )

    // in-memory result
    expect(result.ddlComparisons).toHaveLength(1)
    const [comparison] = result.ddlComparisons
    expect(Object.keys(comparison.contractsChangesSummary)).toEqual(['ddl'])
    expect(comparison.contractsChangesSummary.ddl).toMatchObject({ changesSummary: expect.any(Object), numberOfImpactedEntities: expect.any(Object) })
    const changedIds = (comparison.data ?? []).map(c => c.ddlEntityId ?? c.previousDdlEntityId).sort()
    expect(changedIds).toEqual(['public-table-legacy', 'public-table-orders', 'public-table-users'])

    // ddl-comparisons.json index (per-pair data stripped)
    const index = JSON.parse((await loadFileAsStringFromRegistry(VERSIONS_PATH, `${PACKAGE_ID}/v2`, 'ddl-comparisons.json'))!)
    expect(index.comparisons).toHaveLength(1)
    const [indexEntry] = index.comparisons
    expect(indexEntry.contractsChangesSummary).toHaveProperty('ddl')
    expect(indexEntry).not.toHaveProperty('data')
    const { comparisonFileId } = indexEntry

    // ddl-comparisons/<comparisonFileId> per-pair data, wrapper key `entities` (C2)
    type SideData = { ddlEntityId?: string; kind?: string; name?: string; schemaName?: string; description?: string }
    type Entry = { ddlEntityData?: SideData; previousDdlEntityData?: SideData; changes?: unknown[]; comparisonInternalDocumentId?: string }
    const perPair = JSON.parse((await loadFileAsStringFromRegistry(VERSIONS_PATH, `${PACKAGE_ID}/v2/ddl-comparisons`, comparisonFileId))!)
    expect(Array.isArray(perPair.entities)).toBe(true)
    const byId = Object.fromEntries(perPair.entities.map((e: Entry) => [e.ddlEntityData?.ddlEntityId ?? e.previousDdlEntityData?.ddlEntityId, e]))

    // no redundant contractType in a DDL-only file; each side grouped into ddlEntityData/previousDdlEntityData
    const users: Entry = byId['public-table-users']
    expect(users).not.toHaveProperty('contractType')
    // changed table: both sides present, descriptor-complete, with changes
    expect(users.ddlEntityData).toMatchObject({ ddlEntityId: 'public-table-users', kind: 'table', name: 'users', schemaName: 'public', description: 'Registered users' })
    expect(users.previousDdlEntityData).toMatchObject({ ddlEntityId: 'public-table-users', kind: 'table', name: 'users', schemaName: 'public', description: 'Users' })
    expect(users.changes!.length).toBeGreaterThan(0)

    // removed table: previous side only (ddlEntityData omitted)
    const legacy: Entry = byId['public-table-legacy']
    expect(legacy.ddlEntityData).toBeUndefined()
    expect(legacy.previousDdlEntityData).toMatchObject({ ddlEntityId: 'public-table-legacy', name: 'legacy' })

    // added table: current side only (previousDdlEntityData omitted)
    const orders: Entry = byId['public-table-orders']
    expect(orders.previousDdlEntityData).toBeUndefined()
    expect(orders.ddlEntityData).toMatchObject({ ddlEntityId: 'public-table-orders', name: 'orders' })


    // merged Realm lands in the shared comparison-internal documents
    const internalDoc = await loadFileAsStringFromRegistry(VERSIONS_PATH, `${PACKAGE_ID}/v2/comparison-internal-documents`, `${users.comparisonInternalDocumentId}.json`)
    expect(internalDoc).toBeTruthy()

    // operation comparisons carry no operations for a pure-DDL package
    expect(result.comparisons.every(c => c.operationTypes.length === 0)).toBe(true)
  }, 30000)

  test('a table moved between .sql files across versions is a change, not remove+add', async () => {
    const PKG = 'ddl-changelog-move'
    const registry = LocalRegistry.openPackage(PKG)
    // v1: users in a.sql, products in b.sql
    await registry.publishFromContent(
      { 'a.sql': 'CREATE TABLE users (id bigint PRIMARY KEY);', 'b.sql': 'CREATE TABLE products (id bigint PRIMARY KEY);' },
      { packageId: PKG, version: 'v1', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'a.sql' }, { fileId: 'b.sql' }] },
    )
    // v2: users moved to b.sql (and gained a column); products moved to a.sql (unchanged)
    const result = await registry.publishFromContent(
      { 'a.sql': 'CREATE TABLE products (id bigint PRIMARY KEY);', 'b.sql': 'CREATE TABLE users (id bigint PRIMARY KEY, email text);' },
      { packageId: PKG, version: 'v2', previousVersion: 'v1', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'a.sql' }, { fileId: 'b.sql' }] },
    )

    const changes = result.ddlComparisons[0]?.data ?? []
    const users = changes.filter(c => (c.ddlEntityId ?? c.previousDdlEntityId) === 'public-table-users')
    // exactly one entry for users — a change (both ids set), NOT a separate remove + add
    expect(users).toHaveLength(1)
    expect(users[0].ddlEntityId).toBe('public-table-users')
    expect(users[0].previousDdlEntityId).toBe('public-table-users')
    // products moved but did not change → no entry
    expect(changes.some(c => (c.ddlEntityId ?? c.previousDdlEntityId) === 'public-table-products')).toBe(false)
  }, 30000)

  test('a renamed table surfaces as remove + add (D1, no rename detection)', async () => {
    const PKG = 'ddl-changelog-rename'
    const registry = LocalRegistry.openPackage(PKG)
    await registry.publishFromContent(
      { 'shop.sql': 'CREATE TABLE users (id bigint PRIMARY KEY);' },
      { packageId: PKG, version: 'v1', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] },
    )
    const result = await registry.publishFromContent(
      { 'shop.sql': 'CREATE TABLE members (id bigint PRIMARY KEY);' },
      { packageId: PKG, version: 'v2', previousVersion: 'v1', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] },
    )

    const changes = result.ddlComparisons[0]?.data ?? []
    const removed = changes.find(c => c.previousDdlEntityId === 'public-table-users' && !c.ddlEntityId)
    const added = changes.find(c => c.ddlEntityId === 'public-table-members' && !c.previousDdlEntityId)
    expect(removed).toBeDefined()
    expect(added).toBeDefined()
  }, 30000)
})
