import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../src'

const SUITE_ID = 'response'

const RESPONSES_PATH = ['paths', '/path1', 'get', 'responses']

describe('Openapi3 Response', () => {

  test('Add new response', async () => {
    const testId = 'add-new-response'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...RESPONSES_PATH, '202']],
        type: nonBreaking,
      }),
    ]))
  })

  test('Remove response', async () => {
    const testId = 'remove-response'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...RESPONSES_PATH, '202']],
        type: breaking,
      }),
    ]))
  })

  test('Add response description', async () => {
    const testId = 'add-response-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...RESPONSES_PATH, '200', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Update response description', async () => {
    const testId = 'update-response-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...RESPONSES_PATH, '200', 'description']],
        afterDeclarationPaths: [[...RESPONSES_PATH, '200', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Remove response description', async () => {
    const testId = 'remove-response-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...RESPONSES_PATH, '200', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Add response header', async () => {
    const testId = 'add-response-header'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...RESPONSES_PATH, '200', 'headers', 'X-Rate-Limit-Limit']],
        type: nonBreaking,
      }),
    ]))
  })

  test('Remove response header', async () => {
    const testId = 'remove-response-header'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...RESPONSES_PATH, '200', 'headers', 'X-Rate-Limit-Limit']],
        type: breaking,
      }),
    ]))
  })

  test('Update header name', async () => {
    const testId = 'update-header-name'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[...RESPONSES_PATH, '200', 'headers', 'X-Rate-Limit-Limit']],
          type: breaking,
        }),
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [[...RESPONSES_PATH, '200', 'headers', 'X-Rate-Limit-Remaining']],
          type: nonBreaking,
        }),
      ],
    ))
  })

  test('Add header description', async () => {
    const testId = 'add-header-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...RESPONSES_PATH, '200', 'headers', 'X-Rate-Limit-Limit', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Update header description', async () => {
    const testId = 'update-header-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...RESPONSES_PATH, '200', 'headers', 'X-Rate-Limit-Limit', 'description']],
        afterDeclarationPaths: [[...RESPONSES_PATH, '200', 'headers', 'X-Rate-Limit-Limit', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Remove header description', async () => {
    const testId = 'remove-header-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...RESPONSES_PATH, '200', 'headers', 'X-Rate-Limit-Limit', 'description']],
        type: annotation,
      }),
    ]))
  })

  //Wrong classifications (unclassified)
  test.skip('Add custom property', async () => {
    const testId = 'add-custom-property'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/pets', 'get', 'responses', '200', 'x-cacheable']],
        type: nonBreaking,
      }),
    ]))
  })

  //Wrong classifications (unclassified)
  test.skip('Remove custom property', async () => {
    const testId = 'remove-custom-property'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/pets', 'get', 'responses', '200', 'x-cacheable']],
        type: nonBreaking,
      }),
    ]))
  })

  //Wrong classifications (unclassified)
  test.skip('Update custom property value', async () => {
    const testId = 'update-custom-property-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/pets', 'get', 'responses', '200', 'x-cacheable']],
        afterDeclarationPaths: [['paths', '/pets', 'get', 'responses', '200', 'x-cacheable']],
        type: nonBreaking,
      }),
    ]))
  })
})
