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

describe.skip('Bundling - OpenAPI 3.1 YAML files', () => {
  const packageId: string = 'bundling'
  let registry: LocalRegistry
  let editor: Editor
  let standardEr: PackageVersionCache | undefined

  beforeEach(async () => {
    registry = await LocalRegistry.openPackage(packageId)
    editor = await Editor.openProject(packageId)
    standardEr = await registry.getVersion(packageId, 'OA31-yaml/B-OA31-Y-BN-01')
  })

  test('B-OA31-Y-BN-01 Success publishing', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-01'
    const ar = await editor.run({version: version, files: [{'fileId': 'OA31/BN-01_openapi.yaml'}]})

    expect(ar.config).toMatchObject(standardEr!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(standardEr!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(standardEr!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-02 Publishing with label', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-02'
    const er = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, files: [{'fileId': 'OA31/BN-01_openapi.yaml'}], metadata: {'labels': ['ipg9']}})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(standardEr!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(standardEr!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-03-N Spec without \'info\' field', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-03-N'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      delete data.info
      return data
    })
    const ar = await editor.run({version: version, files: [{'fileId': 'OA31/BN-01_openapi.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(standardEr!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-03.1-N Broken spec', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-03.1-N'
    const er = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi-broken-tabulation.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.operations.size).toEqual(0)
    expect(ar.documents.get('OA31/BN-01_openapi-broken-tabulation.yaml')).toMatchObject(er!.documents.get('bn-01_openapi-broken-tabulation')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
    expect(ar.notifications).toContainEqual({
      'fileId': 'OA31/BN-01_openapi-broken-tabulation.yaml',
      'severity': 0,
      'message': 'Cannot parse file OA31/BN-01_openapi-broken-tabulation.yaml',
    })
  })

  test('B-OA31-Y-BN-04 Spec with external reference', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-04'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      delete data.components.schemas.Tag
      data.components.schemas.Pet.properties.tags.items.$ref = 'Tag.yaml'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}, {fileId: 'OA31/Tag.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(standardEr!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-05 Spec with external reference with relative path', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-05'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      delete data.components.schemas.Tag
      delete data.components.schemas.Category
      data.components.schemas.Pet.properties.tags.items.$ref = 'TagCategory.yaml#/Tag'
      data.components.schemas.Pet.properties.category.$ref = 'TagCategory.yaml#/Category'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}, {fileId: 'OA31/TagCategory.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(standardEr!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-06 Spec with external reference to a file located in a folder', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-06'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      delete data.components.schemas.Tag
      data.components.schemas.Pet.properties.tags.items.$ref = './BN-06.1/Tag.yaml'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}, {fileId: 'OA31/BN-06.1/Tag.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(standardEr!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-07 Spec with external reference to an intermediate file', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-07'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      delete data.components.schemas.Tag
      data.components.schemas.Pet.properties.tags.items.$ref = 'IntermediateFile.yaml'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}, {fileId: 'OA31/IntermediateFile.yaml'}, {fileId: 'OA31/Tag.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-11 Spec with overriding the value for the reference', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-11'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      data.paths['/pet'].put.requestBody.content['application/json'].schema.description = 'Override description'
      data.components.schemas.Pet.description = 'Pet description'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-03.2-N The referenced file is missing in the config', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-03.2-N'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      delete data.components.schemas.Tag
      data.components.schemas.Pet.properties.tags.items.$ref = 'Tag.yaml'
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.notifications).toContainEqual({
      'severity': 0,
      'message': 'Cannot resolve file',
      'fileId': 'OA31/Tag.yaml',
    })
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-12 Spec with a recursive link', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-12'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.myself = {$ref: '#/components/schemas/Pet'}
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-13 Spec with a recursive link and overriding description', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-13'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.tags.items = {
        $ref: '#/components/schemas/Pet',
        description: 'Test description',
      }
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-14-N Spec with a link to a schema that doesn\'t exist', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-14-N'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      delete data.components.schemas.Category
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.notifications).toContainEqual({
      'severity': 1,
      'message': 'Bad reference in operation found',
      'operationId': 'api-v3-pet-put',
    })
    expect(ar.notifications).toContainEqual({
      'severity': 1,
      'message': 'Bad reference in operation found',
      'operationId': 'api-v3-pet-petid-get',
    })
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-15 Spec with custom parameters', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-15'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      data.paths['/pet'].put['x-custom-property'] = {
        'deprecated-from': 2022.3,
        'stop-support': 2022.4,
        'remove-from': 2023.1,
        'deprecation-reason': 'Sales order entity in response V1 API contains full product offering structure. The response is bigger than required for the projects and leads to unnessasary transfer of data over the network. New V2 API optimize response size: Response contains only id, originalName, name, href for product offering.\n',
      }
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-16-N Spec with two identical operations', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-16-N'
    const er = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi-doubled-operation.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.notifications).toContainEqual({
      'fileId': 'OA31/BN-01_openapi-doubled-operation.yaml',
      'severity': 0,
      'message': 'Cannot parse file OA31/BN-01_openapi-doubled-operation.yaml',
    })
    expect(ar.documents.get('OA31/BN-01_openapi-doubled-operation.yaml')).toMatchObject(er!.documents.get('bn-01_openapi-doubled-operation')!)
    expect(ar.operations.size).toEqual(0)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-17 Spec with a globally defined server and a server for a specific operation', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-17'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      data.paths['/pet'].put.servers = [
        {
          url: 'https://petstore3.swagger.io/api/v4',
        },
      ]
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v4-pet-put')).toMatchObject(er!.operations.get('api-v4-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(standardEr!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-17.1 Spec with globally defined security object, but no security object defined for operations', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-17.1'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      data.security = [
        {
          'api_key': [],
        },
      ]
      delete data.paths['/pet'].put.security
      delete data.paths['/pet/{petId}'].get.security
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(er!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-17.2 Spec with globally defined security object and security object defined for operation', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-17.2'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-17.1_openapi.yaml', (data) => {
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
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-17.1_openapi.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-17.1_openapi.yaml')).toMatchObject(er!.documents.get('bn-17-1_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(er!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-OA31-Y-BN-17.3 Spec with globally defined custom tag', async () => {
    const version = 'OA31-yaml/B-OA31-Y-BN-17.3'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('OA31/BN-01_openapi.yaml', (data) => {
      data['x-custom-tag'] = {
        'parameter': 123,
      }
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'OA31/BN-01_openapi.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.get('OA31/BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-petid-image-post')).toMatchObject(er!.operations.get('api-v3-pet-petid-image-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })
})
