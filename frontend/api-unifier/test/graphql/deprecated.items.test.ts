import { buildGraphApi, TEST_ORIGINS_FLAG } from '../helpers'
import { calculateDeprecatedItems, normalize } from '../../src'

describe('test directives', () => {

  it('deprecated directive on enum', () => {
    const graphql = `
        enum Fruit {
          """Round red vegetable earlier considered as fruit"""
          TOMATO @deprecated(reason: "Decided that it's a vegetable")
        }
      `
    const graphApi = buildGraphApi(graphql)
    const normalizedResult = normalize(graphApi, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedResult, TEST_ORIGINS_FLAG)

    expect(deprecatedItems.length).toBe(1)
    expect(deprecatedItems[0].deprecatedReason).toEqual('Decided that it\'s a vegetable')
    expect(deprecatedItems[0].description).toEqual('[Deprecated] value \'TOMATO\' of enum \'Fruit\'')
  })

  it('deprecated directive on field definition', () => {
    const graphql = `
        type ExampleType {
         newField: String
         oldField: String @deprecated(reason: "Use \`newField\`.")
       }
      `
    const graphApi = buildGraphApi(graphql)
    const normalizedResult = normalize(graphApi, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedResult, TEST_ORIGINS_FLAG)

    expect(deprecatedItems.length).toBe(1)
    expect(deprecatedItems[0].deprecatedReason).toEqual('Use `newField`.')
    expect(deprecatedItems[0].description).toEqual('[Deprecated] field \'oldField\' of object \'ExampleType\'')
  })

  it('deprecated directive on interface field', () => {
    const graphql = `
        interface ExampleInterface {
          newField: String
          oldField: String @deprecated(reason: "Use \`newField\` instead.")
        }
      `
    const graphApi = buildGraphApi(graphql)
    const normalizedResult = normalize(graphApi, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedResult, TEST_ORIGINS_FLAG)

    expect(deprecatedItems.length).toBe(1)
    expect(deprecatedItems[0].deprecatedReason).toEqual('Use `newField` instead.')
    expect(deprecatedItems[0].description).toEqual('[Deprecated] field \'oldField\' of interface \'ExampleInterface\'')
  })

  it('deprecated directive on mutation', () => {
    const graphql = `
        type Mutation {
          newCreateUser(input: UserInput!): User!
          oldCreateUser(input: UserInput!): User! @deprecated(reason: "Use \`newCreateUser\` instead.")
        }
        type User {
          id: ID!
          name: String!
        }
        input UserInput {
          name: String!
        }
      `
    const graphApi = buildGraphApi(graphql)
    const normalizedResult = normalize(graphApi, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedResult, TEST_ORIGINS_FLAG)

    expect(deprecatedItems.length).toBe(1)
    expect(deprecatedItems[0].deprecatedReason).toEqual('Use `newCreateUser` instead.')
    expect(deprecatedItems[0].description).toEqual('[Deprecated] mutation \'oldCreateUser\'')
  })

  it('deprecated directive on query', () => {
    const graphql = `
        type Query {
          newGetUser(id: ID!): User
          oldGetUser(id: ID!): User @deprecated(reason: "Use \`newGetUser\` instead.")
        }
        type User {
          id: ID!
          name: String!
        }
      `
    const graphApi = buildGraphApi(graphql)
    const normalizedResult = normalize(graphApi, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedResult, TEST_ORIGINS_FLAG)

    expect(deprecatedItems.length).toBe(1)
    expect(deprecatedItems[0].deprecatedReason).toEqual('Use `newGetUser` instead.')
    expect(deprecatedItems[0].description).toEqual('[Deprecated] query \'oldGetUser\'')
  })

  it('deprecated directive on subscription', () => {
    const graphql = `
        type Subscription {
          newUserUpdates: User!
          oldUserUpdates: User! @deprecated(reason: "Use \`newUserUpdates\` instead.")
        }
        type User {
          id: ID!
          name: String!
        }
      `
    const graphApi = buildGraphApi(graphql)
    const normalizedResult = normalize(graphApi, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedResult, TEST_ORIGINS_FLAG)

    expect(deprecatedItems.length).toBe(1)
    expect(deprecatedItems[0].deprecatedReason).toEqual('Use `newUserUpdates` instead.')
    expect(deprecatedItems[0].description).toEqual('[Deprecated] subscription \'oldUserUpdates\'')
  })
})
