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

import { buildPackageFromContent, documentOf, Editor, LocalRegistry, notificationOf } from './helpers'
import { REST_DOCUMENT_TYPE } from '../src/apitypes/rest/rest.consts'
import { MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../src/consts'
import { buildDocument } from '../src/components/document'
import { DocumentBuildError } from '../src/errors'
import { FILE_KIND } from '../src/types'

const brokenPackage = LocalRegistry.openPackage('broken')


// A file the parser cannot read no longer costs the version: it is published as-is, without operations, and
// the reason is reported. Replaces the old expectation that the build throws.
// `reason` is the parser's own words, for a fixture whose breakage is its subject
const expectToleratedParseFailure = async (fileId: string, reason?: string): Promise<void> => {
  const editor = await Editor.openProject('broken', brokenPackage)
  const result = await editor.run({ files: [{ fileId, publish: true, labels: [] }] })

  const document = documentOf(result, fileId)
  expect(document.source).toBeDefined()
  expect(result.operations.size).toBe(0)

  const parseFailure = notificationOf(result.notifications, MESSAGE_CATEGORY.ParseFile)
  expect(parseFailure.severity).toBe(MESSAGE_SEVERITY.Error)
  expect(parseFailure.message).toContain(`Cannot parse file ${fileId}.`)
  if (reason) {
    expect(parseFailure.message).toContain(reason)
  }
  expect(parseFailure.documentId).toBe(document.slug)
}

// The packaging regression this tolerance would otherwise hit: an error document with no source used to make
// `dumpUnknownDocument` throw, so the whole archive failed after the build had already succeeded.
describe('Basic project (one file): validation broken', () => {
  describe('JSON format', () => {
    test('JSON content in YAML-extension file', async () => {
      const editor = await Editor.openProject('broken', brokenPackage)
      const result = await editor.run({ files: [{ fileId: 'openapi.yaml', publish: true, labels: [] }] })

      expect(documentOf(result, 'openapi.yaml').type).toBe('openapi-3-0')
    })

    test('missing quote', async () => {
      await expectToleratedParseFailure('missing-quote.json')
    })

    test('missing comma', async () => {
      await expectToleratedParseFailure('missing-comma.json')
    })

    test('missing brace', async () => {
      await expectToleratedParseFailure('missing-brace.json')
    })

    test('missing bracket', async () => {
      await expectToleratedParseFailure('missing-bracket.json')
    })
  })

  describe('YAML format', () => {
    test('missing quote', async () => {
      await expectToleratedParseFailure('missing-quote.yaml')
    })

    test('missing dash', async () => {
      await expectToleratedParseFailure('missing-dash.yaml')
    })

    // `.yml`, not `.yaml`: the only fixture in the suite with that extension
    test('duplicate keys', async () => {
      await expectToleratedParseFailure('duplicate-keys.yml', 'Map keys must be unique')
    })

    // no `openapi` header, so no API parser claims the file and the fallback parser is the one that fails
    test('a quoted key broken across lines', async () => {
      await expectToleratedParseFailure('unclosed-quote-key.yaml', 'Missing closing \'quote')
    })
  })
})

// A nested failure keeps its own category through the wrapper `buildDocument` puts around it — without that,
// every api-type-specific failure would flatten into the generic `build-document`.
describe('Document build failures', () => {
  test('buildDocument preserves the category of a nested DocumentBuildError', async () => {
    const failingBuilder = {
      apiType: 'rest',
      types: ['unit-test-type'],
      buildDocument: () => {
        throw new DocumentBuildError('nested failure', MESSAGE_CATEGORY.SwaggerConversion)
      },
    }

    const build = buildDocument(
      { fileId: 'x.json', type: 'unit-test-type', kind: FILE_KIND.TEXT, data: {}, source: new Blob([]) } as never,
      { fileId: 'x.json', slug: 'x' } as never,
      { apiBuilders: [failingBuilder] } as never,
    )

    await expect(build).rejects.toMatchObject({ category: MESSAGE_CATEGORY.SwaggerConversion })
    // the wrapper names the document, matching the `documentId` the notification will carry
    await expect(build).rejects.toThrow('Cannot process the "x" document')
  })
})

describe('OpenAPI 3.1 in JSON', () => {
  // `type: [string, null]` is valid in 3.1 only, so validating against the 3.0 schema would report it
  const OPENAPI_31 = JSON.stringify({
    openapi: '3.1.0',
    info: { title: 'Nullable', version: '1.0' },
    paths: {
      '/pet': {
        get: {
          responses: {
            '200': {
              description: 'OK',
              content: { 'application/json': { schema: { type: ['string', 'null'] } } },
            },
          },
        },
      },
    },
  }, undefined, 2)

  test('should publish as an OpenAPI 3.1 document without notifications', async () => {
    const result = await buildPackageFromContent('parser/openapi-31-json', 'openapi.json', OPENAPI_31)

    expect(result.operations.size).toBe(1)
    expect(documentOf(result, 'openapi.json').type).toBe(REST_DOCUMENT_TYPE.OAS31)
    expect(result.notifications).toEqual([])
  })
})
