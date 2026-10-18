import { compareFiles } from '../../compatibility-suites/utils'
import { SUITE_ID } from '../utils'
import { diffDescriptionMatcher } from '../../helper/matchers'

describe('Response Object', () => {

  test('Response Ref', async () => {
    const testId = 'response-object-response-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] response \'404\''))
  })

  test('Response Inline', async () => {
    const testId = 'response-object-response-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] response \'404\''))
  })

  test('Description Ref', async () => {
    const testId = 'response-object-description-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] description for \'components.responses.NotFound\''))
  })

  test('Description Inline', async () => {
    const testId = 'response-object-description-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] description for response \'404\''))
  })

  test('Content Media Type Ref', async () => {
    const testId = 'response-object-content-media-type-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Deleted] \'application/xml\' media type from \'components.responses.NotFound\''))
  })

  test('Content Media Type Inline', async () => {
    const testId = 'response-object-content-media-type-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Deleted] \'application/xml\' media type from response \'404\''))
  })

  test('Content Example Array Ref', async () => {
    const testId = 'response-object-content-example-array-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example.prop1.prop11 for \'components.responses.NotFound\' (application/json)'))
  })

  test('Content Example Array Inline', async () => {
    const testId = 'response-object-content-example-array-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example.prop1.prop11 for response \'404\' (application/json)'))
  })

  test('Content Example Ref', async () => {
    const testId = 'response-object-content-example-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example for \'components.responses.NotFound\' (application/json)'))
  })

  test('Content Example Inline', async () => {
    const testId = 'response-object-content-example-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example for response \'404\' (application/json)'))
  })
})
