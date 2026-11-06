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

import { OpenAPIV3 } from 'openapi-types'

import type { CustomScopeElementContext } from '@netcracker/qubership-apihub-api-diff'
import type { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

import { API_AUDIENCE_EXTERNAL, VersionDocument } from '../../src/types'
import { RestOperationMeta, VersionRestOperation } from '../../src/apitypes/rest/rest.types'
import { APIHUB_API_COMPATIBILITY_KIND_BWC, FILE_FORMAT, REST_API_TYPE } from '../../src/consts'

/**
 * Builds what api-diff hands a custom scope element provider when it asks about one node. The single
 * place tests construct it, so a property added to the context later is a change here rather than at
 * every call site.
 */
export const customScopeElementContext = (
  path: JsonPath,
  beforeJso?: unknown,
  afterJso?: unknown,
): CustomScopeElementContext => ({ path, beforeJso, afterJso })

/** The fields a test overrides on a REST operation; `metadata` is merged field by field rather than replaced. */
export type RestOperationOverrides = Partial<Omit<VersionRestOperation, 'metadata'>> & {
  metadata?: Partial<RestOperationMeta>
}

/**
 * A REST operation with every required field filled: `POST /res/data` in the document `spec1`, with the id
 * `res-data-post`, `bwc` compatibility and the `external` audience.
 *
 * The defaults satisfy the type; tests do not assert on them. A test that depends on a field sets it, so a change
 * to a default here never changes what another test proves.
 */
export const restOperation = ({ metadata, ...overrides }: RestOperationOverrides = {}): VersionRestOperation => ({
  operationId: 'res-data-post',
  documentId: 'spec1',
  apiType: REST_API_TYPE,
  apiKind: APIHUB_API_COMPATIBILITY_KIND_BWC,
  apiAudience: API_AUDIENCE_EXTERNAL,
  deprecated: false,
  tags: ['alpha'],
  title: 'Create',
  search: { useOperationDataAsSearchText: true },
  versionInternalDocumentId: 'spec1-v1',
  ...overrides,
  metadata: {
    path: '/res/*',
    originalPath: '/res/data',
    method: OpenAPIV3.HttpMethods.POST,
    operationIdV1: 'res-data-post',
    ...metadata,
  },
})

/**
 * A version document named by its slug, holding an empty OpenAPI document unless `overrides` gives it `data`.
 *
 * The slug is not an override, because the file id, file name, title and internal document id are derived from
 * it. Every call returns a new object: code that tells documents apart by identity, as pairing does, sees two
 * calls with one slug as two documents.
 */
export const versionDocument = (
  slug: string,
  overrides: Partial<Omit<VersionDocument, 'slug'>> = {},
): VersionDocument => ({
  fileId: `${slug}.yaml`,
  type: 'openapi-3-1',
  format: FILE_FORMAT.JSON,
  data: { openapi: '3.0.1', paths: {} },
  slug,
  title: slug,
  description: '',
  filename: `${slug}.json`,
  dependencies: [],
  operationIds: [],
  metadata: {},
  versionInternalDocument: { versionDocumentId: `${slug}-v1` },
  ...overrides,
})

/** What `restSpec` adds to its document, each part as YAML text. */
export interface RestSpecOptions {
  openapi?: string
  root?: string
  operationFields?: string
}

/**
 * A REST document in YAML with one `GET` operation per path, each with the given summary and a `200` response.
 * `root` adds document-level lines before `paths`; `operationFields` adds inline fields to every operation.
 */
export const restSpec = (
  paths: Record<string, string>,
  { openapi = '3.0.1', root = '', operationFields = '' }: RestSpecOptions = {},
): string => `openapi: ${openapi}\ninfo: { title: t, version: 1.0.0 }\n${root}paths:\n${Object.entries(paths)
  .map(([path, summary]) => `  ${path}:\n    get: { summary: ${summary}, ${operationFields}responses: { '200': { description: ok } } }`)
  .join('\n')}\n`
