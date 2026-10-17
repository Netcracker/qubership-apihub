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

import {
  API_AUDIENCE_INTERNAL,
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  APIHUB_API_COMPATIBILITY_KIND_NO_BWC,
  BuildConfigFile,
  BuildResult,
} from '../src'
import {
  contentEditor,
  Editor,
  expectNotEmpty,
  LocalRegistry,
  operationOf,
  warningNotificationsOf,
} from './helpers'

import { describe, expect, test } from '@jest/globals'
import { calculateRestOperationTitle } from '../src/utils'

const bugsPackage = LocalRegistry.openPackage('bugs')
const swaggerPackage = LocalRegistry.openPackage('bugs/swagger-schema-warning')
const migrationBug = LocalRegistry.openPackage('bugs/hidden-files-without-extension')

describe('Operation Bugs', () => {
  // the same two operations behind a relative and an absolute server url; the first also states no-BWC in `info`
  const petstore = (server: string, summary: string, extra: string): string => `
openapi: 3.0.3
info:
  title: Petstore
  version: 1.0.0${extra}
servers:
  - url: ${server}
paths:
  /pet/findByStatus:
    get:
      summary: ${summary}
      responses:
        '200':
          description: ok
  /pet/{petId}:
    delete:
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: ok
`
  const RELATIVE_SERVER_PETSTORE = petstore('v1', 'Finds Pets by status TEST', '\n  x-api-kind: no-BWC')
  const ABSOLUTE_SERVER_PETSTORE = petstore('https://petstore3.swagger.io/v1', 'Finds Pets by status', '')
  const PETSTORE_OPERATION_IDS = ['v1-pet-_petId_-delete', 'v1-pet-findByStatus-get']

  const buildPetstore = (
    packageId: string,
    files: BuildConfigFile[],
    contents: Record<string, string>,
  ): Promise<BuildResult> =>
    contentEditor({ packageId, version: 'v1' }, contents).run({ files })

  test('absolute server url: paths should start with v1', async () => {
    const result = await buildPetstore('bugs/absolute-server-url', [{ fileId: 'petstore.yaml' }], {
      'petstore.yaml': ABSOLUTE_SERVER_PETSTORE,
    })

    expect([...result.operations.values()].map(({ operationId }) => operationId).sort())
      .toEqual(PETSTORE_OPERATION_IDS)
  })

  test('relative server url: paths should start with v1', async () => {
    const result = await buildPetstore('bugs/relative-server-url', [{ fileId: 'petstore.yaml' }], {
      'petstore.yaml': RELATIVE_SERVER_PETSTORE,
    })

    expect([...result.operations.values()].map(({ operationId }) => operationId).sort())
      .toEqual(PETSTORE_OPERATION_IDS)
  })

  test('x-api-kind \'no-BWC\' should be handled correctly in operations', async () => {
    const result = await buildPetstore('bugs/api-kind-no-bwc', [{ fileId: 'petstore.yaml' }], {
      'petstore.yaml': RELATIVE_SERVER_PETSTORE,
    })

    expect([...result.operations.values()].map(({ apiKind }) => apiKind))
      .toEqual([APIHUB_API_COMPATIBILITY_KIND_NO_BWC, APIHUB_API_COMPATIBILITY_KIND_NO_BWC])
  })

  // the unpublished file sorts first, so it would win the shared operation ids if it were built at all
  test('an unpublished file should add no operations, even when its slug sorts first', async () => {
    const result = await buildPetstore(
      'bugs/unpublished-file',
      [{ fileId: 'published.yaml', publish: true }, { fileId: 'decoy.yaml', publish: false }],
      { 'published.yaml': RELATIVE_SERVER_PETSTORE, 'decoy.yaml': ABSOLUTE_SERVER_PETSTORE },
    )

    expect([...result.operations.values()].map(({ operationId }) => operationId).sort())
      .toEqual(PETSTORE_OPERATION_IDS)
    expect(operationOf(result, 'v1-pet-findByStatus-get').title).toBe('Finds Pets by status TEST')
  })

  test('invalid swagger file should be handled', async () => {
    const editor = await Editor.openProject('bugs/swagger-schema-warning', swaggerPackage)
    const result = await editor.run()

    // AJV metaschema complaints are Warnings now: the document parses and its operations build
    expect(warningNotificationsOf(result.notifications)).toHaveLength(1)
  })

  test('type error must not appear during build', async () => {
    const editor = await Editor.openProject('bugs/type-error-during-build', bugsPackage)

    await bugsPackage.publish('bugs/type-error-during-build', {
      packageId: 'config_bug',
      version: '1.0',
      refs: [],
      files: [{
        fileId: 'before.yaml',
        publish: true,
      }],
    })

    const result = await editor.run({
      packageId: 'config_bug',
      version: '3.0',
      previousVersion: '1.0',
      refs: [],
      files: [{
        fileId: 'after.yaml',
        publish: true,
      }],
    })

    expect(result.notifications.length).toEqual(0)
  })

  test('should have search text for REST operations', async () => {
    const editor = await Editor.openProject('bugs/search-scope', bugsPackage)

    await bugsPackage.publish('bugs/search-scope', {
      packageId: 'search_scope',
      version: '1.0',
      refs: [],
      files: [{
        fileId: 'before.yaml',
        publish: true,
      }],
    })

    const result = await editor.run({
      packageId: 'search_scope',
      version: '2.0',
      previousVersion: '1.0',
      files: [{
        fileId: 'after.yaml',
        publish: true,
      }],
    })
    const operation = operationOf(result, 'path1-get')
    expect(operation.search).toEqual({ useOperationDataAsSearchText: true })
  })

  test('the final document should not have unused components', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [{ fileId: 'delete-unused-components.yaml', publish: true }],
    })
    const { data } = operationOf(result, 'path1-get')

    expect(data?.components).toEqual({
      parameters: {
        usedParameter1: {
          name: 'usedParameter1',
          in: 'query',
        },
        usedParameter2: {
          name: 'usedParameter2',
          in: 'query',
        },
      },
      requestBodies: {
        usedRequest: {
          description: 'usedRequest',
        },
      },
      headers: {
        usedHeader: {
          description: 'usedHeader',
        },
      },
      schemas: {
        usedSchema: {
          description: 'usedSchema',
        },
      },
      examples: {
        usedExample: {
          description: 'usedExample',
        },
      },
      responses: {
        usedResponse: {
          description: 'usedResponse',
        },
      },
    })
  })

  test('models should contain only used schemas', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [{ fileId: 'delete-unused-components.yaml', publish: true }],
    })
    const { models } = operationOf(result, 'path1-get')
    expect(models).toHaveProperty('usedSchema')
    expect(models).not.toHaveProperty('unusedSchema')
    expect(models).not.toHaveProperty('usedResponse')
    expect(models).not.toHaveProperty('unusedResponse')
    expect(models).not.toHaveProperty('usedParameter')
    expect(models).not.toHaveProperty('unusedParameter')
    expect(models).not.toHaveProperty('usedExample')
    expect(models).not.toHaveProperty('unusedExample')
    expect(models).not.toHaveProperty('usedRequest')
    expect(models).not.toHaveProperty('unusedRequest')
    expect(models).not.toHaveProperty('usedHeader')
    expect(models).not.toHaveProperty('unusedHeader')
  })

  test('the final document should have components with the same name', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [{ fileId: 'schemas-with-the-same-name.yaml', publish: true }],
    })
    const { data } = operationOf(result, 'path1-get')

    expect(data?.components).toEqual({
      requestBodies: {
        ServicesVersionPayload: {
          content: {
            'application/json': {
              schema: {
                '$ref': '#/components/schemas/ServicesVersionPayload',
              },
            },
          },
          description: 'ServicesVersionPayload',
        },
      },
      schemas: {
        ServicesVersionPayload: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
          },
        },
      },
    })
  })

  test('when ref to a nested schema, the components must have a parent schema', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [{ fileId: 'ref-to-nested-schema.yaml', publish: true }],
    })
    const { data } = operationOf(result, 'path1-get')

    expect(data).toHaveProperty(['components', 'schemas', 'firstSchema'])
  })

  test('components must have a schema', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [{ fileId: 'ref-in-invalid-spec.yaml', publish: true }],
    })
    const { data } = operationOf(result, 'path1-get')

    expect(data).toHaveProperty(['components', 'schemas', 'nestedSchema'])
  })

  test('document and the operation must have an internal type ', async () => {
    const editor = await Editor.openProject('bugs/search-scope', bugsPackage)

    const result = await editor.run({
      packageId: 'api_audience',
      version: '1.0',
      files: [{
        fileId: 'before.yaml',
        publish: true,
      }],
    })
    expect(operationOf(result, 'path1-get').apiAudience).toEqual(API_AUDIENCE_INTERNAL)
  }, 100000)

  test('hidden files without extension should have required fields', async () => {
    const editor = await Editor.openProject('bugs/hidden-files-without-extension', migrationBug)
    const result = await editor.run()

    expectNotEmpty(result.documents)
    for (const [, document] of result.documents) {
      expect(!!document.type).toBeTruthy()
      expect(!!document.title).toBeTruthy()
      expect(!!document.slug).toBeTruthy()
    }
  })

  // `x-api-kind` counts in `info` only: at the document root it is ignored
  const apiKindSample = (rootExtra: object, infoExtra: object): string => JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'Sample', version: '1.0.0', ...infoExtra },
    paths: { '/pets': { get: { responses: { '200': { description: 'ok' } } } } },
    ...rootExtra,
  })

  test('apiKind of operations should be BWC (wrong position of x-api-kind)', async () => {
    const result = await contentEditor(
      { packageId: 'bugs/api-kind-at-root', version: 'v1' },
      { 'openapi.json': apiKindSample({ 'x-api-kind': 'no-BWC' }, {}) },
    ).run()

    expect([...result.operations.values()].map(({ apiKind }) => apiKind)).toEqual([APIHUB_API_COMPATIBILITY_KIND_BWC])
  })

  test('apiKind of operations should be no-BWC (defined in info)', async () => {
    const result = await contentEditor(
      { packageId: 'bugs/api-kind-in-info', version: 'v1' },
      { 'openapi.json': apiKindSample({}, { 'x-api-kind': 'no-BWC' }) },
    ).run()

    expect([...result.operations.values()].map(({ apiKind }) => apiKind))
      .toEqual([APIHUB_API_COMPATIBILITY_KIND_NO_BWC])
  })

  test('should correctly calculate operationId for servers with incorrect URL', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)

    const result = await editor.run({
      version: 'v1',
      files: [
        { fileId: 'should-correctly-calculate-operation-id-for-servers-with-incorrect-url.yaml', publish: true },
      ],
    })

    const operationKeys = Array.from(result.operations.values(), ({ operationId }) => operationId)
    expect(operationKeys[0]).toEqual('paths1-get')
  })

  test('should date time field parsing without error', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [{fileId: 'date-time-field-parsing-error.yaml', publish: true}],
    })
    const { data } = operationOf(result, 'test-post')
    expect(data).toHaveProperty(['paths', '/test', 'post', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'testConnectionDate', 'example'], '2022-03-10T16:15:50Z')
  })

  test('should format rest operationId title without extra characters', async () => {
    type TestCase = [string, string, string, string]

    const testData: TestCase[] = [
      ['', 'get', '/path1', 'Path1 Get'],
      ['', 'get', '/items/{itemId}', 'Items ItemId Get'],
      ['api/v1', 'get', '/path1', 'Api V1 Path1 Get'],
      ['api/v1', 'get', '/items/{itemId}', 'Api V1 Items ItemId Get'],
      ['api/v1/rest', 'get', '/items/{itemId}', 'Api V1 Rest Items ItemId Get'],
    ]
    testData.forEach(([basePath, key, path, expectedTitle]) =>{
      const title = calculateRestOperationTitle(basePath, key, path)
      expect(title).toEqual(expectedTitle)
    })

    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [{ fileId: 'title-rest-operation-id-format.yaml', publish: true }],
    })
    const restOperationTitle = operationOf(result, 'api-v1-items-_item_-get').title
    expect(restOperationTitle).toEqual('Api V1 Items Item Get')
  })
})
