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

import { API_AUDIENCE_INTERNAL, API_KIND } from '../src'
import { Editor, LocalRegistry } from './helpers'

const bugsPackage = LocalRegistry.openPackage('bugs')
const swaggerPackage = LocalRegistry.openPackage('basic_swagger')
const migrationBug = LocalRegistry.openPackage('migration_bug')

describe('Operation Bugs', () => {
  test.skip('parsing issues should be displayed in notifications', async () => {
    // todo find proper test data
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run()

    expect(result.notifications.filter(({ severity }) => severity === 0).length).toEqual(9)
  })

  test('absolute server url: paths should start with v1', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [
        { fileId: 'PetStore-v2 (2023.2).yaml', publish: true },
      ],
    })

    expect([...result.operations.keys()].every(id => id.startsWith('v1'))).toBeTruthy()
  })

  test('relative server url: paths should start with v1', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [
        { fileId: 'PetStore-v2 (2023.1).yaml', publish: true },
      ],
    })

    expect([...result.operations.keys()].every(id => id.startsWith('v1'))).toBeTruthy()
  })

  test('x-api-kind \'no-BWC\' should be handled correctly in operations', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [
        { fileId: 'PetStore-v2 (2023.1).yaml', publish: true },
      ],
    })

    expect([...result.operations.values()].every(operation => operation.apiKind === API_KIND.NO_BWC)).toBeTruthy()
  })

  test('duplicated operations in document and component should publish only document operations', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [
        { fileId: 'PetStore-v2 (2023.1).yaml', publish: true },
        { fileId: 'PetStore-v2 (2023.2).yaml', publish: false },
      ],
    })

    const operationV1 = result.operations.get('v1-pet-findbystatus-get')
    expect(operationV1?.title).toMatch(/(\s*)TEST(\s*)/g)
  })

  test('invalid swagger file should be handled', async () => {
    const editor = await Editor.openProject('basic_swagger', swaggerPackage)
    const result = await editor.run()

    expect(result.notifications.filter(({ severity }) => severity === 0).length).toEqual(1)
  })

  test('type error must not appear during build', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)

    await bugsPackage.publish('bugs', {
      packageId: 'config_bug',
      version: '1.0',
      refs: [],
      files: [{
        fileId: 'petstore(publish_1).yaml',
        publish: true,
      },
      ],
    })

    await bugsPackage.publish('bugs', {
      packageId: 'config_bug',
      version: '3.0',
      refs: [],
      files: [{
        fileId: 'petstore(publish_2).yaml',
        publish: true,
      },
      ],
    })

    const result = await editor.run({
      packageId: 'config_bug',
      version: '3.0',
      previousVersion: '1.0',
    })

    expect(result.notifications.length).toEqual(0)
  })

  test('search scope should contain information from both properties', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)

    await bugsPackage.publish('bugs', {
      packageId: 'search_scope',
      version: '1.0',
      refs: [],
      files: [{
        fileId: 'search-scope-v1.yaml',
        publish: true,
      },
      ],
    })

    const result = await editor.run({
      packageId: 'search_scope',
      version: '2.0',
      previousVersion: '1.0',
      files: [{
        fileId: 'search-scope-v2.yaml',
        publish: true,
      }],
    })
    const scope = result.operations.get('path1-get')?.searchScopes['response']
    expect(scope?.has('prop1 description')).toBeTruthy()
    expect(scope?.has('prop2 description')).toBeTruthy()
  })

  test('the final document should not have unused components', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [{ fileId: 'delete-unused-components.yaml', publish: true }],
    })
    const data = result.operations.get('path1-get')?.data

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
    const models = result.operations.get('path1-get')?.models
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
    const data = result.operations.get('path1-get')?.data

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
    const data = result.operations.get('path1-get')?.data

    expect(data).toHaveProperty(['components', 'schemas', 'firstSchema'])
  })

  test('components must have a schema', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      files: [{ fileId: 'ref-in-invalid-spec.yaml', publish: true }],
    })
    const data = result.operations.get('path1-get')?.data

    expect(data).toHaveProperty(['components', 'schemas', 'nestedSchema'])
  })

  test('document and the operation must have an internal type ', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)

    const result = await editor.run({
      packageId: 'api_audience',
      version: '1.0',
      files: [{
        fileId: 'search-scope-v1.yaml',
        publish: true,
      }],
    })
    expect(result.operations.get('path1-get')?.apiAudience).toEqual(API_AUDIENCE_INTERNAL)
  }, 100000)

  test('hidden files without extension should have required fields', async () => {
    const editor = await Editor.openProject('migration_bug', migrationBug)
    const result = await editor.run()

    for (const [, document] of result.documents) {
      expect(!!document.type).toBeTruthy()
      expect(!!document.title).toBeTruthy()
      expect(!!document.slug).toBeTruthy()
    }
  })

  test.skip('graphql introspection should have operations', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      version: 'gql-bug',
      files: [
        // todo find proper test data
        { fileId: 'Graphql specification.json', publish: true },
      ],
    })

    expect(editor.builder.operationList.length).toBeTruthy()
  })

  test.skip('graphql introspection with .gql extension should have operations', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      version: 'gql-bug',
      files: [
        // todo find proper test data
        { fileId: 'GQL_introspection (gql).gql', publish: true },
      ],
    })

    expect(editor.builder.operationList.length).toBeTruthy()
  })

  test.skip('graphql introspection with __schema on the root level should have operations', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      version: 'gql-bug',
      files: [
        // todo find proper test data
        { fileId: 'GQL intro.gql', publish: true },
      ],
    })

    expect(editor.builder.operationList.length).toBeTruthy()
  })

  test('apiKind of operations should be BWC (wrong position of x-api-kind)', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      version: 'apiKind-bug',
      files: [
        { fileId: 'openapi_sample_3-0.json', publish: true },
      ],
    })

    expect(editor.builder.operationList.every(operation => operation.apiKind === API_KIND.BWC)).toBeTruthy()
  })

  test('apiKind of operations should be no-BWC (defined in info)', async () => {
    const editor = await Editor.openProject('bugs', bugsPackage)
    const result = await editor.run({
      version: 'apiKind-bug',
      files: [
        { fileId: 'openapi_sample_3-0-no-bwc.json', publish: true },
      ],
    })

    expect(editor.builder.operationList.every(operation => operation.apiKind === API_KIND.NO_BWC)).toBeTruthy()
  })
})
