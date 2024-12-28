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
  })
})
