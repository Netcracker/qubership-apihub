import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../src'

const SUITE_ID = 'request'

const REQUEST_BODY_PATH = [
  'paths',
  '/path1',
  'post',
  'requestBody',
]

describe('Openapi3 Request', () => {

  test('Add request body description', async () => {
    const testId = 'add-request-body-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Update request body description', async () => {
    const testId = 'update-request-body-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'description']],
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Remove request body description', async () => {
    const testId = 'remove-request-body-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Mark request body as required option 1', async () => {
    const testId = 'mark-request-body-as-required-option-1'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'required']],
        type: breaking,
      }),
    ]))
  })

  test('Mark request body as required option 2', async () => {
    const testId = 'mark-request-body-as-required-option-2'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'required']],
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'required']],
        type: breaking,
      }),
    ]))
  })

  test('Mark request body as optional option 1', async () => {
    const testId = 'mark-request-body-as-optional-option-1'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'required']],
        type: nonBreaking,
      }),
    ]))
  })

  test('Mark request body as optional option 2', async () => {
    const testId = 'mark-request-body-as-optional-option-2'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'required']],
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'required']],
        type: nonBreaking,
      }),
    ]))
  })

  test('Update media-type of request body', async () => {
    const testId = 'update-media-type-of-request-body'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json']],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/xml']],
        type: nonBreaking,
      }),
    ]))
  })

  test('Add example of request body', async () => {
    const testId = 'add-example-of-request-body'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'example']],
        type: annotation,
      }),
    ]))
  })

  test('Update example of request body', async () => {
    const testId = 'update-example-of-request-body'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'example']],
        afterDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'example']],
        type: annotation,
      }),
    ]))
  })

  test('Remove example of request body', async () => {
    const testId = 'remove-example-of-request-body'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...REQUEST_BODY_PATH, 'content', 'application/json', 'example']],
        type: annotation,
      }),
    ]))
  })

  describe('Add/remove default values', () => {

    test('Add required attribute with default value for request body', async () => {
      const testId = 'add-required-attribute-with-default-value-for-requestBody'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Remove required attribute with default value from request body', async () => {
      const testId = 'remove-required-attribute-with-default-value-from-requestBody'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Add allowReserved attribute with default value for request body parameter encoding', async () => {
      const testId = 'add-allowReserved-with-default-value-for-requestBody-parameter-encoding'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Remove allowReserved attribute with default value from request body parameter encoding', async () => {
      const testId = 'remove-allowReserved-with-default-value-from-requestBody-parameter-encoding'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })
  })
})
