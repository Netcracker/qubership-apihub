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

import { deprecatedItemDescriptionMatcher, Editor, LocalRegistry } from './helpers'
import { VERSION_STATUS } from '../src'

const packageRegistry = LocalRegistry.openPackage('deprecated-item-description')

describe('Description for deprecated items test', () => {
  test('description for schema object', async () => {
    const packageId = 'deprecated-schema'

    const editor = new Editor('deprecated-item-description', {
      packageId: packageId,
      version: 'v1',
      status: VERSION_STATUS.RELEASE,
      files: [{ fileId: 'deprecated-schema.yaml' }],
    }, {}, packageRegistry)

    const result = await editor.run()

    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems)

    expect(deprecatedItems[0]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in query parameter \'param1\''))
    expect(deprecatedItems[1]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.parameters.Parameter.schema\''))
    expect(deprecatedItems[2]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.schemas.CommonDeprecatedSchema.properties.petId\''))
    expect(deprecatedItems[3]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.responses.ResponseRef.content.application/json.schema\''))
    expect(deprecatedItems[4]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in header \'InlineHeader\' in response \'403\''))
    expect(deprecatedItems[5]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.headers.HeaderRef.schema\''))
    expect(deprecatedItems[6]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in response \'403\' (application/json)'))
    expect(deprecatedItems[7]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in request body (application/x-www-form-urlencoded)'))
    expect(deprecatedItems[8]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.schemas.MyDeprecate\''))
    expect(deprecatedItems[9]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.requestBodies.RequestBody.content.text/plain.schema\''))
  })
})
