import { compareFiles } from '../../compatibility-suites/utils'
import { SUITE_ID } from '../utils'
import { diffDescriptionMatcher, diffsMatcher } from '../../helper/matchers'

describe('Parameter Object', () => {

  test('Parameter Ref', async () => {
    const testId = 'parameter-object-parameter-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] query parameter \'limit\''))
  })

  test('Parameter Inline', async () => {
    const testId = 'parameter-object-parameter-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] query parameter \'limit\''))
  })

  test('Name Ref', async () => {
    const testId = 'parameter-object-name-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({ description: '[Deleted] query parameter \'offset\'' }),
      expect.objectContaining({ description: '[Added] header parameter \'offset2\'' }),
    ]))
  })

  test('Name Inline', async () => {
    const testId = 'parameter-object-name-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({ description: '[Deleted] query parameter \'offset\'' }),
      expect.objectContaining({ description: '[Added] header parameter \'offset2\'' }),
    ]))
  })

  test('In Ref', async () => {
    const testId = 'parameter-object-in-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({ description: '[Deleted] query parameter \'offset\'' }),
      expect.objectContaining({ description: '[Added] header parameter \'offset\'' }),
    ]))
  })

  test('In Inline', async () => {
    const testId = 'parameter-object-in-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({ description: '[Deleted] query parameter \'offset\'' }),
      expect.objectContaining({ description: '[Added] header parameter \'offset\'' }),
    ]))
  })

  test('Description Ref', async () => {
    const testId = 'parameter-object-description-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] description to query parameter \'components.parameters.offsetParam\''))
  })

  test('Description Inline', async () => {
    const testId = 'parameter-object-description-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] description to query parameter \'offset\''))
  })

  test('Required Ref', async () => {
    const testId = 'parameter-object-required-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] required status for query parameter \'components.parameters.offsetParam\''))
  })

  test('Required Inline', async () => {
    const testId = 'parameter-object-required-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] required status for query parameter \'offset\''))
  })

  test('Deprecated Ref', async () => {
    const testId = 'parameter-object-deprecated-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] deprecated status for query parameter \'components.parameters.offsetParam\''))
  })

  test('Deprecated Inline', async () => {
    const testId = 'parameter-object-deprecated-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] deprecated status for query parameter \'offset\''))
  })

  test('Allow Empty Value Ref', async () => {
    const testId = 'parameter-object-allow-empty-value-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] allowEmptyValue status for query parameter \'components.parameters.offsetParam\''))
  })

  test('Allow Empty Value Inline', async () => {
    const testId = 'parameter-object-allow-empty-value-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] allowEmptyValue status for query parameter \'offset\''))
  })

  test('Style Ref', async () => {
    const testId = 'parameter-object-style-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] delimited style for query parameter \'components.parameters.offsetParam\''))
  })

  test('Style Inline', async () => {
    const testId = 'parameter-object-style-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] delimited style for query parameter \'offset\''))
  })

  test('Explode Ref', async () => {
    const testId = 'parameter-object-explode-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] explode status for query parameter \'components.parameters.offsetParam\''))
  })

  test('Explode Inline', async () => {
    const testId = 'parameter-object-explode-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] explode status for query parameter \'offset\''))
  })

  test('AllowReserved Ref', async () => {
    const testId = 'parameter-object-allow-reserved-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] allowReserved status for header parameter \'components.parameters.offsetParam\''))
  })

  test('AllowReserved Inline', async () => {
    const testId = 'parameter-object-allow-reserved-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        description: '[Changed] allowReserved status for header parameter \'offset\''
      }),
      expect.objectContaining({
        description: '[Changed] allowReserved status for header parameter \'offset2\''
      }),
    ]))
  })

  test('Example Ref', async () => {
    const testId = 'parameter-object-example-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example for query parameter \'components.parameters.offsetParam\''))
  })

  test('Example Inline', async () => {
    const testId = 'parameter-object-example-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example for query parameter \'offset\''))
  })

  test('Example Array Ref', async () => {
    const testId = 'parameter-object-example-array-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example.prop1 for query parameter \'components.parameters.offsetParam\''))
  })

  test('Example Array Inline', async () => {
    const testId = 'parameter-object-example-array-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example.prop1 for query parameter \'offset\''))
  })
})
