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

import { getTestData } from './utils'

describe('Merge openapi schemas', () => {
  test('Should throw on different openapi', async () => {
    // 1: [[../should-throw-on-different-openapi/1.yaml]]
    // 2: [[../should-throw-on-different-openapi/2.yaml]]
    const testId = 'should-throw-on-different-openapi'
    await expect(getTestData(testId)).rejects.toThrowError(/different.*versions/)
  })

  test('Should remove unused tags', async () => {
    // 1: [[../should-remove-unused-tags/1.yaml]]
    // result: [[../should-remove-unused-tags/result.yaml]]
    const testId = 'should-remove-unused-tags'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should have externalDocs from template', async () => {
    // template: [[../external-docs-from-template/template.yaml]]
    // 1: [[../external-docs-from-template/1.yaml]]
    // result: [[../external-docs-from-template/result.yaml]]
    const testId = 'external-docs-from-template'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should have externalDocs from spec', async () => {
    // template: [[../external-docs-from-spec/template.yaml]]
    // 1: [[../external-docs-from-spec/1.yaml]]
    // result: [[../external-docs-from-spec/result.yaml]]
    const testId = 'external-docs-from-spec'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should not have externalDocs', async () => {
    // template: [[../should-not-have-external-docs/template.yaml]]
    // 1: [[../should-not-have-external-docs/1.yaml]]
    // 2: [[../should-not-have-external-docs/2.yaml]]
    // result: [[../should-not-have-external-docs/result.yaml]]
    const testId = 'should-not-have-external-docs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should have servers from template', async () => {
    // template: [[../servers-from-template/template.yaml]]
    // 1: [[../servers-from-template/1.yaml]]
    // result: [[../servers-from-template/result.yaml]]
    const testId = 'servers-from-template'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should have servers from specs', async () => {
    // template: [[../servers-from-specs/template.yaml]]
    // 1: [[../servers-from-specs/1.yaml]]
    // result: [[../servers-from-specs/result.yaml]]
    const testId = 'servers-from-specs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should throw on different servers', async () => {
    // 1: [[../should-throw-on-different-servers/1.yaml]]
    // 2: [[../should-throw-on-different-servers/2.yaml]]
    const testId = 'should-throw-on-different-servers'
    await expect(getTestData(testId)).rejects.toThrowError(/servers.0/)
  })

  test('Should have security from template', async () => {
    // template: [[../security-from-template/template.yaml]]
    // 1: [[../security-from-template/1.yaml]]
    // result: [[../security-from-template/result.yaml]]
    const testId = 'security-from-template'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should have security from specs', async () => {
    // template: [[../security-from-specs/template.yaml]]
    // 1: [[../security-from-specs/1.yaml]]
    // 2: [[../security-from-specs/2.yaml]]
    // result: [[../security-from-specs/result.yaml]]
    const testId = 'security-from-specs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should throw on different security', async () => {
    // 1: [[../should-throw-on-different-security/1.yaml]]
    // 2: [[../should-throw-on-different-security/2.yaml]]
    const testId = 'should-throw-on-different-security'
    await expect(getTestData(testId)).rejects.toThrowError(/security.0/)
  })

  test('Should have components.schemas from specs', async () => {
    // 1: [[../components-schemas-from-specs/1.yaml]]
    // 2: [[../components-schemas-from-specs/2.yaml]]
    // result: [[../components-schemas-from-specs/result.yaml]]
    const testId = 'components-schemas-from-specs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should throw on different components.schemas item content', async () => {
    // 1: [[../should-throw-on-different-components-schemas/1.yaml]]
    // 2: [[../should-throw-on-different-components-schemas/2.yaml]]
    const testId = 'should-throw-on-different-components-schemas'
    await expect(getTestData(testId)).rejects.toThrowError(/components.schemas.UpgradeRequest/)
  })

  test('Should have components.responses from specs', async () => {
    // 1: [[../components-responses-from-specs/1.yaml]]
    // 2: [[../components-responses-from-specs/2.yaml]]
    // result: [[../components-responses-from-specs/result.yaml]]
    const testId = 'components-responses-from-specs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should throw on different components.responses item content', async () => {
    // 1: [[../should-throw-on-different-components-responses/1.yaml]]
    // 2: [[../should-throw-on-different-components-responses/2.yaml]]
    const testId = 'should-throw-on-different-components-responses'
    await expect(getTestData(testId)).rejects.toThrowError(/paths.\/pet/)
  })

  test('Should have components.examples from specs', async () => {
    // 1: [[../components-examples-from-specs/1.yaml]]
    // 2: [[../components-examples-from-specs/2.yaml]]
    // result: [[../components-examples-from-specs/result.yaml]]
    const testId = 'components-examples-from-specs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should throw on different components.examples item content', async () => {
    // 1: [[../should-throw-on-different-components-examples/1.yaml]]
    // 2: [[../should-throw-on-different-components-examples/2.yaml]]
    const testId = 'should-throw-on-different-components-examples'
    await expect(getTestData(testId)).rejects.toThrowError(/components.examples.example/)
  })

  test('Should have components.headers from specs', async () => {
    // 1: [[../components-headers-from-specs/1.yaml]]
    // 2: [[../components-headers-from-specs/2.yaml]]
    // result: [[../components-headers-from-specs/result.yaml]]
    const testId = 'components-headers-from-specs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should throw on different components.headers item content', async () => {
    // 1: [[../should-throw-on-different-components-headers/1.yaml]]
    // 2: [[../should-throw-on-different-components-headers/2.yaml]]
    const testId = 'should-throw-on-different-components-headers'
    await expect(getTestData(testId)).rejects.toThrowError(/components.headers.content-range/)
  })

  test('Should have components.links from specs', async () => {
    // 1: [[../components-links-from-specs/1.yaml]]
    // 2: [[../components-links-from-specs/2.yaml]]
    // result: [[../components-links-from-specs/result.yaml]]
    const testId = 'components-links-from-specs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should throw on different components.links item content', async () => {
    // 1: [[../should-throw-on-different-components-links/1.yaml]]
    // 2: [[../should-throw-on-different-components-links/2.yaml]]
    const testId = 'should-throw-on-different-components-links'
    await expect(getTestData(testId)).rejects.toThrowError(/components.links.link/)
  })

  test('Should have components.securitySchemes from template', async () => {
    // template: [[../components-security-schemes-from-template/template.yaml]]
    // 1: [[../components-security-schemes-from-template/1.yaml]]
    // result: [[../components-security-schemes-from-template/result.yaml]]
    const testId = 'components-security-schemes-from-template'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should have components.securitySchemes from specs', async () => {
    // 1: [[../components-security-schemes-from-specs/1.yaml]]
    // 2: [[../components-security-schemes-from-specs/2.yaml]]
    // result: [[../components-security-schemes-from-specs/result.yaml]]
    const testId = 'components-security-schemes-from-specs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should throw on different components.securitySchemes item content', async () => {
    // template: [[../should-throw-on-different-components-security-schemes/template.yaml]]
    // 1: [[../should-throw-on-different-components-security-schemes/1.yaml]]
    const testId = 'should-throw-on-different-components-security-schemes'
    await expect(getTestData(testId)).rejects.toThrowError(/components.securitySchemes.token/)
  })

  test('Should have components.parameters from specs', async () => {
    // 1: [[../components-parameters-from-specs/1.yaml]]
    // 2: [[../components-parameters-from-specs/2.yaml]]
    // result: [[../components-parameters-from-specs/result.yaml]]
    const testId = 'components-parameters-from-specs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should throw on different components.parameters item content', async () => {
    // 1: [[../should-throw-on-different-components-parameters/1.yaml]]
    // 2: [[../should-throw-on-different-components-parameters/2.yaml]]
    const testId = 'should-throw-on-different-components-parameters'
    await expect(getTestData(testId)).rejects.toThrowError(/components.parameters.x-request-id/)
  })

  test('Should have components.requestBodies from specs', async () => {
    // 1: [[../components-request-bodies-from-specs/1.yaml]]
    // 2: [[../components-request-bodies-from-specs/2.yaml]]
    // result: [[../components-request-bodies-from-specs/result.yaml]]
    const testId = 'components-request-bodies-from-specs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should throw on different components.requestBodies item content', async () => {
    // 1: [[../should-throw-on-different-components-request-bodies/1.yaml]]
    // 2: [[../should-throw-on-different-components-request-bodies/2.yaml]]
    const testId = 'should-throw-on-different-components-request-bodies'
    await expect(getTestData(testId)).rejects.toThrowError(/components.requestBodies.PetBody/)
  })

  test('Should have paths from specs', async () => {
    // 1: [[../paths-from-specs/1.yaml]]
    // 2: [[../paths-from-specs/2.yaml]]
    // result: [[../paths-from-specs/result.yaml]]
    const testId = 'paths-from-specs'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })

  test('Should throw on different methods content', async () => {
    // 1: [[../should-throw-on-different-methods/1.yaml]]
    // 2: [[../should-throw-on-different-methods/2.yaml]]
    const testId = 'should-throw-on-different-methods'
    await expect(getTestData(testId)).rejects.toThrowError(/paths.\/path1/)
  })

  test('Should merge with empty template', async () => {
    // 1: [[../should-merge-with-empty-template/1.yaml]]
    // 2: [[../should-merge-with-empty-template/2.yaml]]
    // result: [[../should-merge-with-empty-template/result.yaml]]
    const testId = 'should-merge-with-empty-template'
    const [merged, expected] = await getTestData(testId)
    await expect(merged).toEqual(expected)
  })
})
