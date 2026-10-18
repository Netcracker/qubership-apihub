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

import { Editor, PackageVersionCache, LocalRegistry } from '../helpers'

describe.skip('Bundling - JSON files Swagger 2.0', () => {
  const packageId: string = 'bundling'
  let registry: LocalRegistry
  let editor: Editor
  let er2: PackageVersionCache | undefined

  beforeEach(async () => {
    registry = await LocalRegistry.openPackage(packageId)
    editor = await Editor.openProject(packageId)
    er2 = await registry.getVersion(packageId, 'json-2-0/B-BN-J20-P-01')
  })

  test('B-BN-J20-P-01 Success publishing', async () => {
    const version = 'json-2-0/B-BN-J20-P-01'
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}]})

    expect(ar.config).toMatchObject(er2!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er2!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J20-P-02 Publishing with label', async () => {
    const version = 'json-2-0/B-BN-J20-P-02'
    const er1 = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, metadata: {'labels': ['ipg9']}, files: [{fileId: 'swagger.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er2!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J20-N-01 Spec without \'info\' field', async () => {
    const version = 'json-2-0/B-BN-J20-N-01'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('swagger.json', (data) => {
      delete data.info
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er1!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J20-N-02 Broken spec', async () => {
    const version = 'json-2-0/B-BN-J20-N-02'
    //TODO: getVersion() should return source of broken json
    // const er = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, files: [{fileId: 'swagger-missing-bracket.json'}]})

    expect(ar.config).toMatchObject({
      'previousVersion': '',
      'previousVersionPackageId': 'bundling',
      'packageId': 'bundling',
      'version': 'json-2-0/B-BN-J20-N-02',
    })
    expect(ar.documents.get('swagger-missing-bracket.json')).toMatchObject({
      'fileId': 'swagger-missing-bracket.json',
      'type': 'unknown',
      'format': 'json',
      'data': '',
      'slug': 'swagger-missing-bracket',
      'publish': true,
      'filename': 'swagger-missing-bracket.json',
      'title': 'swagger-missing-bracket',
      'dependencies': [],
      'description': '',
      'operations': [],
      'metadata': {},
    })
    expect(ar.operations.size).toEqual(0)
    // expect(ar.notifications).toMatchObject([
    //   {
    //     'fileId': 'swagger-missing-bracket.json',
    //     'severity': 0,
    //     'message': 'Cannot parse file swagger-missing-bracket.json',
    //   },
    //   {
    //     'severity': 2,
    //     'message': 'No previous version specified',
    //   },
    // ])
  })

  test('B-BN-J20-P-03 Spec with external reference', async () => {
    const version = 'json-2-0/B-BN-J20-P-03'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('swagger.json', (data) => {
      delete data.definitions.Tag
      data.definitions.Pet.properties.tags.items.$ref = 'Tag.json'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}, {fileId: 'Tag.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er1!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J20-N-03 The referenced file is missing in the config', async () => {
    const version = 'json-2-0/B-BN-J20-N-03'
    const er = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('swagger.json', (data) => {
      delete data.definitions.Tag
      data.definitions.Pet.properties.tags.items.$ref = 'Tag.json'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}]})

    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.notifications).toMatchObject(er!.notifications)
    expect(ar.documents.get('swagger.json')).toMatchObject(er!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
  })

  test('B-BN-J20-P-04 Spec with external reference with relative path', async () => {
    const version = 'json-2-0/B-BN-J20-P-04'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('swagger.json', (data) => {
      delete data.definitions.Tag
      delete data.definitions.Category
      data.definitions.Pet.properties.tags.items.$ref = 'TagCategory.json#/Tag'
      data.definitions.Pet.properties.category.$ref = 'TagCategory.json#/Category'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}, {fileId: 'TagCategory.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er1!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J20-P-05 Spec with external reference to a file located in a folder', async () => {
    const version = 'json-2-0/B-BN-J20-P-05'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('swagger.json', (data) => {
      delete data.definitions.Tag
      data.definitions.Pet.properties.tags.items.$ref = 'BN-06.1/Tag.json'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}, {fileId: 'BN-06.1/Tag.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er1!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J20-P-06 Spec with external reference to an intermediate file', async () => {
    const version = 'json-2-0/B-BN-J20-P-06'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('swagger.json', (data) => {
      delete data.definitions.Tag
      data.definitions.Pet.properties.tags.items.$ref = 'IntermediateFile.json'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}, {fileId: 'IntermediateFile.json'}, {fileId: 'Tag.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er1!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-BN-J20-P-10 Spec with overriding the value for the reference', async () => {
    const version = 'json-2-0/B-BN-J20-P-10'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('swagger.json', (data) => {
      data.paths['/pet'].post.parameters[0].schema.description = 'Override description'
      data.definitions.Pet.description = 'Pet description'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er1!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J20-P-11 Spec with a recursive link', async () => {
    const version = 'json-2-0/B-BN-J20-P-11'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('swagger.json', (data) => {
      data.definitions.Pet.properties.myself = {$ref: '#/definitions/Pet'}
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er1!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J20-P-12 Spec with a recursive link and overriding description', async () => {
    const version = 'json-2-0/B-BN-J20-P-12'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('swagger.json', (data) => {
      data.definitions.Pet.properties.tags.items = {
        $ref: '#/definitions/Pet',
        description: 'Test description',
      }
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er1!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test.skip('B-BN-J20-N-04 Spec with a link to a schema that doesn\'t exist', async () => {
    //TODO: enable after fix "a Swagger 2.0 specification with a link to a non-existent schema should be converted to OpenApi 3.0"
    const version = 'json-2-0/B-BN-J20-N-04'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('swagger.json', (data) => {
      delete data.definitions.Category
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er1!.documents.get('swagger')!)
    expect(ar.operations.size).toEqual(0)
    // expect(ar.notifications).toMatchObject(er1!.notifications)
  })

  test('B-BN-J20-P-13 Spec with custom parameters', async () => {
    const version = 'json-2-0/B-BN-J20-P-13'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('swagger.json', (data) => {
      data.paths['/pet'].post['x-custom-property'] = {
        'deprecated-from': 2022.3,
        'stop-support': 2022.4,
        'remove-from': 2023.1,
        'deprecation-reason': 'Sales order entity in response V1 API contains full product offering structure. The response is bigger than required for the projects and leads to unnessasary transfer of data over the network. New V2 API optimize response size: Response contains only id, originalName, name, href for product offering.\n',
      }
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'swagger.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger.json')).toMatchObject(er1!.documents.get('swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J20-N-05 Spec with two identical operations', async () => {
    const version = 'json-2-0/B-BN-J20-N-05'
    const er1 = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, files: [{fileId: 'swagger-doubled-operation.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('swagger-doubled-operation.json')).toMatchObject(er1!.documents.get('swagger-doubled-operation')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er2!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toMatchObject(er2!.notifications)
  })

  test('B-BN-J20-P-15 Spec with globally defined security object, but no security object defined for operations', async () => {
    const version = 'json-2-0/B-BN-J20-P-15'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('BN-01_swagger.json', (data) => {
      data.security = [
        {
          'api_key': [],
        },
      ]
      delete data.paths['/pet'].post.security
      delete data.paths['/pet/{petId}'].delete.security
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'BN-01_swagger.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('BN-01_swagger.json')).toMatchObject(er1!.documents.get('bn-01_swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-BN-J20-P-16 Spec with globally defined security object and security object defined for operation', async () => {
    const version = 'json-2-0/B-BN-J20-P-16'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('BN-17.1_swagger.json', (data) => {
      data.paths['/pet'].post.security = [
        {
          'petstore_auth': [
            'write:pets',
            'read:pets',
          ],
        },
      ]
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'BN-17.1_swagger.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('BN-17.1_swagger.json')).toMatchObject(er1!.documents.get('bn-17-1_swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-BN-J20-P-17 Spec with globally defined custom tag', async () => {
    const version = 'json-2-0/B-BN-J20-P-17'
    const er1 = await registry.getVersion(packageId, version)

    await editor.updateJsonFile('BN-01_swagger.json', (data) => {
      data['x-custom-tag'] = {
        'parameter': 123,
      }
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'BN-01_swagger.json'}]})

    expect(ar.config).toMatchObject(er1!.config)
    expect(ar.documents.get('BN-01_swagger.json')).toMatchObject(er1!.documents.get('bn-01_swagger')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er1!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
    // expect(ar.notifications.length).toEqual(1)
  })
})
