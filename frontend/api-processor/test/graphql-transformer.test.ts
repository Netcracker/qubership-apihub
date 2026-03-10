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

import { cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument } from '../src'
import { buildSchema } from 'graphql'
import { loadFileAsString } from './helpers'

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
