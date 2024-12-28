import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, DiffAction } from '../../../src'

const SUITE_ID = 'request-body-examples'

const REQUEST_BODY_PATH = [
  'paths',
  '/path1',
  'post',
  'requestBody',
]

describe('Openapi3 Request Body Examples', () => {

  test('Add examples object for request body', async () => {
    const testId = 'add-examples-object-for-request-body'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1']],
        type: annotation,
      }),
    ]))
  })

  test('Add additional examples object', async () => {
    const testId = 'add-additional-examples-object'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example2']],
        type: annotation,
      }),
    ]))
  })

  test('Update example value', async () => {
    const testId = 'update-example-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'value']],
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'value']],
        type: annotation,
      }),
    ]))
  })

  test('Update name of example', async () => {
    const testId = 'update-name-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1']],
        type: annotation,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example0']],
        type: annotation,
      }),
    ]))
  })

  test('Update externalValue of example', async () => {
    const testId = 'update-external-value-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'externalValue']],
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'externalValue']],
        type: annotation,
      }),
    ]))
  })

  test('Remove externalValue of example', async () => {
    const testId = 'remove-external-value-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'externalValue']],
        type: annotation,
      }),
    ]))
  })

  test('Add summary of example', async () => {
    const testId = 'add-summary-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'summary']],
        type: annotation,
      }),
    ]))
  })

  test('Update summary of example', async () => {
    const testId = 'update-summary-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'summary']],
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'summary']],
        type: annotation,
      }),
    ]))
  })

  test('Remove summary of example', async () => {
    const testId = 'remove-summary-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'summary']],
        type: annotation,
      }),
    ]))
  })

  test('Add description of example', async () => {
    const testId = 'add-description-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Update description of example', async () => {
    const testId = 'update-description-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'description']],
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Remove description of example', async () => {
    const testId = 'remove-description-of-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'examples', 'example1', 'description']],
        type: annotation,
      }),
    ]))
  })
})
