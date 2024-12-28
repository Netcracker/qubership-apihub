import { compareFiles } from '../../compatibility-suites/utils'
import { SUITE_ID } from '../utils'
import { diffDescriptionMatcher } from '../../helper/matchers'

describe('Schema Object', () => {

  test('Schema Ref', async () => {
    const testId = 'schema-object-schema-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] schema in request body (application/json)'))
  })

  test('Schema Inline', async () => {
    const testId = 'schema-object-schema-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] schema in request body (application/json)'))
  })

  test('Type Ref', async () => {
    const testId = 'schema-object-type-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] type for \'components.schemas.offsetSchema\' in request'))
  })

  test('Type Inline', async () => {
    const testId = 'schema-object-type-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] type for schema in \'components.parameters.offsetParam\''))
  })

  test('Type Inline Inline', async () => {
    const testId = 'schema-object-type-inline-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] type for \'schema.properties.prop1.properties.prop11\' in response \'200\' (application/json)'))
  })

  test('Validator Ref', async () => {
    const testId = 'schema-object-validator-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] multipleOf validator for \'components.schemas.offsetSchema\' in request'))
  })

  test('Validator Inline', async () => {
    const testId = 'schema-object-validator-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] multipleOf validator for schema in \'components.parameters.offsetParam\''))
  })

  test('Validator Inline Inline', async () => {
    const testId = 'schema-object-validator-inline-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] maxLength validator to \'schema.properties.prop1.properties.prop11\' in response \'200\' (application/json)'))
  })

  test('Attribute Ref', async () => {
    const testId = 'schema-object-attribute-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] writeOnly status for \'components.schemas.offsetSchema\' in request'))
  })

  test('Attribute Inline', async () => {
    const testId = 'schema-object-attribute-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] writeOnly status for schema in \'components.parameters.offsetParam\''))
  })

  test('Attribute Inline Inline', async () => {
    const testId = 'schema-object-attribute-inline-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] required status for property \'prop11\' to \'schema.properties.prop1.required\' in response \'200\' (application/json)'))
  })

  test('Required Ref', async () => {
    const testId = 'schema-object-required-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] required status for property \'prop1\' to \'components.schemas.offsetSchema\' in request'))
  })

  test('Required Inline', async () => {
    const testId = 'schema-object-required-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] required status for property \'prop1\' to schema in \'components.parameters.offsetParam\''))
  })

  test('Format Ref', async () => {
    const testId = 'schema-object-format-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] format for \'components.schemas.offsetSchema\' in request'))
  })

  test('Format Inline', async () => {
    const testId = 'schema-object-format-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] format for schema in \'components.parameters.offsetParam\''))
  })

  test('Format Inline Inline', async () => {
    const testId = 'schema-object-format-inline-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] format to \'schema.properties.prop1.properties.prop11\' in response \'200\' (application/json)'))
  })

  test('Default Ref', async () => {
    const testId = 'schema-object-default-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] default value to \'components.schemas.offsetSchema\' in request'))
  })

  test('Default Inline', async () => {
    const testId = 'schema-object-default-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] default value to schema in \'components.parameters.offsetParam\''))
  })

  test('Default Inline Inline', async () => {
    const testId = 'schema-object-default-inline-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] default value to \'schema.properties.prop1.properties.prop11\' in response \'200\' (application/json)'))
  })

  test('Enum Ref', async () => {
    const testId = 'schema-object-enum-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] possible value \'3\' to \'components.schemas.offsetSchema\' in request'))
  })

  test('Enum Inline', async () => {
    const testId = 'schema-object-enum-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] possible value \'3\' to schema in \'components.parameters.offsetParam\''))
  })

  test('Enum Inline Inline', async () => {
    const testId = 'schema-object-enum-inline-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] possible value \'cde\' to \'schema.properties.prop1.properties.prop11.enum\' in response \'200\' (application/json)'))
  })

  test('OneOf Array Ref', async () => {
    const testId = 'schema-object-one-of-array-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] oneOf[2] to \'components.schemas.Pet\' in request'))
  })

  test('OneOf Array Inline', async () => {
    const testId = 'schema-object-one-of-array-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] oneOf[2] to schema in request body (application/json)'))
  })

  test('OneOf Array Inline Inline', async () => {
    const testId = 'schema-object-one-of-array-inline-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] oneOf[1] to \'schema.properties.prop1.properties.prop11.oneOf\' in \'components.parameters.offsetParam\''))
  })

  test('AnyOf Array Ref', async () => {
    const testId = 'schema-object-any-of-array-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] anyOf[2] to \'components.schemas.Pet\' in request'))
  })

  test('AnyOf Array Inline', async () => {
    const testId = 'schema-object-any-of-array-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] anyOf[2] to schema in request body (application/json)'))
  })

  test('AnyOf Array Inline Inline', async () => {
    const testId = 'schema-object-any-of-array-inline-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] anyOf[1] to \'schema.properties.prop1.properties.prop11.anyOf\' in query parameter \'offset\''))
  })

  test('Title Ref', async () => {
    const testId = 'schema-object-title-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] title for \'components.schemas.Pet\' in request'))
  })

  test('Title Inline', async () => {
    const testId = 'schema-object-title-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] title to schema in request body (application/json)'))
  })

  test('Description Ref', async () => {
    const testId = 'schema-object-description-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] description to \'components.schemas.Pet\' in request'))
  })

  test('Description Inline', async () => {
    const testId = 'schema-object-description-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] description to schema in request body (application/json)'))
  })

  test('Properties Ref', async () => {
    const testId = 'schema-object-properties-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] property \'prop22\' to \'components.schemas.Pet.properties.prop2.properties\' in request'))
  })

  test('Properties Inline', async () => {
    const testId = 'schema-object-properties-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] property \'prop3\' to \'schema.properties.prop1.properties.prop2.properties\' in \'components.parameters.offsetParam\''))
  })

  test('Properties Inline Inline', async () => {
    const testId = 'schema-object-properties-inline-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] property \'prop3\' to \'schema.properties.prop1.properties.prop2.properties\' in query parameter \'offset\''))
  })

  test('ExternalDocs Ref', async () => {
    const testId = 'schema-object-external-docs-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] externalDocs to \'components.schemas.Pet\' in request'))
  })

  test('ExternalDocs Inline', async () => {
    const testId = 'schema-object-external-docs-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] externalDocs to schema in request body (application/json)'))
  })

  test('ExternalDocs Description Ref', async () => {
    const testId = 'schema-object-external-docs-description-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] description of externalDocs for \'components.schemas.Pet\' in request'))
  })

  test('ExternalDocs Description Inline', async () => {
    const testId = 'schema-object-external-docs-description-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] description of externalDocs for schema in request body (application/json)'))
  })

  test('ExternalDocs Url Ref', async () => {
    const testId = 'schema-object-external-docs-url-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] url of externalDocs for \'components.schemas.Pet\' in request'))
  })

  test('ExternalDocs Url Inline', async () => {
    const testId = 'schema-object-external-docs-url-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] url of externalDocs for schema in request body (application/json)'))
  })

  test('Example Ref', async () => {
    const testId = 'schema-object-example-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] example to \'components.schemas.Pet\' in request'))
  })

  test('Example Inline', async () => {
    const testId = 'schema-object-example-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] example to schema in request body (application/json)'))
  })
})
