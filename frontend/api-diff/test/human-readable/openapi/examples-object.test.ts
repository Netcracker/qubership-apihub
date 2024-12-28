import { compareFiles } from '../../compatibility-suites/utils'
import { SUITE_ID } from '../utils'
import { diffDescriptionMatcher } from '../../helper/matchers'

describe('Examples Object', () => {

  test('Examples Ref', async () => {
    const testId = 'examples-object-examples-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Deleted] example \'one\''))
  })

  test('Examples Inline', async () => {
    const testId = 'examples-object-examples-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Deleted] example \'one\''))
  })

  test('Summary Inline', async () => {
    const testId = 'examples-object-summary-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] summary for example \'one\' in query parameter \'offset\''))
  })

  test('Summary Ref', async () => {
    const testId = 'examples-object-summary-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] summary for example \'components.examples.zero\''))
  })

  test('Description Ref', async () => {
    const testId = 'examples-object-description-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] description to example \'components.examples.zero\''))
  })

  test('Description Inline', async () => {
    const testId = 'examples-object-description-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] description to example \'one\' in query parameter \'offset\''))
  })

  test('Value Ref', async () => {
    const testId = 'examples-object-value-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] value for example \'components.examples.zero\''))
  })

  test('Value Inline', async () => {
    const testId = 'examples-object-value-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] value for example \'one\' in query parameter \'offset\''))
  })

  test('Value Object Ref', async () => {
    const testId = 'examples-object-value-object-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] value.prop1.prop11 for example \'components.examples.zero\''))
  })

  test('Value Object Inline', async () => {
    const testId = 'examples-object-value-object-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] value.prop1.prop11 for example \'one\' in query parameter \'offset\''))
  })

  test('External Value Ref', async () => {
    const testId = 'examples-object-external-value-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Deleted] externalValue from example \'components.examples.zero\''))
  })

  test('External Value Inline', async () => {
    const testId = 'examples-object-external-value-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Deleted] externalValue from example \'one\' in query parameter \'offset\''))
  })
})
