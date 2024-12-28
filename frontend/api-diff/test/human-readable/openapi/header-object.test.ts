import { compareFiles } from '../../compatibility-suites/utils'
import { SUITE_ID } from '../utils'
import { diffDescriptionMatcher } from '../../helper/matchers'

describe('Header Object', () => {

  test('Header Ref', async () => {
    const testId = 'header-object-header-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] header \'XRateLimit\''))
  })

  test('Header Inline', async () => {
    const testId = 'header-object-header-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] header \'XRateLimit\''))
  })

  test('Description Ref', async () => {
    const testId = 'header-object-description-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] description for \'components.headers.X-Rate-Limit\''))
  })

  test('Description Inline', async () => {
    const testId = 'header-object-description-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] description for header \'XRateLimit\' in response \'200\''))
  })

  test('Required Ref', async () => {
    const testId = 'header-object-required-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] required status for \'components.headers.X-Rate-Limit\''))
  })

  test('Required Inline', async () => {
    const testId = 'header-object-required-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] required status for header \'XRateLimit\' in response \'200\''))
  })

  test('Deprecated Ref', async () => {
    const testId = 'header-object-deprecated-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] deprecated status for \'components.headers.X-Rate-Limit\''))
  })

  test('Deprecated Inline', async () => {
    const testId = 'header-object-deprecated-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] deprecated status for header \'XRateLimit\' in response \'200\''))
  })

  test('Allow Empty Value Ref', async () => {
    const testId = 'header-object-allow-empty-value-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] allowEmptyValue status for \'components.headers.X-Rate-Limit\''))
  })

  test('Allow Empty Value Inline', async () => {
    const testId = 'header-object-allow-empty-value-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] allowEmptyValue status for header \'XRateLimit\' in response \'200\''))
  })

  test('Style Ref', async () => {
    const testId = 'header-object-style-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] delimited style for \'components.headers.X-Rate-Limit\''))
  })

  test('Style Inline', async () => {
    const testId = 'header-object-style-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] delimited style for header \'XRateLimit\' in response \'200\''))
  })

  test('Explode Ref', async () => {
    const testId = 'header-object-explode-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] explode status to \'components.headers.X-Rate-Limit\''))
  })

  test('Explode Inline', async () => {
    const testId = 'header-object-explode-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] explode status to header \'XRateLimit\' in response \'200\''))
  })

  test('AllowReserved Ref', async () => {
    const testId = 'header-object-allow-reserved-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] allowReserved status for \'components.headers.X-Rate-Limit\''))
  })

  test('AllowReserved Inline', async () => {
    const testId = 'header-object-allow-reserved-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] allowReserved status for header \'XRateLimit\' in response \'200\''))
  })

  test('Example Ref', async () => {
    const testId = 'header-object-example-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example for \'components.headers.X-Rate-Limit\''))
  })

  test('Example Inline', async () => {
    const testId = 'header-object-example-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example for header \'XRateLimit\' in response \'200\''))
  })

  test('Example Array Ref', async () => {
    const testId = 'header-object-example-array-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example.prop1.prop11 for \'components.headers.X-Rate-Limit\''))
  })

  test('Example Array Inline', async () => {
    const testId = 'header-object-example-array-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example.prop1.prop11 for header \'XRateLimit\' in response \'200\''))
  })
})
