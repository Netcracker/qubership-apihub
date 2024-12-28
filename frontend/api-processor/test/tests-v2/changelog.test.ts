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

import { Editor, LocalRegistry, getVersionChanges } from '../helpers'
import { CATEGORY_SCHEMA, PET_ENDPOINT, PET_SCHEMA, PETID_GET_METHOD } from './changelog.consts'
import { NON_BREAKING_CHANGE_TYPE } from '../../src'

describe.skip('Change Log', () => {
  const packageId = 'changelog'
  let registry: LocalRegistry
  let editor: Editor

  beforeEach(async () => {
    registry = await LocalRegistry.openPackage(packageId)
    editor = await Editor.openProject(packageId, registry)
  })

  test('B-OA30-Y-CL-01 Endpoint deletion', async () => {
    const version = 'v2'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      delete data.paths['/pet']
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(1)
    // expect(changes.all).toEqual(1)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_CHANGED_OPERATIONS)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(2)
  })

  test('B-OA30-Y-CL-01.1 Endpoint adding', async () => {
    const version = 'v2.1'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01.1_openapi.yaml', (data) => {
      data.paths['/pet'] = PET_ENDPOINT
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v2', files: [{'fileId': 'CL-01.1_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(1)
    // expect(changes.all).toEqual(1)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_CHANGED_OPERATIONS)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(2)
  })

  test('B-OA30-Y-CL-02 Method deletion', async () => {
    const version = 'v3'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      delete data.paths['/pet/{petId}'].get
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(1)
    // expect(changes.all).toEqual(1)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_CHANGED_OPERATIONS)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(2)
  })

  test('B-OA30-Y-CL-02.1 Method adding', async () => {
    const version = 'v3.1'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-02_openapi.yaml', (data) => {
      data.paths['/pet/{petId}'].get = PETID_GET_METHOD
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v3', files: [{'fileId': 'CL-02_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(1)
    // expect(changes.all).toEqual(1)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_CHANGED_OPERATIONS)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(2)
  })

  test('B-OA30-Y-CL-03 Deleting a parameter of schema object', async () => {
    const version = 'v4'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      delete data.components.schemas.Pet.properties.status
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(7)
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-04 Deleting a parameter of method', async () => {
    const version = 'v5'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      data.paths['/pet/{petId}'].delete.parameters.splice(0, 1)
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(1)
    // expect(changes.all).toEqual(1)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-05 Adding a required parameter to endpoint', async () => {
    const version = 'v6'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      data.paths['/pet/{petId}'].delete.parameters[0].required = true
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(1)
    // expect(changes.all).toEqual(1)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-06 Adding a required parameter to the schema object that is used in the request', async () => {
    const version = 'v7'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      data.components.schemas.Pet.required.push('status')
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(7)
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-07 Removing the mandatory flag on a schema object parameter that is used in the response', async () => {
    const version = 'v8'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      data.components.schemas.Pet.required.splice(1, 1)
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(7)
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-08 Changing the Data Type of a Parameter', async () => {
    const version = 'v9'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.id.type = 'number'
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(7)
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-09 Removing \'Format\' for a numeric parameter', async () => {
    const version = 'v10'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      delete data.components.schemas.Pet.properties.id.format
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(7)
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-10 Adding \'Format\' for a numeric parameter', async () => {
    const version = 'v11'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-09_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.id.format = 'int64'
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v10', files: [{'fileId': 'CL-09_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(7)
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-11 Adding limits for a numeric parameter', async () => {
    const version = 'v12'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.id.minimum = 3
      data.components.schemas.Pet.properties.id.maximum = 10
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(14)
    // expect(changes.all).toEqual(14)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-12 Strengthening the dimension for a numeric parameter', async () => {
    const version = 'v13'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-11_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.id.minimum = 4
      data.components.schemas.Pet.properties.id.maximum = 9
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v12', files: [{'fileId': 'CL-11_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(14)
    // expect(changes.all).toEqual(14)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-12.1 Softening the dimension for a numeric parameter', async () => {
    const version = 'v13.1'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-12_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.id.minimum = 2
      data.components.schemas.Pet.properties.id.maximum = 11
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v12', files: [{'fileId': 'CL-12_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(14)
    // expect(changes.all).toEqual(14)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-13 Adding exclusive limits for a numeric parameter', async () => {
    const version = 'v14'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-12.1_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.id.exclusiveMinimum = true
      data.components.schemas.Pet.properties.id.exclusiveMaximum = true
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v13.1', files: [{'fileId': 'CL-12.1_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(14)
    // expect(changes.all).toEqual(14)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-15 Removing exclusive limits for a numeric parameter', async () => {
    const version = 'v16'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-13_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.id.exclusiveMinimum = false
      data.components.schemas.Pet.properties.id.exclusiveMaximum = false
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v14', files: [{'fileId': 'CL-13_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(14)
    // expect(changes.all).toEqual(14)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-16 Adding \'format\' for a string parameter', async () => {
    const version = 'v17'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.name.format = 'date-time'
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(7)
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-17 Removing \'format\' for a string parameter', async () => {
    const version = 'v18'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-16_openapi.yaml', (data) => {
      delete data.components.schemas.Pet.properties.name.format
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v17', files: [{'fileId': 'CL-16_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(7)
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-18 Adding \'pattern\' for a string parameter', async () => {
    const version = 'v19'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.name.pattern = '[a-z]*'
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(7)
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-19 Changing \'pattern\' for a string parameter', async () => {
    const version = 'v20'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-18_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.name.pattern = '[A-Z]*'
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v19', files: [{'fileId': 'CL-18_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(7)
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-20 Removing \'pattern\' for a string parameter', async () => {
    const version = 'v21'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-18_openapi.yaml', (data) => {
      delete data.components.schemas.Pet.properties.name.pattern
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v20', files: [{'fileId': 'CL-18_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(7)
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-21 Adding a length for a string parameter', async () => {
    const version = 'v22'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.name.minLength = 3
      data.components.schemas.Pet.properties.name.maxLength = 10
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(14)
    // expect(changes.all).toEqual(14)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-22 Strengthening the length for a string parameter', async () => {
    const version = 'v23'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-21_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.name.minLength = 5
      data.components.schemas.Pet.properties.name.maxLength = 8
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v22', files: [{'fileId': 'CL-21_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(14)
    // expect(changes.all).toEqual(14)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-23 Softening the length for a string parameter', async () => {
    const version = 'v24'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-22_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.name.minLength = 3
      data.components.schemas.Pet.properties.name.maxLength = 10
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v23', files: [{'fileId': 'CL-22_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(14)
    // expect(changes.all).toEqual(14)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-24 Removing the length limit for a string parameter', async () => {
    const version = 'v25'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-23_openapi.yaml', (data) => {
      delete data.components.schemas.Pet.properties.name.minLength
      delete data.components.schemas.Pet.properties.name.maxLength
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v24', files: [{'fileId': 'CL-23_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(14)
    // expect(changes.all).toEqual(14)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-25 Adding \'additionalProperties: true\' and \'additionalProperties: object\'', async () => {
    const version = 'v26.1'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-25_openapi.yaml', (data) => {
      data.components.schemas.Category.additionalProperties = true
      data.components.schemas.Tag.additionalProperties = {type: 'string'}
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v26', files: [{'fileId': 'CL-25_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(14)
    // expect(changes.all).toEqual(14)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-25.1 Changing additionalProperties', async () => {
    const version = 'v26.2'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-25_openapi.yaml', (data) => {
      data.components.schemas.Category.additionalProperties = {type: 'string'}
      data.components.schemas.Tag.additionalProperties = {type: 'integer'}
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v26.1', files: [{'fileId': 'CL-25_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(14)
    // expect(changes.all).toEqual(14)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-25.2 Changing/removing additionalProperties', async () => {
    const version = 'v26.3'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-25_openapi.yaml', (data) => {
      data.components.schemas.Category.additionalProperties = false
      data.components.schemas.Tag.additionalProperties = {
        type: 'object',
        properties: {
          code: {
            type: 'integer',
          },
          text: {
            type: 'string',
          },
        },
      }
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v26.2', files: [{'fileId': 'CL-25_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(14)
    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(7)
    // expect(changes.all).toEqual(21)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-26 Adding enum and default for properties of the schema, removing example', async () => {
    const version = 'v27'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      delete data.components.schemas.Pet.properties.name.example
      data.components.schemas.Pet.properties.name.enum = [
        'pet1',
        'pet2',
        'pet3',
      ]
      data.components.schemas.Pet.properties.status.default = 'available'
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{'fileId': 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(7)
    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(7)
    expect(changes.rest.annotation).toEqual(7)
    
    // expect(changes.all).toEqual(21)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-26.1 Adding new enum value, removing enum value, adding example, changing example, changing default', async () => {
    const version = 'v27.1'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-26_openapi.yaml', (data) => {
      data.components.schemas.Pet.properties.status.enum.push('in stock')
      data.components.schemas.Pet.properties.name.enum.splice(2, 1)
      data.components.schemas.Pet.properties.name.example = 'doggie'
      data.components.schemas.Pet.properties.id.example = 5
      data.components.schemas.Pet.properties.status.default = 'sold'

      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v27', files: [{'fileId': 'CL-26_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(14)
    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(7)
    expect(changes.rest.annotation).toEqual(14)
    // expect(changes.all).toEqual(35)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-26.2 Removing enum', async () => {
    const version = 'v27.2'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-26.1_openapi.yaml', (data) => {
      delete data.components.schemas.Pet.properties.name.enum
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v27.1', files: [{'fileId': 'CL-26.1_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(7)
    
    // expect(changes.all).toEqual(7)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-27.1 Adding optional security schema for openapi object and for method', async () => {
    const version = 'v28.1'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-27_openapi.yaml', (data) => {
      data.security = [{}]
      data.paths['/pet'].put.security = [{}]
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v28', files: [{fileId: 'CL-27_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(4) // TODO: Check
    const restChanges = Object.values(changes.rest).reduce((r, v) => r + v, 0)
    expect(restChanges).toEqual(4)
    expect(ar.config).toMatchObject(er!.config)
    // TODO expects after fix CL-27.1
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-27.2 Adding one array value for existing security property for openapi object and for method', async () => {
    const version = 'v28.2'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-27.1_openapi.yaml', (data) => {
      data.security.push({'api_key': []})
      data.paths['/pet'].put.security.push({
        'petstore_auth': [
          'write:pets',
          'read:pets',
        ],
      })
      data.paths['/pet/{petId}'].delete.security.push({
        'petstore_auth': [
          'write:pets',
          'read:pets',
        ],
      })
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v28.1', files: [{fileId: 'CL-27.1_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    // expect(changes.breaking).toEqual(1) // TODO: Check. Probably a ticket to api-smart-diff
    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(5)
    const restChanges = Object.values(changes.rest).reduce((r, v) => r + v, 0)
    expect(restChanges).toEqual(5)
    expect(ar.config).toMatchObject(er!.config)
    // TODO expects after fix CL-27.2
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-27.3 Removing one array value for existing security property for openapi object and for methods', async () => {
    const version = 'v28.3'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-27.2_openapi.yaml', (data) => {
      data.security.splice(0, 1)
      data.paths['/pet'].put.security.splice(0, 1)
      data.paths['/pet/{petId}'].delete.security[0] = ['write:pets']
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v28.2', files: [{fileId: 'CL-27.2_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(5) // TODO: Check
    const restChanges = Object.values(changes.rest).reduce((r, v) => r + v, 0)
    expect(restChanges).toEqual(5)
    expect(ar.config).toMatchObject(er!.config)
    // TODO expects after fix CL-27.3
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-27.4 Removing entire security section and adding new security array value', async () => {
    const version = 'v28.4'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-27.3_openapi.yaml', (data) => {
      delete data.security
      delete data.paths['/pet'].put.security
      data.paths['/pet/{petId}'].delete.security.push({'api_key': []})
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v28.3', files: [{fileId: 'CL-27.3_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(1)
    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(4) // TODO: Check
    const restChanges = Object.values(changes.rest).reduce((r, v) => r + v, 0)
    expect(restChanges).toEqual(5)
    expect(ar.config).toMatchObject(er!.config)
    // TODO expects after fix CL-27.4
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-28 Swapping two enum values, changing description, deleting description, adding description', async () => {
    const version = 'v29'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      data.info.description = 'CHANGED DESCRIPTION'
      delete data.paths['/pet/{petId}'].get.description
      data.components.schemas.Pet.description = 'pet'
      data.components.schemas.Pet.properties.status.enum = [
        'pending',
        'available',
        'sold',
      ]
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{fileId: 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)
    const restChanges = Object.values(changes.rest).reduce((r, v) => r + v, 0)
    expect(restChanges).toEqual(8)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-29 Adding and deleting response', async () => {
    const version = 'v30'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-01_openapi.yaml', (data) => {
      delete data.paths['/pet'].put.responses['405']
      data.paths['/pet'].put.responses['500'] = {description: 'Server error'}
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v1', files: [{fileId: 'CL-01_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(1)
    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(1)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_PRE_PREVIOUS_VERSION_FOR_V1)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-30.1 Adding and deleting media-type in response', async () => {
    const version = 'v31.1'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-30_openapi.yaml', (data) => {
      delete data.paths['/pet'].put.responses['200'].content['application/xml']
      data.paths['/pet'].put.responses['200'].content['application/x-www-form-urlencoded'] = {
        schema:
          {
            $ref: '#/components/schemas/Pet',
          },
      }
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v31', files: [{fileId: 'CL-30_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(1)
    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(1)

    const restChanges = Object.values(changes.rest).reduce((r, v) => r + v, 0)
    expect(restChanges).toEqual(2)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-30.2 Adding oneOf', async () => {
    const version = 'v31.2'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-30_openapi.yaml', (data) => {
      data.paths['/pet/{petId}'].get.responses['200'].content['application/json'].schema = {
        oneOf: [
          {'$ref': '#/components/schemas/Pet'},
          {'$ref': '#/components/schemas/Category'},
        ],
      }
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v31', files: [{fileId: 'CL-30_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(1)
    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(3)
    expect(changes.rest.unclassified).toEqual(1)

    const restChanges = Object.values(changes.rest).reduce((r, v) => r + v, 0)

    expect(restChanges).toEqual(5)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-30.3 Adding discriminator', async () => {
    const version = 'v31.3'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-30.2_openapi.yaml', (data) => {
      data.paths['/pet/{petId}'].get.responses['200'].content['application/json'].schema.discriminator = {propertyName: 'Type'}
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v31.2', files: [{fileId: 'CL-30.2_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    const restChanges = Object.values(changes.rest).reduce((r, v) => r + v, 0)

    expect(restChanges).toEqual(1)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-30.4 Adding mapping', async () => {
    const version = 'v31.4'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-30.3_openapi.yaml', (data) => {
      data.paths['/pet/{petId}'].get.responses['200'].content['application/json'].schema.discriminator.mapping = {pett: '#/components/schemas/Pet'}
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v31.3', files: [{fileId: 'CL-30.3_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    const restChanges = Object.values(changes.rest).reduce((r, v) => r + v, 0)

    expect(restChanges).toEqual(1)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-30.5 Removing mapping', async () => {
    const version = 'v31.5'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-30.4_openapi.yaml', (data) => {
      delete data.paths['/pet/{petId}'].get.responses['200'].content['application/json'].schema.discriminator.mapping
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v31.4', files: [{fileId: 'CL-30.4_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    // expect(changes.all).toEqual(1)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-30.6 Removing discriminator', async () => {
    const version = 'v31.6'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-30.3_openapi.yaml', (data) => {
      delete data.paths['/pet/{petId}'].get.responses['200'].content['application/json'].schema.discriminator
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v31.3', files: [{fileId: 'CL-30.3_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    // expect(changes.all).toEqual(1)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_BREAKING_CHANGES_FOR_BWC)
    // expect(ar.notifications.length).toEqual(1)
  })

  test('B-OA30-Y-CL-30.7 Adding allOf', async () => {
    const version = 'v31.7'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-30_openapi.yaml', (data) => {
      data.paths['/pet/{petId}'].get.responses['200'].content['application/json'].schema = {
        allOf: [
          {'$ref': '#/components/schemas/Pet'},
          {'$ref': '#/components/schemas/Category'},
        ],
      }
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v31', files: [{fileId: 'CL-30_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(0) // TODO: Check, there was 1 expected change
    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(0) // // TODO: Check, there were 3 expected changes
    expect(changes.rest.unclassified).toEqual(1)
    // expect(changes.all).toEqual(3) // TODO: Check, there were 5 expected changes
    expect(ar.config).toMatchObject(er!.config)
    //expect(ar.changes).toMatchObject(er!.changes) // TODO: Check
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-30.8 Changing oneOf to allOf', async () => {
    const version = 'v31.8'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-30.2_openapi.yaml', (data) => {
      delete data.paths['/pet/{petId}'].get.responses['200'].content['application/json'].schema.oneOf
      data.paths['/pet/{petId}'].get.responses['200'].content['application/json'].schema.allOf = [
        {'$ref': '#/components/schemas/Pet'},
        {'$ref': '#/components/schemas/Category'},
      ]
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v31.2', files: [{fileId: 'CL-30.2_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    expect(changes.rest.breaking).toEqual(3) // TODO: Check, there was 1 expected change
    expect(changes.rest[NON_BREAKING_CHANGE_TYPE]).toEqual(1)
    // expect(changes.all).toEqual(5) // TODO: Check, there was 2 expected changes
    expect(ar.config).toMatchObject(er!.config)
    //expect(ar.changes).toMatchObject(er!.changes) // TODO: Check
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-31 Replacing ref to direct schema', async () => {
    const version = 'v32'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-30_openapi.yaml', (data) => {
      data.paths['/pet/{petId}'].get.responses['200'].content['application/json'].schema = PET_SCHEMA
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v31', files: [{fileId: 'CL-30_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    // expect(changes.all).toEqual(0)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject([])
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-32 Replacing direct schema to ref', async () => {
    const version = 'v33'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-31_openapi.yaml', (data) => {
      data.paths['/pet/{petId}'].get.responses['200'].content['application/json'].schema = {'$ref': '#/components/schemas/Pet'}
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v32', files: [{fileId: 'CL-31_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    // expect(changes.all).toEqual(0)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject([])
    // expect(ar.notifications.length).toEqual(0)
  })

  test('B-OA30-Y-CL-33 Adding and deleting unused schema', async () => {
    const version = 'v34'
    const er = await registry.getVersion(packageId, version)

    await editor.updateYamlFile('CL-31_openapi.yaml', (data) => {
      data.components.schemas.Category1 = CATEGORY_SCHEMA
      delete data.components.schemas.Category
      return data
    })

    const ar = await editor.run({version: version, previousVersion: 'v31', files: [{fileId: 'CL-30_openapi.yaml'}]})
    const changes = getVersionChanges(ar)

    // expect(changes.all).toEqual(0)
    expect(ar.config).toMatchObject(er!.config)
    // expect(ar.changes).toMatchObject(er!.changes)
    // expect(ar.notifications).toContainEqual(NO_CHANGED_OPERATIONS)
    // expect(ar.notifications.length).toEqual(1)
  })
})
