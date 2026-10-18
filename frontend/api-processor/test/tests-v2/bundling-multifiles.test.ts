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

import { Editor, LocalRegistry } from '../helpers'

describe.skip('Bundling - Mltifiles', () => {
  const packageId: string = 'bundling'
  let registry: LocalRegistry
  let editor: Editor

  beforeEach(async () => {
    registry = await LocalRegistry.openPackage(packageId)
    editor = await Editor.openProject(packageId)
  })

  test('B-M-BN-20 Different types of specs (Swagger 2.0 + OpenAPI 3.0), same file types (yaml)', async () => {
    const version = 'mf/B-M-BN-20'
    const er = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, files: [{fileId: 'BN-01_openapi.yaml'}, {fileId: 'BN-01_swagger.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.size).toEqual(2)
    expect(ar.operations.size).toEqual(4)
    // expect(ar.notifications.length).toEqual(1)
    expect(ar.documents.get('BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.documents.get('BN-01_swagger.yaml')).toMatchObject(er!.documents.get('bn-01_swagger')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-M-BN-20.1 Different types of specs (Swagger 2.0 + OpenAPI 3.0), same file types (yaml), additional files (docx + png)', async () => {
    const version = 'mf/B-M-BN-20.1'
    const ar = await editor.run({version: version, files: [{fileId: 'BN-01_openapi.yaml'}, {fileId: 'BN-01_swagger.yaml'}, {fileId: 'Test.docx'}, {fileId: 'Test.png'}]})
    const er = await registry.getVersion(packageId, version)

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.size).toEqual(4)
    expect(ar.operations.size).toEqual(4)
    // expect(ar.notifications.length).toEqual(3)
    expect(ar.documents.get('BN-01_openapi.yaml')).toMatchObject(er!.documents.get('bn-01_openapi')!)
    expect(ar.documents.get('BN-01_swagger.yaml')).toMatchObject(er!.documents.get('bn-01_swagger')!)
    expect(ar.documents.get('Test.docx')).toMatchObject(er!.documents.get('test')!)
    expect(ar.documents.get('Test.png')).toMatchObject(er!.documents.get('test1')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
    // expect(ar.notifications).toContainEqual({
    //   'fileId': 'Test.png',
    //   'severity': 0,
    //   'message': 'Cannot parse file Test.png',
    // })
    // expect(ar.notifications).toContainEqual({
    //   'fileId': 'Test.docx',
    //   'severity': 0,
    //   'message': 'Cannot parse file Test.docx',
    // })
  })

  test('B-M-BN-20.2 Two OpenAPI 3.0 files that contain the same operations', async () => {
    const version = 'mf/B-M-BN-20.2'
    const er = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, files: [{fileId: 'BN-20.2_openapi3.0_1.yaml'}, {fileId: 'BN-20.2_openapi3.0_2.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.size).toEqual(2)
    expect(ar.operations.size).toEqual(2)
    // expect(ar.notifications.length).toEqual(1)
    expect(ar.documents.get('BN-20.2_openapi3.0_1.yaml')).toMatchObject(er!.documents.get('bn-20-2_openapi3-0_1')!)
    expect(ar.documents.get('BN-20.2_openapi3.0_2.yaml')).toMatchObject(er!.documents.get('bn-20-2_openapi3-0_2')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-M-BN-20.3 Two OpenAPI 3.0 files that contain operations that have the same path, the same operationID, but different request body and response', async () => {
    const version = 'mf/B-M-BN-20.3'
    const er = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, files: [{fileId: 'BN-20.2_openapi3.0_1.yaml'}, {fileId: 'BN-20.3_openapi3.0_2.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.size).toEqual(2)
    expect(ar.operations.size).toEqual(2)
    // expect(ar.notifications.length).toEqual(1)
    expect(ar.documents.get('BN-20.2_openapi3.0_1.yaml')).toMatchObject(er!.documents.get('bn-20-2_openapi3-0_1')!)
    expect(ar.documents.get('BN-20.3_openapi3.0_2.yaml')).toMatchObject(er!.documents.get('bn-20-3_openapi3-0_2')!)
    expect(ar.operations.get('api-v3-pet-petid-get')).toMatchObject(er!.operations.get('api-v3-pet-petid-get')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-M-BN-20.4 OpenAPI 3.0 and  Swagger 2.0 files that contain the same operations', async () => {
    const version = 'mf/B-M-BN-20.4'
    const er = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, files: [{fileId: 'BN-20.4_openapi3.0.yaml'}, {fileId: 'BN-20.4_swagger2.0.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.size).toEqual(2)
    expect(ar.operations.size).toEqual(3)
    // expect(ar.notifications.length).toEqual(1)
    expect(ar.documents.get('BN-20.4_openapi3.0.yaml')).toMatchObject(er!.documents.get('bn-20-4_openapi3-0')!)
    expect(ar.documents.get('BN-20.4_swagger2.0.yaml')).toMatchObject(er!.documents.get('bn-20-4_swagger2-0')!)
    expect(ar.operations.get('api-v3-pet-petid-delete')).toMatchObject(er!.operations.get('api-v3-pet-petid-delete')!)
    expect(ar.operations.get('api-v3-pet-post')).toMatchObject(er!.operations.get('api-v3-pet-post')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-M-BN-20.5 OpenAPI 3.0 and  Swagger 2.0 files that contain operations that have the same path, the same operationID, but different params and response', async () => {
    const version = 'mf/B-M-BN-20.5'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('BN-20.4_openapi3.0.yaml', (data) => {
      data.paths['/pet/{petId}'].delete.parameters.push({
        'name': 'queryParam',
        'in': 'query',
        'required': false,
        'schema': {
          'type': 'string',
        },
      })
      data.paths['/pet/{petId}'].delete.responses['204'] = {
        'description': 'No content',
      }
      return data
    })
    const ar = await editor.run({version: version, files: [{fileId: 'BN-20.4_openapi3.0.yaml'}, {fileId: 'BN-20.4_swagger2.0.yaml'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.size).toEqual(2)
    expect(ar.operations.size).toEqual(3)
    // expect(ar.notifications.length).toEqual(1)
    expect(ar.documents.get('BN-20.4_openapi3.0.yaml')).toMatchObject(er!.documents.get('bn-20-4_openapi3-0')!)
    expect(ar.documents.get('BN-20.4_swagger2.0.yaml')).toMatchObject(er!.documents.get('bn-20-4_swagger2-0')!)
    expect(ar.operations.get('api-v3-pet-petid-delete')).toMatchObject(er!.operations.get('api-v3-pet-petid-delete')!)
    expect(ar.operations.get('api-v3-pet-post')).toMatchObject(er!.operations.get('api-v3-pet-post')!)
    expect(ar.operations.get('api-v3-pet-put')).toMatchObject(er!.operations.get('api-v3-pet-put')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })

  test('B-M-BN-20.6 Swagger 2.0 and MD files', async () => {
    const version = 'mf/B-M-BN-20.6'
    const er = await registry.getVersion(packageId, version)
    const ar = await editor.run({version: version, files: [{fileId: 'BN-01_swagger.yaml'}, {fileId: 'BN-20.6.md'}]})

    expect(ar.config).toMatchObject(er!.config)
    expect(ar.documents.size).toEqual(2)
    expect(ar.operations.size).toEqual(2)
    // expect(ar.notifications.length).toEqual(1)
    expect(ar.documents.get('BN-01_swagger.yaml')).toMatchObject(er!.documents.get('bn-01_swagger')!)
    expect(ar.documents.get('BN-20.6.md')).toMatchObject({
      'fileId': 'BN-20.6.md',
      'type': 'markdown',
      'format': 'md',
      'data': '',
      'slug': 'bn-20-6',
      'publish': true,
      'filename': 'bn-20-6.md',
      'title': 'BN-20.6',
      'dependencies': [],
      'description': '"# Hello APIHUB"',
      'operations': [],
      'metadata': {
        'apiKind': 'bwc',
      },
    })
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')).toMatchObject(er!.operations.get('laconiccactus0p-rew-1-0-0-pet-petid-delete')!)
    expect(ar.operations.get('laconiccactus0p-rew-1-0-0-pet-post')).toMatchObject(er!.operations.get('laconiccactus0p-rew-1-0-0-pet-post')!)
    // expect(ar.notifications).toContainEqual(NO_PREVIOUS_VERSION)
  })
})
