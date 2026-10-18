import { compareFiles } from '../../compatibility-suites/utils'
import { SUITE_ID } from '../utils'
import { diffDescriptionMatcher } from '../../helper/matchers'

describe('Request Body Object', () => {

  test('Request Body Ref', async () => {
    const testId = 'request-body-object-request-body-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] request body'))
  })

  test('Request Body Inline', async () => {
    const testId = 'request-body-object-request-body-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] request body'))
  })

  test('Description  Ref', async () => {
    const testId = 'request-body-object-description-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] description for \'components.requestBodies.PetBody\''))
  })

  test('Description  Inline', async () => {
    const testId = 'request-body-object-description-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] description for request body'))
  })

  test('Required  Ref', async () => {
    const testId = 'request-body-object-required-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] required status for \'components.requestBodies.PetBody\''))
  })

  test('Required  Inline', async () => {
    const testId = 'request-body-object-required-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] required status for request body'))
  })

  test('Content Media Type Ref', async () => {
    const testId = 'request-body-object-content-media-type-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Deleted] \'application/xml\' media type from \'components.requestBodies.PetBody\''))
  })

  test('Content Media Type Inline', async () => {
    const testId = 'request-body-object-content-media-type-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Deleted] \'application/xml\' media type from request body'))
  })

  test('Content Example Array Ref', async () => {
    const testId = 'request-body-object-content-example-array-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example.prop1 for \'components.requestBodies.PetBody\' (application/json)'))
  })

  test('Content Example Array Inline', async () => {
    const testId = 'request-body-object-content-example-array-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example.prop1 for request body (application/json)'))
  })

  test('Content Example Ref', async () => {
    const testId = 'request-body-object-content-example-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example for \'components.requestBodies.PetBody\' (application/json)'))
  })

  test('Content Example Inline', async () => {
    const testId = 'request-body-object-content-example-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] example for request body (application/json)'))
  })
})
