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

import { describe, expect, test } from '@jest/globals'
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { createOperationSpec } from '../src/apitypes/graphql/graphql.operation'
import { calculateGraphqlOperationId, normalizeGraphQL, parseGraphQLSource } from '../src/utils'
import { loadFileAsString } from './helpers'

const SCHEMA_SIMPLE = `
type Query {
  hello: String
  world: Int
}
`

function parseAndNormalize(sdl: string): { source: GraphApiSchema; normalized: GraphApiSchema } {
  const source = parseGraphQLSource(sdl)
  const normalized = normalizeGraphQL(source)
  return { source, normalized }
}

describe('GraphQL create operation spec', () => {
  let graphql: string

  beforeAll(async () => {
    graphql = await loadFileAsString('test/projects/', 'graphql/operations', 'all-operation-kinds.gql') as string
  })

  describe('Error handling', () => {
    test('should throw when operationsId array is empty', () => {
      const { source, normalized } = parseAndNormalize(SCHEMA_SIMPLE)

      expect(() =>
        createOperationSpec(source, normalized, []),
      ).toThrow('No operations provided')
    })

    test('should throw when requested operation is not found', () => {
      const { source, normalized } = parseAndNormalize(SCHEMA_SIMPLE)

      expect(() =>
        createOperationSpec(source, normalized, ['query-nonExistent']),
      ).toThrow('Operations not found in document: query-nonExistent')
    })

    test('should throw listing all missing operations', () => {
      const { source, normalized } = parseAndNormalize(SCHEMA_SIMPLE)

      expect(() =>
        createOperationSpec(source, normalized, [
          'query-nonExistent1',
          'query-nonExistent2',
        ]),
      ).toThrow(
        'Operations not found in document: query-nonExistent1, query-nonExistent2',
      )
    })
  })

  describe('Single query extraction', () => {
    test('should extract a single query operation', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      const opId = calculateGraphqlOperationId('query', 'listPets')

      const result = createOperationSpec(source, normalized, [opId])

      expect(result.graphapi).toBeDefined()
      expect(result.queries).toBeDefined()
      expect(Object.keys(result.queries!)).toEqual(['listPets'])
      expect(result.mutations).toBeUndefined()
      expect(result.subscriptions).toBeUndefined()
    })

    test('should include referenced types (Pet, Category) for listPets', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      const opId = calculateGraphqlOperationId('query', 'listPets')

      const result = createOperationSpec(source, normalized, [opId])

      const components = result.components as Record<string, unknown> | undefined
      expect(components?.objects).toBeDefined()
      if (components?.objects) {
        const objects = components.objects as Record<string, unknown>
        expect(objects['Pet']).toBeDefined()
        expect(objects['Category']).toBeDefined()
        expect(objects['User']).toBeUndefined()
      }
    })
  })

  describe('Single mutation extraction', () => {
    test('should extract a single mutation operation', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      const opId = calculateGraphqlOperationId('mutation', 'petAvailabilityCheck')

      const result = createOperationSpec(source, normalized, [opId])

      expect(result.mutations).toBeDefined()
      expect(Object.keys(result.mutations!)).toEqual(['petAvailabilityCheck'])
      expect(result.queries).toBeUndefined()
      expect(result.subscriptions).toBeUndefined()
    })
  })

  describe('Single subscription extraction', () => {
    test('should extract a single subscription operation', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      const opId = calculateGraphqlOperationId('subscription', 'onPetAdded')

      const result = createOperationSpec(source, normalized, [opId])

      expect(result.subscriptions).toBeDefined()
      expect(Object.keys(result.subscriptions!)).toEqual(['onPetAdded'])
      expect(result.queries).toBeUndefined()
      expect(result.mutations).toBeUndefined()
    })
  })

  describe('Multiple operations extraction', () => {
    test('should extract multiple queries', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      const opIds = [
        calculateGraphqlOperationId('query', 'listPets'),
        calculateGraphqlOperationId('query', 'getPet'),
      ]

      const result = createOperationSpec(source, normalized, opIds)

      expect(result.queries).toBeDefined()
      expect(Object.keys(result.queries!)).toEqual(
        expect.arrayContaining(['listPets', 'getPet']),
      )
      expect(result.mutations).toBeUndefined()
      expect(result.subscriptions).toBeUndefined()
    })

    test('should extract operations across different types', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      const opIds = [
        calculateGraphqlOperationId('query', 'listPets'),
        calculateGraphqlOperationId('mutation', 'petAvailabilityCheck'),
        calculateGraphqlOperationId('subscription', 'onPetAdded'),
      ]

      const result = createOperationSpec(source, normalized, opIds)

      expect(result.queries).toBeDefined()
      expect(Object.keys(result.queries!)).toEqual(['listPets'])
      expect(result.mutations).toBeDefined()
      expect(Object.keys(result.mutations!)).toEqual(['petAvailabilityCheck'])
      expect(result.subscriptions).toBeDefined()
      expect(Object.keys(result.subscriptions!)).toEqual(['onPetAdded'])
    })
  })

  describe('Directive handling', () => {
    test('should always include runtime directives', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      const opId = calculateGraphqlOperationId('query', 'listPets')

      const result = createOperationSpec(source, normalized, [opId])

      const directives = (result.components as Record<string, unknown> | undefined)?.directives as Record<string, unknown> | undefined
      expect(directives?.['cached']).toBeDefined()
    })

    test('should include non-runtime directives only when referenced by operation', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      const opId = calculateGraphqlOperationId('query', 'listPets')

      const result = createOperationSpec(source, normalized, [opId])

      const directives = (result.components as Record<string, unknown> | undefined)?.directives as Record<string, unknown> | undefined
      // @deprecated is a non-runtime directive; listPets does not use it
      expect(directives?.['deprecated']).toBeUndefined()
    })

    test('should include non-runtime directives when used by operation', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      // getUser has @deprecated directive applied
      const opId = calculateGraphqlOperationId('query', 'getUser')

      const result = createOperationSpec(source, normalized, [opId])

      const directives = (result.components as Record<string, unknown> | undefined)?.directives as Record<string, unknown> | undefined
      expect(directives?.['deprecated']).toBeDefined()
    })

    test('should include both runtime and non-runtime directives together', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      // getUser uses @deprecated (non-runtime), @cached is runtime
      const opId = calculateGraphqlOperationId('query', 'getUser')

      const result = createOperationSpec(source, normalized, [opId])

      const directives = (result.components as Record<string, unknown> | undefined)?.directives as Record<string, unknown> | undefined
      expect(directives?.['cached']).toBeDefined()
      expect(directives?.['deprecated']).toBeDefined()
    })
  })

  describe('Operation data isolation', () => {
    test('should not modify source document', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      const originalQueryKeys = Object.keys(source.queries || {})
      const opId = calculateGraphqlOperationId('query', 'listPets')

      createOperationSpec(source, normalized, [opId])

      expect(Object.keys(source.queries || {})).toEqual(originalQueryKeys)
    })

    test('should create a shallow copy of operation data', () => {
      const { source, normalized } = parseAndNormalize(graphql)
      const opId = calculateGraphqlOperationId('query', 'listPets')

      const result = createOperationSpec(source, normalized, [opId])

      expect(result.queries!['listPets']).not.toBe(source.queries!['listPets'])
      expect(result.queries!['listPets']).toEqual(source.queries!['listPets'])
    })
  })
})
