import { compareFiles } from '../../compatibility-suites/utils'
import { SUITE_ID } from '../utils'
import { diffDescriptionMatcher } from '../../helper/matchers'

describe('Encoding Object', () => {

  test('Encoding', async () => {
    const testId = 'encoding-object-encoding'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Added] Encoding details to \'historyMetadata\' in request body (multipart/form-data)'))
  })

  test('Content type', async () => {
    const testId = 'encoding-object-content-type'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] Encoding details (contentType) for \'profileImage\' in request body (multipart/form-data)'))
  })

  test('Style', async () => {
    const testId = 'encoding-object-style'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Deleted] Encoding details (style) from \'historyMetadata\' in request body (multipart/form-data)'))
  })

  test('Explode', async () => {
    const testId = 'encoding-object-explode'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] Encoding details (explode) for \'historyMetadata\' in request body (multipart/form-data)'))
  })

  test('AllowReserved', async () => {
    const testId = 'encoding-object-allow-reserved'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] Encoding details (allowReserved) for \'historyMetadata\' in request body (multipart/form-data)'))
  })

  test('Headers', async () => {
    const testId = 'encoding-object-headers'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffDescriptionMatcher('[Changed] type for schema in header X-Rate-Limit-Limit of encoding \'profileImage\' of request body (multipart/form-data)'))
  })
})
