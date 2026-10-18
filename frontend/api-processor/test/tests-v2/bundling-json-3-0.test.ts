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

import { Editor, LocalRegistry, PackageVersionCache } from '../helpers'

describe.skip('Bundling - JSON files OpenAPI 3.0', () => {
  let registry: LocalRegistry
  let editor: Editor
  let er2: PackageVersionCache | undefined
  const packageId = 'bundling'

  beforeEach(async () => {
    registry = await LocalRegistry.openPackage(packageId)
    editor = await Editor.openProject(packageId)
    er2 = await registry.getVersion(packageId, 'json-3-0/B-BN-J30-P-01')
  })

  test('B-BN-J30-P-01 Success publishing', async () => {
    const version = 'json-3-0/B-BN-J30-P-01'
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}]})

    expect(ar.config).toMatchObject(er2!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er2!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er2!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er2!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J30-P-02 Publishing with label', async () => {
    const version = 'json-3-0/B-BN-J30-P-02'
    const er1 = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, metadata: {'labels': ['ipg9']}, files: [{fileId: 'openapi.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er2!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er2!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er2!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J30-N-01 Spec without \'info\' field', async () => {
    const version = 'json-3-0/B-BN-J30-N-01'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('openapi.json', (data) => {
      delete data.info
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er1!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er2!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er2!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J30-N-02 Broken spec', async () => {
    const version = 'json-3-0/B-BN-J30-N-02'
    // const er = await registry.getVersion(packageId, version)
    await expect(
      async () => await editor.run({ files: [{ fileId: 'openapi-missing-bracket.json', publish: true, labels: [] }] }),
    ).rejects.toThrowError('Cannot parse file openapi-missing-bracket.json.')
  })

  test('B-BN-J30-P-03 Spec with external reference', async () => {
    const version = 'json-3-0/B-BN-J30-P-03'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('openapi.json', (data) => {
      delete data.components.schemas.Tag
      data.components.schemas.Pet.properties.tags.items.$ref = 'Tag.json'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}, {fileId: 'Tag.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er1!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er2!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er2!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J30-N-03 The referenced file is missing in the config', async () => {
    const version = 'json-3-0/B-BN-J30-N-03'
    const er = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('openapi.json', (data) => {
      delete data.components.schemas.Tag
      data.components.schemas.Pet.properties.tags.items.$ref = 'Tag.json'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}]})

    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.notifications).toMatchObject(er!.notifications)
    expect(ar.documents.get('openapi.json')).toMatchObject(er!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
  })

  test('B-BN-J30-P-04 Spec with external reference with relative path', async () => {
    const version = 'json-3-0/B-BN-J30-P-04'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('openapi.json', (data) => {
      delete data.components.schemas.Tag
      delete data.components.schemas.Category
      data.components.schemas.Pet.properties.tags.items.$ref = 'TagCategory.json#/Tag'
      data.components.schemas.Pet.properties.category.$ref = 'TagCategory.json#/Category'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}, {fileId: 'TagCategory.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er1!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er2!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er2!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J30-P-05 Spec with external reference to a file located in a folder', async () => {
    const version = 'json-3-0/B-BN-J30-P-05'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('openapi.json', (data) => {
      delete data.components.schemas.Tag
      data.components.schemas.Pet.properties.tags.items.$ref = 'BN-06.1/Tag.json'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}, {fileId: 'BN-06.1/Tag.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er1!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er2!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er2!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J30-P-06 Spec with external reference to an intermediate file', async () => {
    const version = 'json-3-0/B-BN-J30-P-06'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('openapi.json', (data) => {
      delete data.components.schemas.Tag
      data.components.schemas.Pet.properties.tags.items.$ref = 'IntermediateFile.json'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}, {fileId: 'IntermediateFile.json'}, {fileId: 'Tag.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er1!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er1!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er1!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-BN-J30-P-10 Spec with overriding the value for the reference', async () => {
    const version = 'json-3-0/B-BN-J30-P-10'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('openapi.json', (data) => {
      data.paths['/pet'].put.requestBody.content['application/json'].schema.description = 'Override description'
      data.components.schemas.Pet.description = 'Pet description'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er1!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er1!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er1!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J30-P-11 Spec with a recursive link', async () => {
    const version = 'json-3-0/B-BN-J30-P-11'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('openapi.json', (data) => {
      data.components.schemas.Pet.properties.myself = {$ref: '#/components/schemas/Pet'}
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er1!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er1!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er1!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J30-P-12 Spec with a recursive link and overriding description', async () => {
    const version = 'json-3-0/B-BN-J30-P-12'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('openapi.json', (data) => {
      data.components.schemas.Pet.properties.tags.items = {
        $ref: '#/components/schemas/Pet',
        description: 'Test description',
      }
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er1!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er1!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er1!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J30-N-04 Spec with a link to a schema that doesn\'t exist', async () => {
    const version = 'json-3-0/B-BN-J30-N-04'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('openapi.json', (data) => {
      delete data.components.schemas.Category
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er1!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er1!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er1!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er1!.notifications)
  })

  test('B-BN-J30-P-13 Spec with custom parameters', async () => {
    const version = 'json-3-0/B-BN-J30-P-13'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('openapi.json', (data) => {
      data.paths['/pet'].put['x-custom-property'] = {
        'deprecated-from': 2022.3,
        'stop-support': 2022.4,
        'remove-from': 2023.1,
        'deprecation-reason': 'Sales order entity in response V1 API contains full product offering structure. The response is bigger than required for the projects and leads to unnessasary transfer of data over the network. New V2 API optimize response size: Response contains only id, originalName, name, href for product offering.\n',
      }
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'openapi.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi.json')).toMatchObject(er1!.documents.get('openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er1!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er1!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J30-N-05 Spec with two identical operations', async () => {
    const version = 'json-3-0/B-BN-J30-N-05'
    const er1 = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, files: [{fileId: 'openapi-doubled-operation.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('openapi-doubled-operation.json')).toMatchObject(er1!.documents.get('openapi-doubled-operation')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er2!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er2!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J30-P-14 Spec with a globally defined server and a server for a specific operation', async () => {
    const version = 'json-3-0/B-BN-J30-P-14'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('BN-01_openapi.json', (data) => {
      data.paths['/pet'].put.servers = [
        {
          url: 'https://petstore3.swagger.io/api/v4',
        },
      ]
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'BN-01_openapi.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('BN-01_openapi.json')).toMatchObject(er1!.documents.get('bn-01_openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er1!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v4-pet-put')).toMatchObject(er1!.operations.get('api-v4-pet-put')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-BN-J30-P-15 Spec with globally defined security object, but no security object defined for operations', async () => {
    const version = 'json-3-0/B-BN-J30-P-15'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('BN-01_openapi.json', (data) => {
      data.security = [
        {
          'api_key': [],
        },
      ]
      delete data.paths['/pet'].put.security
      delete data.paths['/pet/{petId}'].get.security
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'BN-01_openapi.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('BN-01_openapi.json')).toMatchObject(er1!.documents.get('bn-01_openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er1!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er1!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-BN-J30-P-16 Spec with globally defined security object and security object defined for operation', async () => {
    const version = 'json-3-0/B-BN-J30-P-16'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('BN-17.1_openapi.json', (data) => {
      data.paths['/pet'].put.security = [
        {
          'petstore_auth': [
            'write:pets',
            'read:pets',
          ],
        },
      ]
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'BN-17.1_openapi.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('BN-17.1_openapi.json')).toMatchObject(er1!.documents.get('bn-17-1_openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er1!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er1!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-BN-J30-P-17 Spec with globally defined custom tag', async () => {
    const version = 'json-3-0/B-BN-J30-P-17'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('BN-01_openapi.json', (data) => {
      data['x-custom-tag'] = {
        'parameter': 123,
      }
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'BN-01_openapi.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('BN-01_openapi.json')).toMatchObject(er1!.documents.get('bn-01_openapi')!)
    // expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er1!.operations.get('api-v3-pet-petid-get')!)
    // expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er1!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
    // expect(ar.notifications.length).toEqual(1)
  })
})
