import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG } from './helper'
import { CompareOptions, DiffType } from '../src/types'
import { apiDiff } from '../src/api'
import { DiffAction, annotation, unclassified } from '../src/core/constants'
import { diffsMatcher } from './helper/matchers'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import base from './helper/resources/openapi-specification-extensions/base.json'

type PathWithExpectedType = {
  path: JsonPath
  expectedType: DiffType
}

const OPTIONS: CompareOptions = {
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  validate: true,
  unify: true,
  liftCombiners: true,
  allowNotValidSyntheticChanges: true,
}

// Helper function to set a value at a specific path in an object
// creates a new object or array if some parts of the path are missing
function setValueAtPath(obj: any, path: JsonPath, value: any): void {
  if (path.length === 0) return

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

// Helper function to prepare before and after specifications
function prepareSpecsForComparison(extensionPath: JsonPath, beforeValue?: any, afterValue?: any): { before: any, after: any } {
  const before = structuredClone(base)
  const after = structuredClone(base)

  setValueAtPath(before, extensionPath, beforeValue)
  setValueAtPath(after, extensionPath, afterValue)

  return { before, after }
}

const serverObjectPaths: PathWithExpectedType[] = [
  { path: ['servers', 0], expectedType: unclassified },
  { path: ['paths', '/somePath', 'servers', 0], expectedType: unclassified },
  { path: ['paths', '/somePath', 'get', 'servers', 0], expectedType: unclassified },
]

const operationObjectPaths: PathWithExpectedType[] = [
  { path: ['paths', '/somePath', 'get'], expectedType: unclassified },
]

const tagObjectPaths: PathWithExpectedType[] = [
  { path: ['tags', 0], expectedType: annotation },
]

const responseObjectPaths: PathWithExpectedType[] = [
  { path: ['components', 'responses', 'someResponse'], expectedType: unclassified },
  { path: ['paths', '/somePath', 'get', 'responses', '200'], expectedType: unclassified },
]

const requestBodyObjectPaths: PathWithExpectedType[] = [
  { path: ['paths', '/somePath', 'get', 'requestBody'], expectedType: unclassified },
  { path: ['components', 'requestBodies', 'someRequestBody'], expectedType: unclassified },
]

const parameterObjectPaths: PathWithExpectedType[] = [
  { path: ['components', 'parameters', 'someParameter'], expectedType: unclassified },
  { path: ['paths', '/somePath', 'parameters', 0], expectedType: unclassified },
  { path: ['paths', '/somePath', 'get', 'parameters', 0], expectedType: unclassified },
]

const contentEncodingHeaderSuffix = ['content', 'application/json', 'encoding', 'someProperty', 'headers', 'someHeader']

const headerObjectPaths: PathWithExpectedType[] = [
  { path: ['components', 'headers', 'someHeader'], expectedType: unclassified },
  { path: ['components', 'responses', 'someResponse', 'headers', 'someHeader'], expectedType: unclassified },
  { path: ['paths', '/somePath', 'get', 'responses', '200', 'headers', 'someHeader'], expectedType: unclassified },
  // 'content' not supported for Parameter Object in classification rules yet
  //...parameterObjectPaths.map(item => ({ path: [...item.path, ...contentEncodingHeaderSuffix], expectedType: unclassified })),
  ...requestBodyObjectPaths.map(item => ({ path: [...item.path, ...contentEncodingHeaderSuffix], expectedType: unclassified })),
  ...responseObjectPaths.map(item => ({ path: [...item.path, ...contentEncodingHeaderSuffix], expectedType: unclassified }))
]

const headerObjectPathsWithRecursionFirstLevel: PathWithExpectedType[] = [
  ...headerObjectPaths,
  // 'content' not supported for Header Object in classification rules yet
  // ...headerObjectPaths.map(item => ({ path: [...item.path, ...contentEncodingHeaderSuffix], expectedType: unclassified }))
]

const mediaTypeObjectPaths: PathWithExpectedType[] = [
  // 'content' not supported for Parameter Object in classification rules yet
  //...parameterObjectPaths.map(item => ({ path: [...item.path, 'content', 'application/json'], expectedType: unclassified })),
  // 'content' not supported for Header Object in classification rules yet
  //...headerObjectPathsWithRecursionFirstLevel.map(item => ({ path: [...item.path, 'content', 'application/json'], expectedType: unclassified })),
  ...requestBodyObjectPaths.map(item => ({ path: [...item.path, 'content', 'application/json'], expectedType: unclassified })),
  ...responseObjectPaths.map(item => ({ path: [...item.path, 'content', 'application/json'], expectedType: unclassified })),
]

const encodingObjectPaths: PathWithExpectedType[] = [
  ...mediaTypeObjectPaths.map(item => ({ path: [...item.path, 'encoding', 'someProperty'], expectedType: unclassified })),
]

const schemaObjectPaths: PathWithExpectedType[] = [
  { path: ['components', 'schemas', 'someSchema'], expectedType: unclassified },
  ...parameterObjectPaths.map(item => ({ path: [...item.path, 'schema'], expectedType: unclassified })),
  ...headerObjectPathsWithRecursionFirstLevel.map(item => ({ path: [...item.path, 'schema'], expectedType: unclassified })),
  ...mediaTypeObjectPaths.map(item => ({ path: [...item.path, 'schema'], expectedType: unclassified })),
]

const schemaInSchemaPathSuffixes: JsonPath[] = [
    ['items'],
    ['properties', 'someProperty'],
    ['allOf', 0],
    ['oneOf', 0],
    ['anyOf', 0],
    ['not'],
    ['definitions', 'someSchema'],
    ['additionalProperties'],
    //['additionalItems'],  // additionalItems not supported (removed) by api-unifier now
    // add addition places for OAS 3.1, like 'patternProperties', $defs, etc.
]

const schemaObjectPathsWithRecursionFirstLevel: PathWithExpectedType[] = [
  ...schemaObjectPaths,
  ...schemaObjectPaths.flatMap(item =>
    schemaInSchemaPathSuffixes.map(suffix => ({ path: [...item.path, ...suffix], expectedType: unclassified }))
  )
]

const externalDocumentationObjectPaths: PathWithExpectedType[] = [
  { path: ['externalDocs'], expectedType: annotation },
  ...operationObjectPaths.map(item => ({ path: [...item.path, 'externalDocs'], expectedType: annotation })),
  ...tagObjectPaths.map(item => ({ path: [...item.path, 'externalDocs'], expectedType: annotation })),
  ...schemaObjectPathsWithRecursionFirstLevel.map(item => ({ path: [...item.path, 'externalDocs'], expectedType: annotation })),
]

const xmlObjectPaths: PathWithExpectedType[] = [
  ...schemaObjectPathsWithRecursionFirstLevel.map(item => ({ path: [...item.path, 'xml'], expectedType: unclassified })),
]

const linkObjectPaths: PathWithExpectedType[] = [
  // Link Object classification rules are not implemented yet
  //{ path: ['components', 'links', 'someLink'], expectedType: unclassified },
  //...responseObjectPaths.map(item => ({ path: [...item.path, 'links', 'someLink'], expectedType: unclassified })),
]

const callbackObjectPaths: PathWithExpectedType[] = [
  // Callback Object classification rules are not implemented yet
  //{ path: ['components', 'callbacks', 'someCallback'], expectedType: unclassified },
  //...operationObjectPaths.map(item => ({ path: [...item.path, 'callbacks', 'someCallback'], expectedType: unclassified })),
]

const pathItemObjectPaths: PathWithExpectedType[] = [
  { path: ['paths', '/somePath'], expectedType: unclassified },
  //{ path: ['components', 'pathItems', 'somePathItem'], expectedType: unclassified }, // support path items in components for OAS 3.1
  ...callbackObjectPaths.map(item => ({ path: [...item.path, 'someExpression'], expectedType: unclassified })),
]

const securitySchemeObjectPaths: PathWithExpectedType[] = [
  { path: ['components', 'securitySchemes', 'oauth2'], expectedType: unclassified },
]

const oAuthFlowsObjectPaths: PathWithExpectedType[] = [
  { path: ['components', 'securitySchemes', 'oauth2', 'flows'], expectedType: unclassified },
]

const oAuthFlowObjectPaths: PathWithExpectedType[] = [
  { path: ['components', 'securitySchemes', 'oauth2', 'flows', 'implicit'], expectedType: unclassified },
  { path: ['components', 'securitySchemes', 'oauth2', 'flows', 'password'], expectedType: unclassified },
  { path: ['components', 'securitySchemes', 'oauth2', 'flows', 'clientCredentials'], expectedType: unclassified },
  { path: ['components', 'securitySchemes', 'oauth2', 'flows', 'authorizationCode'], expectedType: unclassified },
]

const exampleObjectPaths: PathWithExpectedType[] = [
  { path: ['components', 'examples', 'someExample'], expectedType: annotation },
  ...parameterObjectPaths.map(item => ({ path: [...item.path, 'examples', 'someExample'], expectedType: annotation })),
  ...headerObjectPathsWithRecursionFirstLevel.map(item => ({ path: [...item.path, 'examples', 'someExample'], expectedType: annotation })),
  ...mediaTypeObjectPaths.map(item => ({ path: [...item.path, 'examples', 'someExample'], expectedType: annotation })),
]

// Paths where OpenAPI specification extensions can be added
const specificationExtensionObjectPaths: PathWithExpectedType[] = [

  // OpenAPI Object
  { path: [], expectedType: unclassified },

  // Info Object and its nested objects
  { path: ['info'], expectedType: annotation },
  { path: ['info', 'contact'], expectedType: annotation },
  { path: ['info', 'license'], expectedType: annotation },

  // Components Object
  { path: ['components'], expectedType: unclassified },

  // Server Object
  ...serverObjectPaths,

  // Server variables
  ...serverObjectPaths.map(item => ({ path: [...item.path, 'variables', 'someVariable'], expectedType: unclassified })),

  // Paths Object
  { path: ['paths'], expectedType: unclassified },

  // Path Item Object
  ...pathItemObjectPaths,

  // Operation Object
  ...operationObjectPaths,

  // External Documentation Object
  ...externalDocumentationObjectPaths,

  // Parameter Object
  ...parameterObjectPaths,

  // Request Body Object
  ...requestBodyObjectPaths,

  // Media Type Object
  ...mediaTypeObjectPaths,

  // Encoding Object
  ...encodingObjectPaths,

  // Responses Object
  { path: ['paths', '/somePath', 'get', 'responses'], expectedType: unclassified },

  // Response Object
  ...responseObjectPaths,

  // Callback Object
  ...callbackObjectPaths,

  // Example Object
  ...exampleObjectPaths,

  // Link Object
  ...linkObjectPaths,

  //Header Object
  ...headerObjectPathsWithRecursionFirstLevel,

  // Tag Object
  ...tagObjectPaths,

  // Schema Object
  ...schemaObjectPathsWithRecursionFirstLevel,

  // XML Object
  ...xmlObjectPaths,

  // Security Scheme Object
  ...securitySchemeObjectPaths,

  // OAuth Flows Object
  ...oAuthFlowsObjectPaths,

  // OAuth Flow Object
  ...oAuthFlowObjectPaths,
]

// Common extension name used in all tests
const extensionName = 'x-custom-extension'

describe('OpenAPI specification extensions changes classification', () => {

  describe('Template check', () => {
    it('should not detect any changes in a base specification with no extensions', () => {
      const { before, after } = prepareSpecsForComparison([], undefined, undefined)
      const { diffs } = apiDiff(before, after, OPTIONS)
      expect(diffs).toEqual(diffsMatcher([]))
    })
  })

  //const testPaths: PathWithExpectedType[] = [{ path: ['paths'], expectedType: unclassified }] // use for debugging specific case
  //testPaths.forEach(item => {
  specificationExtensionObjectPaths.forEach(item => {
    const pathDescription = item.path.length > 0 ? item.path.join('.') : '[]'
    const fullExtensionPath = [...item.path, extensionName]

    describe(`Extensions in '${pathDescription}'`, () => {

      const expectedType = item.expectedType

      it(`add specification extension with primitive value`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, undefined, 'primitive value')

        const { diffs } = apiDiff(before, after, OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            afterDeclarationPaths: [fullExtensionPath],
            action: DiffAction.add,
            type: expectedType,
            afterValue: 'primitive value',
          })
        ]))
      })

      it(`add specification extension with complex value`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, undefined, { key: 'value' })

        const { diffs } = apiDiff(before, after, OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            afterDeclarationPaths: [fullExtensionPath],
            action: DiffAction.add,
            type: expectedType,
            afterValue: { key: 'value' },
          })
        ]))
      })

      it(`remove specification extension with primitive value`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, 'primitive value', undefined)

        const { diffs } = apiDiff(before, after, OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            beforeDeclarationPaths: [fullExtensionPath],
            action: DiffAction.remove,
            type: expectedType,
            beforeValue: 'primitive value',
          })
        ]))
      })

      it(`remove specification extension with complex value`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, { key: 'value' }, undefined)

        const { diffs } = apiDiff(before, after, OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            beforeDeclarationPaths: [fullExtensionPath],
            action: DiffAction.remove,
            type: expectedType,
            beforeValue: { key: 'value' },
          })
        ]))
      })

      it(`change specification extension with primitive value`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, 'original value', 'changed value')

        const { diffs } = apiDiff(before, after, OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            beforeDeclarationPaths: [fullExtensionPath],
            afterDeclarationPaths: [fullExtensionPath],
            action: DiffAction.replace,
            type: expectedType,
            beforeValue: 'original value',
            afterValue: 'changed value',
          })
        ]))
      })

      it(`add property to complex value of specification extension`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, { nested: {} }, { nested: {property: 'value'} })

        const { diffs } = apiDiff(before, after, OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            afterDeclarationPaths: [[...fullExtensionPath, 'nested', 'property']],
            action: DiffAction.add,
            type: expectedType,
            afterValue: 'value',
          })
        ]))
      })

      it(`delete property from complex value of specification extension`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, { nested: {property: 'value'} }, { nested: {} })

        const { diffs } = apiDiff(before, after, OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            beforeDeclarationPaths: [[...fullExtensionPath, 'nested', 'property']],
            action: DiffAction.remove,
            type: expectedType,
            beforeValue: 'value',
          })
        ]))
      })

      it(`change property in complex value of specification extension`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, { nested: {property: 'original'} }, { nested: {property: 'modified'} })

        const { diffs } = apiDiff(before, after, OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            beforeDeclarationPaths: [[...fullExtensionPath, 'nested', 'property']],
            afterDeclarationPaths: [[...fullExtensionPath, 'nested', 'property']],
            action: DiffAction.replace,
            type: expectedType,
            beforeValue: 'original',
            afterValue: 'modified',
          })
        ]))
      })

      it(`change specification extension from simple to complex value`, () => {
        const { before, after } = prepareSpecsForComparison (fullExtensionPath, 'simple value', { nested: 'modified' })

        const { diffs } = apiDiff(before, after, OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            beforeDeclarationPaths: [fullExtensionPath],
            afterDeclarationPaths: [fullExtensionPath],
            action: DiffAction.replace,
            type: expectedType,
            beforeValue: 'simple value',
            afterValue: { nested: 'modified' },
          })
        ]))
      })
    })
  })
})
