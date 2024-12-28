import { TEST_DEFAULTS_FLAG, TEST_HASH_FLAG, TEST_SYNTHETIC_ALL_OF_FLAG } from '../helpers/index'
import { denormalize, JSON_SCHEMA_PROPERTY_DEPRECATED, normalize, OriginLeafs, resolveOrigins } from '../../src'
import outOfMemoryCauseTooManyCombinations from '../resources/out-of-memory-cause-too-many-combinations.json'
import bugWithWrongOrigins from '../resources/bug-with-wrong-origins.json'
import bugWithSpearedArray from '../resources/bug-with-speared-array.json'
import { TEST_INLINE_REFS_FLAG, TEST_ORIGINS_FLAG, TEST_ORIGINS_FOR_DEFAULTS, TEST_SYNTHETIC_TITLE_FLAG } from '../helpers'
import { isObject, syncCrawl } from '@netcracker/qubership-apihub-json-crawl'
import 'jest-extended'

describe('Bugs', () => {

  it('out of memory cause too many combinations', () => {
    const result = normalize(outOfMemoryCauseTooManyCombinations, {
      validate: true,
      unify: true,
      liftCombiners: true,
      syntheticTitleFlag: Symbol('sss'),
    })
    expect(result).toMatchObject({ openapi: '3.0.3'/*and many other fields*/ })
  })

  it('reuse dirty empty schema', () => {
    const result = normalize(bugWithWrongOrigins, {
      validate: true,
      unify: true,
      liftCombiners: true,
      originsFlag: TEST_ORIGINS_FLAG,
      allowNotValidSyntheticChanges: true,
      createOriginsForDefaults: () => (TEST_ORIGINS_FOR_DEFAULTS),
    })
    const deprecatedOrigins: OriginLeafs = []
    const cycleGuard: Set<unknown> = new Set()
    syncCrawl(result, ({ key, value }) => {
      if (!isObject(value)) {
        return { done: true }
      }
      if (typeof key === 'symbol') {
        return { done: true }
      }
      if (cycleGuard.has(value)) {
        return { done: true }
      }
      cycleGuard.add(value)
      if (!value[JSON_SCHEMA_PROPERTY_DEPRECATED]) {
        return
      }
      deprecatedOrigins.push(...(resolveOrigins(value, JSON_SCHEMA_PROPERTY_DEPRECATED, TEST_ORIGINS_FLAG) ?? []))
      return
    })
    expect(deprecatedOrigins).not.toIncludeAnyMembers(TEST_ORIGINS_FOR_DEFAULTS)
  })


  it('extra copy when spread ', () => {
    const result = normalize({
      "openapi": "3.0.1",
      "components": {
        "schemas": {
          "Bug": {
            writeOnly: true,
          },
          "Shared": {
            readOnly: true,
            allOf: [
              {
                $ref: "#/components/schemas/Bug"
              }
            ]
          },
          "Splitter": {
            type: "object",
            properties: {
              one: {
                $ref: "#/components/schemas/Shared"
              },
              two: {
                $ref: "#/components/schemas/Shared"
              },
              three: {
                allOf: [
                  {
                    $ref: "#/components/schemas/Shared"
                  }
                ]
              }
            }
          }
        }
      }
    }, {
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
    }) as any
    const expected = {
      "openapi": "3.0.1",
      "components": {
        "schemas": {
          "Bug": {
            writeOnly: true,
          },
          "Shared": {
            title: 'Bug',
            readOnly: true,
            writeOnly: true,
            [TEST_SYNTHETIC_TITLE_FLAG]: true,
          },
          "Splitter": {
            type: "object",
            properties: {
              one: {
                title: 'Bug',
                readOnly: true,
                writeOnly: true,
                [TEST_SYNTHETIC_TITLE_FLAG]: true,
              },
              two: null as any,
              three: null as any
            }
          }
        }
      }
    }
    expected.components.schemas.Splitter.properties.two = expected.components.schemas.Splitter.properties.one
    expected.components.schemas.Splitter.properties.three = expected.components.schemas.Splitter.properties.one
    expect(result).toEqual(expected)
    //this not a bug if it become same instance, but let you know that this test already exists
    expect(result.components.schemas.Shared).not.toBe(result.components.schemas.Splitter.properties.one)
  })

  it('synthetic title make copy', () => {
    const result = normalize({
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/MarketingBundle',
                    },
                  },
                  'application/xml': {
                    schema: {
                      $ref: '#/components/schemas/MarketingBundle',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          MarketingBundle: {
            type: 'object',
            title: 'Market',
            description: 'Bundling descripiton',
          },
        },
      },
    }, {
      allowNotValidSyntheticChanges: true,
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      syntheticAllOfFlag: TEST_SYNTHETIC_ALL_OF_FLAG,
      inlineRefsFlag: TEST_INLINE_REFS_FLAG,
      originsFlag: TEST_ORIGINS_FLAG,
    }) as any

    expect(result.paths['/api/v1/test'].get.responses[200].content['application/xml'].schema).toBe(result.paths['/api/v1/test'].get.responses[200].content['application/json'].schema)
    //this not a bug if it become same instance, but let you know that this test already exists
    expect(result.components.schemas.MarketingBundle).not.toBe(result.paths['/api/v1/test'].get.responses[200].content['application/xml'].schema)
  })

  it('make denormalize inside custom symbols', () => {
    const options = {
      defaultsFlag: TEST_DEFAULTS_FLAG,
      hashFlag: TEST_HASH_FLAG,
      inlineRefsFlag: TEST_INLINE_REFS_FLAG,
      originsFlag: TEST_ORIGINS_FLAG,
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      syntheticAllOfFlag: TEST_SYNTHETIC_ALL_OF_FLAG
    }
    const normalized = normalize({
      openapi: '3.0.3',
      components: {
        schemas: {
          From: {
            $ref: '#/components/schemas/To'
          },
          To: {
            type: 'number'
          }
        }
      }
    }, options) as any
    expect(normalized).toHaveProperty(['components', 'schemas', 'From', TEST_INLINE_REFS_FLAG])
    expect(normalized).toHaveProperty(['components', 'schemas', 'From', TEST_HASH_FLAG])
    const customSymbol = Symbol('custom')
    normalized.components.schemas[customSymbol] = normalized.components.schemas.From
    delete normalized.components.schemas.To
    delete normalized.components.schemas.From
    const result = denormalize(normalized, options)
    expect(result).not.toHaveProperty(['components', 'schemas', customSymbol, TEST_INLINE_REFS_FLAG])
    expect(result).not.toHaveProperty(['components', 'schemas', customSymbol, TEST_HASH_FLAG])
  })

  // todo: inline-refs symbol can't be in schema
  it('schema not have inline-refs symbol', () => {
    const result = normalize({
      openapi: '3.0.3',
      paths: {
        'customer': {
          get: {
            parameters: [
              {
                name: 'param1',
                in: 'query',
                schema: {
                  type: 'TYPE_MESSAGE',
                  format: 'UNKNOWN'
                }
              }
            ]
          }
        }
      }
    }, {
      validate: true,
      liftCombiners: true,
      unify: true,
      allowNotValidSyntheticChanges: true,
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      originsFlag: TEST_ORIGINS_FLAG,
      hashFlag: TEST_HASH_FLAG,
      inlineRefsFlag: TEST_INLINE_REFS_FLAG,
    }) as any
    expect(result.paths['customer'].get.parameters[0].schema).not.toHaveProperty([TEST_INLINE_REFS_FLAG])
  })

  it('speared array', () => {
    const result = normalize(bugWithSpearedArray, {
      validate: true,
      liftCombiners: true,
      unify: true,
      allowNotValidSyntheticChanges: true,
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      originsFlag: TEST_ORIGINS_FLAG,
      hashFlag: TEST_HASH_FLAG,
      inlineRefsFlag: TEST_INLINE_REFS_FLAG,
    }) as any
    expect(result).toHaveProperty(['paths', '/datasets/events', 'get', 'parameters', 'length'], 10) /*1 and 3 index will be missing*/
  })
})
