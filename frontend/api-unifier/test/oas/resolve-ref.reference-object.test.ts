import {
  normalize,
  OPEN_API_PROPERTY_DESCRIPTION,
  OPEN_API_PROPERTY_SUMMARY,
  RefErrorType,
  RefErrorTypes,
} from '../../src'
import 'jest-extended'
import { defineOriginsAndResolveRef } from '../../src/define-origins-and-resolve-ref'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { TEST_ORIGINS_FLAG } from '../helpers'
import defineResponseViaReferenceObjectChain
  from '../resources/reference-object/define-response-via-reference-object-chain.json'
import secondLevelObjectSameWhenOverridingDescriptionForResponse
  from '../resources/reference-object/second-level-object-are-the-same-when-overriding-for-response.json'
import notHangUpWhenProcessingCycledChainOfForResponse
  from '../resources/reference-object/not-hang-up-when-processing-cycled-chain-for-response.json'
import notHangUpWhenProcessingResponseWhichPointsToItself
  from '../resources/reference-object/not-hang-up-when-processing-for-response-which-points-to-itself.json'
import { ReferenceObjectResolverOverrideField } from '../../src/references/ref-resolver'

const OPTIONS = { resolveRef: true }

describe('OAS Reference Object', () => {

  describe('Reference Object general behaviour', () => {
    it('second-level object are the same when overriding description for response via reference object', () => {

      const result = defineOriginsAndResolveRef(secondLevelObjectSameWhenOverridingDescriptionForResponse) as any
      expect(result.paths['/test'].get.responses['200'].content).toBe(result.components.responses.SuccessResponse.content)
    })

    it('reference object pointing to non-existing component is ignored for the response', (done) => {
      const onRefResolveError = (message: string, path: JsonPath, ref: string, errorType: RefErrorType) => {
        expect(ref).toBe('#/components/requests/SuccessRequest')
        expect(errorType).toBe(RefErrorTypes.REF_NOT_FOUND)
        done()
      }

      const source = {
        openapi: '3.1.0',
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  $ref: '#/components/requests/SuccessRequest',
                },
              },
            },
          },
        },
      }

      const result = defineOriginsAndResolveRef(source, { onRefResolveError }) as any
      expect(result).toEqual(source)
    })

    it('could define response via reference object chain', () => {
      const result = defineOriginsAndResolveRef(defineResponseViaReferenceObjectChain) as any
      expect(result.paths['/test'].get.responses['200']).toBe(result.components.responses.SuccessResponse2)
    })

    it('should not hang up when processing reference object for response which points to itself', (done) => {
      const onRefResolveError = (message: string, path: JsonPath, ref: string, errorType: RefErrorType) => {
        expect(ref).toBe('#/components/responses/SuccessResponse')
        expect(errorType).toBe(RefErrorTypes.REF_NOT_FOUND)
        done()
      }

      const result = defineOriginsAndResolveRef(notHangUpWhenProcessingResponseWhichPointsToItself, { onRefResolveError }) as any
      expect(result.paths['/test'].get.responses['200'].$ref).toBe('#/components/responses/SuccessResponse')
    })

    it('should not hang up when processing cycled chain of reference objects for response', () => {
      let errorCount = 0
      const result = defineOriginsAndResolveRef(notHangUpWhenProcessingCycledChainOfForResponse, { onRefResolveError: () => errorCount++ }) as any
      expect(errorCount).toBe(2)
      expect(result.paths['/test'].get.responses['200'].$ref).toBe('#/components/responses/SuccessResponse')
    })
  })

  const VALUE_OVERRIDEN = 'overriden value'
  const VALUE_BASE = 'base value'
  const VALUE_SECOND = 'second value'
  const APPLICATION_JSON = 'application/json'

  type DataValue = Record<string, any> | string
  type AdditionalValuePair = [DataValue, DataValue]

  /** An additional values to add next to the Ref fields. This values should not be overridden. */
  interface AdditionalValue {
    path: JsonPath
    values: AdditionalValuePair
  }

  interface ReferenceObjectRuleTestData {
    refPaths: JsonPath[]
    componentsPath: JsonPath
    componentObject: Record<string, any>
    overridableFields: ReferenceObjectResolverOverrideField[]
    /**
     * Additional values that can be added to the object, including both simple key-value pairs
     * and more complex structures.
     *
     * Example of a simple case:
     * - 'name': 'someName'
     *
     * Example of a more complex case:
     * - 'content': {'application/xml': ... }
     *
     * This array allows values to be added at a specified path
     */
    additionalValues: AdditionalValue[]
  }

  const objectSchemaType = {
    type: 'object',
  }

  const integerSchemaType = {
    type: 'integer',
  }

  const schemaObjectContent = {
    schema: objectSchemaType,
  }

  const applicationXmlContent = {
    'application/xml': schemaObjectContent,
  }

  const applicationJsonContent = {
    APPLICATION_JSON: schemaObjectContent,
  }

  const nameValuePair: AdditionalValue = {
    path: ['name'],
    values: [
      'someName',
      'overridedName',
    ],
  }

  const operationIdValuePair: AdditionalValue = {
    path: ['operationId'],
    values: [
      'getUserAddress',
      'getUserAddressByUUID',
    ],
  }

  const schemaValuePair: AdditionalValue = {
    path: ['schema'],
    values: [
      objectSchemaType,
      integerSchemaType,
    ],
  }

  const contentValuePair: AdditionalValue = {
    path: ['content'],
    values: [
      applicationXmlContent,
      applicationJsonContent,
    ],
  }

  const parametersValuePair: AdditionalValue = {
    path: ['parameters'],
    values: [
      [
        {
          name: 'someParameter',
          in: 'query',
        },
      ],
      [
        {
          name: 'overridedParameter',
          in: 'query',
        }
      ],
    ],
  }

  const valuePair: AdditionalValue = {
    path: ['value'],
    values: [
      { "bar": "baz" },
      { "foo": "bar" },
    ],
  }
  
  const responseObjectPaths: JsonPath[] = [
    ['components', 'responses', 'someResponse'],
    ['paths', '/somePath', 'get', 'responses', '200'],
  ]

  const requestBodyObjectPaths: JsonPath[] = [
    ['paths', '/somePath', 'get', 'requestBody'],
    ['components', 'requestBodies', 'someRequestBody'],
  ]

  const parameterObjectPaths: JsonPath[] = [
    ['components', 'parameters', 'someParameter'],
    ['paths', '/somePath', 'parameters', 0],
    ['paths', '/somePath', 'get', 'parameters', 0],
  ]

  const contentEncodingHeaderSuffix = ['content', APPLICATION_JSON, 'encoding', 'someProperty', 'headers', 'someHeader']

  const headerObjectPaths: JsonPath[] = [
    ['components', 'headers', 'someHeader'],
    ['components', 'responses', 'someResponse', 'headers', 'someHeader'],
    ['paths', '/somePath', 'get', 'responses', '200', 'headers', 'someHeader'],
    ...parameterObjectPaths.map(path => [...path, ...contentEncodingHeaderSuffix]),
    ...requestBodyObjectPaths.map(path => [...path, ...contentEncodingHeaderSuffix]),
    ...responseObjectPaths.map(path => [...path, ...contentEncodingHeaderSuffix]),
  ]

  const headerObjectPathsWithRecursionFirstLevel: JsonPath[] = [
    ...headerObjectPaths,
    ...headerObjectPaths.map(path => [...path, ...contentEncodingHeaderSuffix]),
  ]

  const mediaTypeObjectPaths: JsonPath[] = [
    ...parameterObjectPaths.map(path => [...path, 'content', APPLICATION_JSON]),
    ...headerObjectPathsWithRecursionFirstLevel.map(path => [...path, 'content', APPLICATION_JSON]),
    ...requestBodyObjectPaths.map(path => [...path, 'content', APPLICATION_JSON]),
    ...responseObjectPaths.map(path => [...path, 'content', APPLICATION_JSON]),
  ]

  const linkObjectPaths: JsonPath[] = [
    // Link Object unification rules are not implemented yet
    //['components', 'links', 'someLink'],
    //...responseObjectPaths.map(path => [...path, 'links', 'someLink']),
  ]

  const callbackObjectPaths: JsonPath[] = [
    // Callback Object unification rules are not implemented yet
    //['components', 'callbacks', 'someCallback'],
    //...operationObjectPaths.map(path => [...path, 'callbacks', 'someCallback']),
  ]

  const pathItemObjectPaths: JsonPath[] = [
    ['paths', '/somePath'],
    ...callbackObjectPaths.map(path => [...path, 'someExpression']),
    // ['components', 'pathItems', 'somePathItem'], // support path items in components for OAS 3.1
  ]

  const securitySchemeObjectPaths: JsonPath[] = [
    ['components', 'securitySchemes', 'oauth2'],
  ]

  const exampleObjectPaths: JsonPath[] = [
    ['components', 'examples', 'someExample'],
    ...parameterObjectPaths.map(path => [...path, 'examples', 'someExample']),
    ...headerObjectPathsWithRecursionFirstLevel.map(path => [...path, 'examples', 'someExample']),
    ...mediaTypeObjectPaths.map(path => [...path, 'examples', 'someExample']),
  ]

  const parameterObjectTestData: ReferenceObjectRuleTestData = {
    refPaths: parameterObjectPaths,
    componentsPath: ['components', 'parameters', 'componentsParameter'],
    componentObject: {
      name: 'someParameter',
      in: 'query',
      description: VALUE_BASE,
    },
    overridableFields: [OPEN_API_PROPERTY_DESCRIPTION],
    additionalValues: [
      nameValuePair,
      schemaValuePair
    ],
  }

  const requestBodyObjectTestData: ReferenceObjectRuleTestData = {
    refPaths: requestBodyObjectPaths,
    componentsPath: ['components', 'requestBodies', 'componentsRequestBody'],
    componentObject: {
      content: applicationJsonContent,
      description: VALUE_BASE,
    },
    overridableFields: [OPEN_API_PROPERTY_DESCRIPTION],
    additionalValues: [contentValuePair],
  }

  const responseObjectTestData: ReferenceObjectRuleTestData = {
    refPaths: responseObjectPaths,
    componentsPath: ['components', 'responses', 'componentsResponse'],
    componentObject: {      
      description: VALUE_BASE,
    },
    overridableFields: [OPEN_API_PROPERTY_DESCRIPTION],
    additionalValues: [contentValuePair],
  }

  const headerObjectTestData: ReferenceObjectRuleTestData = {
    refPaths: headerObjectPaths,
    componentsPath: ['components', 'headers', 'componentsHeader'],
    componentObject: {
      description: VALUE_BASE,
    },
    overridableFields: [OPEN_API_PROPERTY_DESCRIPTION],
    additionalValues: [schemaValuePair],
  }

  const linkObjectTestData: ReferenceObjectRuleTestData = {
    refPaths: linkObjectPaths,
    componentsPath: ['components', 'links', 'componentsLink'],
    componentObject: {
      description: VALUE_BASE,
    },
    overridableFields: [OPEN_API_PROPERTY_DESCRIPTION],
    additionalValues: [operationIdValuePair],
  }

  const securitySchemeObjectTestData: ReferenceObjectRuleTestData = {
    refPaths: securitySchemeObjectPaths,
    componentsPath: ['components', 'securitySchemes', 'componentsOauth2'],
    componentObject: {
      description: VALUE_BASE,
    },
    overridableFields: [OPEN_API_PROPERTY_DESCRIPTION],
    additionalValues: [nameValuePair],
  }

  const callbackObjectTestData: ReferenceObjectRuleTestData = {
    refPaths: callbackObjectPaths,
    componentsPath: ['components', 'callbacks', 'componentsCallback'],
    componentObject: {
    },
    overridableFields: [OPEN_API_PROPERTY_DESCRIPTION],
    additionalValues: [],
  }

  const pathItemObjectTestData: ReferenceObjectRuleTestData = {
    refPaths: pathItemObjectPaths,
    componentsPath: ['components', 'pathItems', 'componentsPathItem'],
    componentObject: {
      description: VALUE_BASE,
      summary: VALUE_BASE,
    },
    overridableFields: [OPEN_API_PROPERTY_DESCRIPTION, OPEN_API_PROPERTY_SUMMARY],
    additionalValues: [parametersValuePair],
  }

  const exampleObjectTestData: ReferenceObjectRuleTestData = {
    refPaths: exampleObjectPaths,
    componentsPath: ['components', 'examples', 'componentsExample'],
    componentObject: {
      description: VALUE_BASE,
      summary: VALUE_BASE,
    },
    overridableFields: [OPEN_API_PROPERTY_DESCRIPTION, OPEN_API_PROPERTY_SUMMARY],
    additionalValues: [valuePair],
  }

  const referenceObjectRuleTestData: ReferenceObjectRuleTestData[] = [
    parameterObjectTestData,
    requestBodyObjectTestData,
    responseObjectTestData,
    headerObjectTestData,
    linkObjectTestData,
    securitySchemeObjectTestData,
    //callbackObjectTestData,
    //pathItemObjectTestData,
    exampleObjectTestData,
  ]

  function setValueAtPath(obj: any, path: JsonPath, value: any): void {
    if (path.length === 0) { return }

    let current = obj
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]
      const nextKey = path[i + 1]
      if (!(key in current)) {
        current[key] = typeof nextKey === 'number' ? [] : {}
      }
      current = current[key]
    }
    if (value !== undefined) {
      current[path[path.length - 1]] = value
    }
  }

  const getValueByPath = (value: any, path: JsonPath) => path.reduce((data, key) => data[key], value)

  const createRef = (path: JsonPath) => `#/${path.join('/')}`

  const createBase = (version: string, refPath: JsonPath, componentsPath: JsonPath, componentObject: any) => {
    const base = { openapi: version }
    setValueAtPath(base, refPath, { $ref: createRef(componentsPath) })
    setValueAtPath(base, componentsPath, componentObject)
    return base
  }

  const checkChainReferenceObjects = (title: string, baseSpec: any, refPath: JsonPath, componentsPath: JsonPath, componentObject: any, property: ReferenceObjectResolverOverrideField, allowOverride: boolean) => {
    const name = `intermediate${title}`
    const intermediateRefPath = [...componentsPath.slice(0, componentsPath.length - 1), name]
    setValueAtPath(baseSpec, componentsPath, componentObject)
    setValueAtPath(baseSpec, intermediateRefPath, { $ref: createRef(componentsPath), [property]: VALUE_SECOND })
    setValueAtPath(baseSpec, refPath, { $ref: createRef(intermediateRefPath), [property]: VALUE_OVERRIDEN })

    const result = normalize(baseSpec, OPTIONS) as any

    const expectation = expect(result)

    const refPropertyValue = getValueByPath(result, [...refPath, property])
    const intermediateRefPropertyValue = getValueByPath(result, [...intermediateRefPath, property])
    const componentsPropertyValue = getValueByPath(result, [...componentsPath, property])
    
    if (allowOverride) {
      expect(refPropertyValue).toBe(VALUE_OVERRIDEN)
      expect(intermediateRefPropertyValue).toBe(VALUE_SECOND)
    } else {
      expect(refPropertyValue).toBe(componentsPropertyValue)
      expect(intermediateRefPropertyValue).toBe(componentsPropertyValue)
    }
  }

  const oasSpecificationVersions = ['3.0.0', '3.1.0']

  oasSpecificationVersions.forEach(version => {
    describe(`Reference object rules for OAS ${version}`, () => {
      referenceObjectRuleTestData.forEach(({ refPaths, componentsPath, componentObject, overridableFields, additionalValues }) => {
        if (version === '3.0.0') {
          overridableFields = []
        }
        const allowDescriptionOverride = overridableFields.includes(OPEN_API_PROPERTY_DESCRIPTION)
        const allowSummaryOverride = overridableFields.includes(OPEN_API_PROPERTY_SUMMARY)

        refPaths.forEach(refPath => {
          const title = refPath.at(-2) as string
          const pathDescription = refPath.length > 0 ? refPath.join('.') : '[]'

          describe(`Rules for ${title}`, () => {
            describe(`Path: ${pathDescription}`, () => {
              let baseSpec: any

              beforeEach(() => {
                baseSpec = createBase(version, refPath, componentsPath, componentObject)
              })

              it(`could define data via reference object`, () => {
                const result = normalize(baseSpec, OPTIONS) as any

                const refValue = getValueByPath(result, refPath)
                const componentsValue = getValueByPath(result, componentsPath)
                expect(refValue).toBe(componentsValue)
              })

              it(`could ${allowDescriptionOverride ? '' : 'not '}override description via reference object`, () => {
                setValueAtPath(baseSpec, [...refPath, OPEN_API_PROPERTY_DESCRIPTION], VALUE_OVERRIDEN)

                const result = normalize(baseSpec, OPTIONS) as any

                const componentsDescription = getValueByPath(result, [...componentsPath, OPEN_API_PROPERTY_DESCRIPTION])
                const refDescription = getValueByPath(result, [...refPath, OPEN_API_PROPERTY_DESCRIPTION])

                allowDescriptionOverride
                  ? expect(refDescription).toBe(VALUE_OVERRIDEN)
                  : expect(refDescription).toBe(componentsDescription)
              })

              it(`could ${allowSummaryOverride ? '' : 'not '}override summary via reference object`, () => {
                setValueAtPath(baseSpec, [...refPath, OPEN_API_PROPERTY_SUMMARY], VALUE_OVERRIDEN)

                const result = normalize(baseSpec, OPTIONS) as any

                const componentsSummary = getValueByPath(result, [...componentsPath, OPEN_API_PROPERTY_SUMMARY])
                const refSummary = getValueByPath(result, [...refPath, OPEN_API_PROPERTY_SUMMARY])

                allowSummaryOverride
                  ? expect(refSummary).toBe(VALUE_OVERRIDEN)
                  : expect(refSummary).toBe(componentsSummary)
              })

              it(`description is ${allowDescriptionOverride ? '' : 'not '} overriden on each level of a chain of reference objects`, () => {
                checkChainReferenceObjects(title, baseSpec, refPath, componentsPath, componentObject, OPEN_API_PROPERTY_DESCRIPTION, allowDescriptionOverride)
              })

              it(`summary is ${allowSummaryOverride ? '' : 'not '} overriden on each level of a chain of reference objects`, () => {
                checkChainReferenceObjects(title, baseSpec, refPath, componentsPath, componentObject, OPEN_API_PROPERTY_SUMMARY, allowSummaryOverride)
              })

              it(`properties other than description and summary could not be overriden via reference object`, () => {
                additionalValues.forEach(additionalData => {
                  const path = additionalData.path
                  const values = additionalData.values

                  setValueAtPath(baseSpec, [...componentsPath, ...path], values[0])
                  setValueAtPath(baseSpec, [...refPath, ...path], values[1])
                })

                const result = normalize(baseSpec, OPTIONS) as any

                additionalValues.forEach(additionalData => {
                  const path = additionalData.path

                  const refValueData = getValueByPath(result, [...refPath, ...path])
                  const componentsValueData = getValueByPath(result, [...componentsPath, ...path])
                  expect(refValueData).toBe(componentsValueData)
                })
              })
            })
          })
        })
      })
    })


  describe('OAS 3.1. Reference Object. Validate origins', () => {
    it('origin is calculated correctly for field overriden using reference object', () => {
      const source = {
        openapi: '3.1.0',
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  $ref: '#/components/responses/SuccessResponse',
                  description: 'Overriden description',
                },
              },
            },
          },
        },
      }

      const components = {
        components: {
          responses: {
            SuccessResponse: {
              description: 'Successful response',
              type: 'object',
            },
          },
        },
      }

      const componentsOrigins = {
        components: [{ parent: undefined, value: 'components' }],
        responses: [{ parent: undefined as any, value: 'responses' }],
        SuccessResponse: [{ parent: undefined as any, value: 'SuccessResponse' }],
        description: [{ parent: undefined as any, value: 'description' }],
        type: [{ parent: undefined as any, value: 'type' }],
      }
      componentsOrigins.responses[0].parent = componentsOrigins.components[0]
      componentsOrigins.SuccessResponse[0].parent = componentsOrigins.responses[0]
      componentsOrigins.description[0].parent = componentsOrigins.SuccessResponse[0]
      componentsOrigins.type[0].parent = componentsOrigins.SuccessResponse[0]

      const expected = {
        openapi: '3.1.0',
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  description: 'Overriden description',
                  type: 'object',
                  [TEST_ORIGINS_FLAG]: {
                    description: [{ parent: undefined as any, value: 'description' }],
                    type: [{ parent: undefined as any, value: 'type' }],
                  },
                },
                [TEST_ORIGINS_FLAG]: {
                  '200': [{ parent: undefined as any, value: '200' }],
                },
              },
              [TEST_ORIGINS_FLAG]: {
                responses: [{ parent: undefined as any, value: 'responses' }],
              },
            } as any,
            [TEST_ORIGINS_FLAG]: {
              get: [{ parent: undefined as any, value: 'get' }],
            },
          },
          [TEST_ORIGINS_FLAG]: {
            '/test': [{ parent: undefined as any, value: '/test' }],
          },
        },
        [TEST_ORIGINS_FLAG]: {
          openapi: [{ parent: undefined as any, value: 'openapi' }],
          paths: [{ parent: undefined as any, value: 'paths' }],
        },
      }

      expected.paths[TEST_ORIGINS_FLAG]['/test'][0].parent = expected[TEST_ORIGINS_FLAG].paths[0]
      expected.paths['/test'][TEST_ORIGINS_FLAG].get[0].parent = expected.paths[TEST_ORIGINS_FLAG]['/test'][0]
      expected.paths['/test'].get[TEST_ORIGINS_FLAG].responses[0].parent = expected.paths['/test'][TEST_ORIGINS_FLAG].get[0]
      expected.paths['/test'].get.responses[TEST_ORIGINS_FLAG]['200'][0].parent = expected.paths['/test'].get[TEST_ORIGINS_FLAG].responses[0]
      // type parent from components
      expected.paths['/test'].get.responses['200'][TEST_ORIGINS_FLAG].type[0].parent = componentsOrigins.SuccessResponse[0]
      // description parent from responses
      expected.paths['/test'].get.responses['200'][TEST_ORIGINS_FLAG].description[0].parent = expected.paths['/test'].get.responses[TEST_ORIGINS_FLAG][200][0]

      const result = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG, source: components })
      expect(result).toEqual(expected)
    })
  })
})
})