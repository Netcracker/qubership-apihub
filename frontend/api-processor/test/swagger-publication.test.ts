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

import { buildPackageFromContent, LocalRegistry, operationOf } from './helpers'
import { RestOperationData } from '../src/apitypes/rest/rest.types'

// a Swagger 2.0 document is converted to OpenAPI 3.0 before its operations are built
describe('Swagger 2.0 publication', () => {
  // a whole Petstore document, not a minimal one: a body parameter, an oauth2 scheme, and `$ref`s into
  // `definitions` all go through the conversion here, which the inline cases below do not exercise
  test('should build every operation of a YAML document under its basePath', async () => {
    const project = 'swagger-publication'
    const result = await LocalRegistry.openPackage(project).publish(project, {
      packageId: 'swagger-publication/petstore',
      version: 'v1',
      files: [{ fileId: 'swagger.yaml' }],
    })

    expect([...result.operations.values()].map(({ operationId }) => operationId).sort()).toEqual([
      'LACONICCACTUS0P-rew-1.0.0-pet-_petId_-delete',
      'LACONICCACTUS0P-rew-1.0.0-pet-post',
    ])
    expect(result.notifications).toEqual([])
  })

  // the security and custom-tag rules are format-independent and tested for OpenAPI in `rest.operation.test.ts` and
  // `rest-operation-metadata.test.ts`; what these cases add is the conversion, so they also guard an upgrade of the
  // conversion library
  describe('security and custom tags', () => {
    const SWAGGER = `swagger: '2.0'
info:
  title: Security
  version: '1.0'
basePath: /api
securityDefinitions:
  root_key:
    type: apiKey
    in: header
    name: X-Root-Key
  own_key:
    type: apiKey
    in: header
    name: X-Own-Key
  unused_key:
    type: apiKey
    in: query
    name: unused
security:
  - root_key: []
paths:
  /inherits:
    get:
      responses:
        '200':
          description: OK
  /own:
    get:
      security:
        - own_key: []
      x-custom-tag: tagged
      responses:
        '200':
          description: OK
`

    const securitySchemesOf = (data: unknown): string[] =>
      Object.keys((data as RestOperationData).components?.securitySchemes ?? {})

    test('should keep only the security scheme each operation uses', async () => {
      const result = await buildPackageFromContent('swagger-publication/security', 'swagger.yaml', SWAGGER)

      expect(securitySchemesOf(operationOf(result, 'api-inherits-get').data)).toEqual(['root_key'])
      expect(securitySchemesOf(operationOf(result, 'api-own-get').data)).toEqual(['own_key'])
    })

    test('should carry an operation custom tag into its metadata', async () => {
      const result = await buildPackageFromContent('swagger-publication/custom-tag', 'swagger.yaml', SWAGGER)

      expect(operationOf(result, 'api-own-get').metadata.customTags).toEqual({ 'x-custom-tag': 'tagged' })
    })
  })
})
