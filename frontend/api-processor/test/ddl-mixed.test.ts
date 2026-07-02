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
import { LocalRegistry, VERSIONS_PATH, loadFileAsStringFromRegistry } from './helpers'
import { BUILD_TYPE, VERSION_STATUS } from '../src/consts'
import { BuildConfigFile } from '../src/types'

const PACKAGE_ID = 'ddl-mixed'

const rest = (paths: string): string => `openapi: 3.0.0
info:
  title: Mixed
  version: 1.0.0
paths:
${paths}`

const REST_V1 = rest(`  /users:
    get:
      responses:
        '200':
          description: ok`)
const REST_V2 = rest(`  /users:
    get:
      responses:
        '200':
          description: ok
  /orders:
    get:
      responses:
        '200':
          description: ok`)

const DDL_V1 = 'CREATE TABLE users (id bigint PRIMARY KEY, email varchar(255) NOT NULL);'
const DDL_V2 = 'CREATE TABLE users (id bigint PRIMARY KEY, email text NOT NULL, age int);'

const publish = (
  fileContents: Record<string, string>,
  version: string,
  files: BuildConfigFile[],
  previousVersion?: string,
): ReturnType<LocalRegistry['publishFromContent']> => {
  const registry = LocalRegistry.openPackage(PACKAGE_ID)
  return registry.publishFromContent(fileContents, {
    packageId: PACKAGE_ID,
    version,
    status: VERSION_STATUS.RELEASE,
    buildType: BUILD_TYPE.BUILD,
    files,
    ...(previousVersion ? { previousVersion } : {}),
  })
}

const BOTH_FILES: BuildConfigFile[] = [{ fileId: 'api.yaml' }, { fileId: 'shop.sql' }]

describe('Mixed REST + DDL content', () => {
  test('a build emits both operations.json and ddl.json with no interference', async () => {
    const result = await publish({ 'api.yaml': REST_V1, 'shop.sql': DDL_V1 }, 'v1', BOTH_FILES)

    expect(result.operations.size).toBe(1)
    expect(result.ddlEntities.size).toBe(1)

    const operations = JSON.parse((await loadFileAsStringFromRegistry(VERSIONS_PATH, `${PACKAGE_ID}/v1`, 'operations.json'))!)
    expect(operations.operations).toHaveLength(1)
    expect(operations.operations[0].operationId).toBe('users-get')

    const ddl = JSON.parse((await loadFileAsStringFromRegistry(VERSIONS_PATH, `${PACKAGE_ID}/v1`, 'ddl.json'))!)
    expect(ddl.tables).toHaveLength(1)
    expect(ddl.tables[0].ddlEntityId).toBe('public-table-users')
  })

  test('a mixed changelog emits both comparisons.json and ddl-comparisons.json with independent summaries', async () => {
    await publish({ 'api.yaml': REST_V1, 'shop.sql': DDL_V1 }, 'v1', BOTH_FILES)
    const result = await publish({ 'api.yaml': REST_V2, 'shop.sql': DDL_V2 }, 'v2', BOTH_FILES, 'v1')

    // both contract types produced comparisons in-memory
    expect(result.comparisons).toHaveLength(1)
    expect(result.ddlComparisons).toHaveLength(1)

    // both sibling files exist
    const operationComparisons = JSON.parse((await loadFileAsStringFromRegistry(VERSIONS_PATH, `${PACKAGE_ID}/v2`, 'comparisons.json'))!)
    expect(operationComparisons.comparisons[0].operationTypes[0].apiType).toBe('rest')

    const ddlComparisons = JSON.parse((await loadFileAsStringFromRegistry(VERSIONS_PATH, `${PACKAGE_ID}/v2`, 'ddl-comparisons.json'))!)
    expect(ddlComparisons.comparisons[0].contractsChangesSummary).toHaveProperty('ddl')
  })

  test('dropping all DDL from one version is handled (tables show as removed)', async () => {
    await publish({ 'api.yaml': REST_V1, 'shop.sql': DDL_V1 }, 'v1', BOTH_FILES)
    // v2 keeps REST, removes the .sql entirely
    const result = await publish({ 'api.yaml': REST_V2 }, 'v2', [{ fileId: 'api.yaml' }], 'v1')

    expect(result.ddlEntities.size).toBe(0) // v2 has no DDL entities
    expect(result.ddlComparisons).toHaveLength(1)
    const removed = (result.ddlComparisons[0].data ?? []).find(c => c.previousDdlEntityId === 'public-table-users' && !c.ddlEntityId)
    expect(removed).toBeDefined()
  })

  test('dropping all REST from one version is handled (DDL comparison still emitted)', async () => {
    await publish({ 'api.yaml': REST_V1, 'shop.sql': DDL_V1 }, 'v1', BOTH_FILES)
    const result = await publish({ 'shop.sql': DDL_V2 }, 'v2', [{ fileId: 'shop.sql' }], 'v1')

    expect(result.ddlComparisons).toHaveLength(1)
    expect(result.ddlEntities.size).toBe(1)
  })
})
