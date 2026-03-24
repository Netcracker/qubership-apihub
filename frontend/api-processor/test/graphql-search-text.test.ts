import { beforeAll, describe, expect, test } from '@jest/globals'
import { buildGraphQLSearchText } from '../src/apitypes/graphql/graphql.utils'
import { calculateGraphqlOperationId } from '../src/utils'
import { Editor, LocalRegistry, parseAndNormalizeGraphQLSchema } from './helpers'

describe('BuildGraphQLSearchText unit tests', () => {
  describe('Searchable content tests', () => {
    test('should include operation name', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema('type Query { getUser: String }')

      const result = buildGraphQLSearchText(schema.queries?.getUser, 'getUser')

      expect(result).toContain('getUser')
    })

    test('should include description', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query {
          """The operation allows get a Payment Method"""
          getPaymentMethodCore: String
        }
      `)

      const result = buildGraphQLSearchText(schema.queries?.getPaymentMethodCore, 'getPaymentMethodCore')

      expect(result).toContain('The operation allows get a Payment Method')
    })

    test('should include argument names and their scalar type names', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query {
          getPaymentMethodCore(id: String, includeDeleteEntities: Boolean): PaymentMethodCore
        }
        type PaymentMethodCore { value: String }
      `)

      const result = buildGraphQLSearchText(schema.queries?.getPaymentMethodCore, 'getPaymentMethodCore')

      expect(result).toContain('id')
      expect(result).toContain('String')
      expect(result).toContain('includeDeleteEntities')
      expect(result).toContain('Boolean')
    })

    test('should include all built-in scalar type names (String, Boolean, Int, Float, ID)', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query {
          test(name: String, active: Boolean, count: Int, rating: Float, uid: ID): String
        }
      `)

      const result = buildGraphQLSearchText(schema.queries?.test, 'test')

      expect(result).toContain('String')
      expect(result).toContain('Boolean')
      expect(result).toContain('Int')
      expect(result).toContain('Float')
      expect(result).toContain('ID')
    })

    test('should include named argument type names (input objects)', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query {
          createPayment(input: PaymentInput): PaymentMethodCore
        }
        input PaymentInput { amount: Int }
        type PaymentMethodCore { id: String }
      `)

      const result = buildGraphQLSearchText(schema.queries?.createPayment, 'createPayment')

      expect(result).toContain('PaymentInput')
    })

    test('should include custom scalar type name in arguments', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        scalar DateTime
        type Query {
          getEvents(since: DateTime): String
        }
      `)

      const result = buildGraphQLSearchText(schema.queries?.getEvents, 'getEvents')

      expect(result).toContain('DateTime')
    })

    test('should include enum type name in arguments', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query {
          getByStatus(status: Status): String
        }
        enum Status { ACTIVE, INACTIVE }
      `)

      const result = buildGraphQLSearchText(schema.queries?.getByStatus, 'getByStatus')

      expect(result).toContain('status')
      expect(result).toContain('Status')
    })

    test('should include return type name for named types', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query { findRecord: SearchResult }
        type SearchResult { id: String }
      `)

      const result = buildGraphQLSearchText(schema.queries?.findRecord, 'findRecord')

      expect(result).toContain('SearchResult')
    })

    test('should include custom scalar return type name', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        scalar DateTime
        type Query { getServerTime: DateTime }
      `)

      const result = buildGraphQLSearchText(schema.queries?.getServerTime, 'getServerTime')

      expect(result).toContain('DateTime')
    })

    test('should include enum return type name', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query { getStatus: Status }
        enum Status { ACTIVE, INACTIVE }
      `)

      const result = buildGraphQLSearchText(schema.queries?.getStatus, 'getStatus')

      expect(result).toContain('Status')
    })

    test('should unwrap list types and include element type name', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query { listPets: [Pet!] }
        type Pet { id: String }
      `)

      const result = buildGraphQLSearchText(schema.queries?.listPets, 'listPets')

      expect(result).toContain('Pet')
    })

    test('should unwrap list argument type and include element type name', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query {
          getByIds(ids: [String!]!): String
        }
      `)

      const result = buildGraphQLSearchText(schema.queries?.getByIds, 'getByIds')

      expect(result).toContain('ids')
      expect(result).toContain('String')
    })

    test('should produce complete search text with all searchable parts', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query {
          """The operation allows get a Payment Method"""
          getPaymentMethodCore(id: String, includeDeleteEntities: Boolean): PaymentMethodCore
        }
        type PaymentMethodCore { id: String, name: String }
      `)

      const result = buildGraphQLSearchText(schema.queries?.getPaymentMethodCore, 'getPaymentMethodCore')

      expect(result).toBe(
        'getPaymentMethodCore The operation allows get a Payment Method id String includeDeleteEntities Boolean PaymentMethodCore',
      )
    })
  })

  describe('Non-searchable content tests', () => {
    test('should not include nested field names from return type', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query { getPet: Pet }
        type Pet { id: String, name: String, category: Category }
        type Category { id: String }
      `)

      const result = buildGraphQLSearchText(schema.queries?.getPet, 'getPet')

      expect(result).toContain('Pet')
      expect(result).not.toContain('name')
      expect(result).not.toContain('category')
    })

    test('should not include nested field names from input type', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query {
          createPayment(input: PaymentInput): String
        }
        input PaymentInput { amount: Int, currency: String }
      `)

      const result = buildGraphQLSearchText(schema.queries?.createPayment, 'createPayment')

      expect(result).toContain('PaymentInput')
      expect(result).not.toContain('amount')
      expect(result).not.toContain('currency')
    })

    test('should not include enum values', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query { getByStatus(status: Status): String }
        enum Status { ACTIVE, INACTIVE }
      `)

      const result = buildGraphQLSearchText(schema.queries?.getByStatus, 'getByStatus')

      expect(result).toContain('Status')
      expect(result).not.toContain('ACTIVE')
      expect(result).not.toContain('INACTIVE')
    })
  })

  describe('Edge cases', () => {
    // Operation has no arguments and no description — only name and return type are present.
    // Ensures the function doesn't break when optional parts are absent.
    test('should handle operation with no args and no description', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query { healthCheck: Status }
        type Status { ok: Boolean }
      `)

      const result = buildGraphQLSearchText(schema.queries?.healthCheck, 'healthCheck')

      expect(result).toBe('healthCheck Status')
    })

    // Return type is a built-in scalar (Boolean), not a named object type.
    // Ensures scalar return types are included in search text and not filtered out.
    test('should handle operation with scalar return type', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema('type Query { healthCheck: Boolean }')

      const result = buildGraphQLSearchText(schema.queries?.healthCheck, 'healthCheck')

      expect(result).toBe('healthCheck Boolean')
    })

    // Operation not found in schema (undefined). Ensures the function doesn't throw
    // NPE/TypeError and gracefully returns only the operation name.
    test('should handle undefined operation', () => {
      const result = buildGraphQLSearchText(undefined, 'missingOp')

      expect(result).toBe('missingOp')
    })

    // No arguments but has a named return type. Ensures no extra separators/spaces
    // appear when the args list is empty and the return type is appended correctly.
    test('should handle operation with empty args returning named type', () => {
      const { normalized: schema } = parseAndNormalizeGraphQLSchema(`
        type Query { countItems: Result }
        type Result { count: Int }
      `)

      const result = buildGraphQLSearchText(schema.queries?.countItems, 'countItems')

      expect(result).toBe('countItems Result')
    })
  })

  describe('E2e tests', () => {
    let pkg: LocalRegistry
    let operations: Map<string, { searchText?: string; search: unknown; operationId: string }>

    beforeAll(async () => {
      pkg = LocalRegistry.openPackage('graphql')
      await pkg.publish('graphql', {
        packageId: 'graphql',
        version: 'v1',
        files: [{ fileId: 'spec.gql' }],
      })

      const editor = await Editor.openProject('graphql', pkg)
      const result = await editor.run({
        packageId: 'graphql',
        version: 'v1',
        files: [{ fileId: 'spec.gql' }],
      })
      operations = result.operations as typeof operations
    })

    test('should set search config with useOperationDataAsSearchText=false on all operations', () => {
      for (const op of Array.from(operations.values())) {
        expect(op.search).toEqual({
          useOperationDataAsSearchText: false,
          searchTextFilePath: `search/${op.operationId}.txt`,
        })
      }
    })

    test('listPets: should contain operation name, description, arg names, and scalar type names', () => {
      const operation = operations.get(calculateGraphqlOperationId('query', 'listPets'))
      expect(operation).toBeDefined()
      expect(operation!.searchText).toContain('listPets')
      expect(operation!.searchText).toContain('Get list of Pets')
      expect(operation!.searchText).toContain('listId')
      expect(operation!.searchText).toContain('String')
    })

    test('getPet: should contain return type name and arg type name', () => {
      const operation = operations.get(calculateGraphqlOperationId('query', 'getPet'))
      expect(operation).toBeDefined()
      expect(operation!.searchText).toContain('Pet')
      expect(operation!.searchText).toContain('String')
    })

    test('getPet: should NOT contain nested fields of return type', () => {
      const operation = operations.get(calculateGraphqlOperationId('query', 'getPet'))
      expect(operation).toBeDefined()
      expect(operation!.searchText).not.toContain('category')
      expect(operation!.searchText).not.toContain('status')
      expect(operation!.searchText).not.toContain('age')
    })

    test('petAvailabilityCheck: should NOT contain nested fields of input or output types', () => {
      const operation = operations.get(calculateGraphqlOperationId('mutation', 'petAvailabilityCheck'))
      expect(operation).toBeDefined()

      // Searchable
      expect(operation!.searchText).toContain('petAvailabilityCheck')
      expect(operation!.searchText).toContain('Pet availability check')
      expect(operation!.searchText).toContain('input')

      // NOT searchable: nested fields
      expect(operation!.searchText).not.toContain('petId')
      expect(operation!.searchText).not.toContain('availabilityCheckResultMessage')
    })
  })
})
