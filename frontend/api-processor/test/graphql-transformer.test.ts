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

import { cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument, GRAPHQL_DOCUMENT_TYPE, GRAPHQL_FILE_FORMAT } from '../src'
import type { FileFormat } from '../src'
import { buildSchema } from 'graphql'
import { loadFileAsString } from './helpers'
import { parseGraphQLDocument } from '../src/apitypes/graphql/graphql.document'

describe('Crop raw graphql document to raw single operation document tests', () => {
  let graphql: string

  beforeAll(async () => {
    graphql = await loadFileAsString('test/projects/', 'graphql/operations', 'all-operation-kinds.gql') as string
  })

  test('should crop to a single query and include referenced types', () => {
    const result = cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument(
      graphql,
      'queries',
      'listPets',
    )

    const schema = buildSchema(result)
    const queryType = schema.getQueryType()
    expect(queryType).toBeDefined()

    const queryFields = queryType!.getFields()
    expect(Object.keys(queryFields)).toEqual(['listPets'])
    expect(queryFields['listPets']).toBeDefined()

    expect(schema.getType('Pet')).toBeDefined()
    expect(schema.getType('Category')).toBeDefined()

    expect(schema.getType('User')).toBeUndefined()
    expect(schema.getType('AvailabilityCheckRequest')).toBeUndefined()
    expect(schema.getType('AvailabilityCheckResult')).toBeUndefined()
    expect(schema.getMutationType()).toBeUndefined()
  })

  test('should crop to a query that references only leaf types', () => {
    const result = cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument(
      graphql,
      'queries',
      'listUsers',
    )

    const schema = buildSchema(result)
    const queryFields = schema.getQueryType()!.getFields()
    expect(Object.keys(queryFields)).toEqual(['listUsers'])

    expect(schema.getType('User')).toBeDefined()

    expect(schema.getType('Pet')).toBeUndefined()
    expect(schema.getType('Category')).toBeUndefined()
  })

  test('should crop to a mutation', () => {
    const result = cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument(
      graphql,
      'mutations',
      'petAvailabilityCheck',
    )

    const schema = buildSchema(result)
    expect(schema.getQueryType()).toBeUndefined()

    const mutationType = schema.getMutationType()
    expect(mutationType).toBeDefined()
    const mutationFields = mutationType!.getFields()
    expect(Object.keys(mutationFields)).toEqual(['petAvailabilityCheck'])

    expect(schema.getType('AvailabilityCheckRequest')).toBeDefined()
    expect(schema.getType('AvailabilityCheckResult')).toBeDefined()

    expect(schema.getType('Pet')).toBeUndefined()
    expect(schema.getType('User')).toBeUndefined()
  })

  test('should crop to a subscription', () => {
    const result = cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument(
      graphql,
      'subscriptions',
      'onPetAdded',
    )

    const schema = buildSchema(result)
    expect(schema.getQueryType()).toBeUndefined()
    expect(schema.getMutationType()).toBeUndefined()

    const subscriptionType = schema.getSubscriptionType()
    expect(subscriptionType).toBeDefined()
    expect(Object.keys(subscriptionType!.getFields())).toEqual(['onPetAdded'])

    expect(schema.getType('Pet')).toBeDefined()
    expect(schema.getType('Category')).toBeDefined()
    expect(schema.getType('User')).toBeUndefined()
  })

  test('should include runtime directives from the source', () => {
    const result = cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument(
      graphql,
      'queries',
      'getUser',
    )

    const schema = buildSchema(result)
    const queryFields = schema.getQueryType()!.getFields()
    expect(Object.keys(queryFields)).toEqual(['getUser'])

    expect(schema.getType('User')).toBeDefined()
    expect(schema.getType('Pet')).toBeUndefined()

    expect(schema.getDirective('deprecated')).toBeDefined()
  })

  test('should handle schema with no components', () => {
    const simpleSchema = `
      type Query {
        hello: String
        world: String
      }
    `
    const result = cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument(
      simpleSchema,
      'queries',
      'hello',
    )

    const schema = buildSchema(result)
    const queryFields = schema.getQueryType()!.getFields()
    expect(Object.keys(queryFields)).toEqual(['hello'])
  })
})

/**
 * A published GraphQL document is stored as SDL today, so the introspection and graphapi branches are not
 * reachable through a publish. They exist for the day the real source document is persisted instead, and
 * these cases keep them honest.
 */
describe('Parse a stored GraphQL document by its persisted type and format', () => {
  const SDL = 'type Query { book: String }'
  const GRAPHAPI = JSON.stringify({ graphapi: '0.0.1', queries: { book: { output: { typeDef: { type: { kind: 'string' } } } } } })

  test.each([
    ['SDL', SDL, GRAPHQL_DOCUMENT_TYPE.SCHEMA, GRAPHQL_FILE_FORMAT.GRAPHQL],
    ['SDL under the gql extension', SDL, GRAPHQL_DOCUMENT_TYPE.SCHEMA, GRAPHQL_FILE_FORMAT.GQL],
    ['a GraphAPI document', GRAPHAPI, GRAPHQL_DOCUMENT_TYPE.GRAPHAPI, GRAPHQL_FILE_FORMAT.JSON],
  ])('should read %s', (_, source, type, format) => {
    const schema = parseGraphQLDocument(source, type, format)

    expect(Object.keys(schema.queries ?? {})).toEqual(['book'])
  })

  test('should read an introspection response', async () => {
    const introspection = await loadFileAsString('test/projects/', 'graphql-changes/introspection', 'before.json') as string

    const schema = parseGraphQLDocument(introspection, GRAPHQL_DOCUMENT_TYPE.INTROSPECTION, GRAPHQL_FILE_FORMAT.JSON)

    expect(Object.keys(schema.queries ?? {})).toEqual(['book'])
  })

  test.each([
    ['a format it cannot read', SDL, GRAPHQL_DOCUMENT_TYPE.SCHEMA, 'md', 'Unsupported format "md" for a GraphQL document'],
    ['an introspection document that is not an object', '42', GRAPHQL_DOCUMENT_TYPE.INTROSPECTION, GRAPHQL_FILE_FORMAT.JSON, 'A GraphQL introspection document must be an object'],
  ])('should reject %s', (_, source, type, format, message) => {
    expect(() => parseGraphQLDocument(source, type, format as FileFormat)).toThrow(message)
  })
})

