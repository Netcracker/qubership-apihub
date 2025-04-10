import {
  apiDiff,
  breaking,
  COMPARE_MODE_OPERATION,
  CompareOptions,
  Diff,
  DIFF_META_KEY,
  DiffAction,
  nonBreaking,
  annotation,
} from '../src'

import { OpenapiBuilder, TEST_DIFF_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from './helper'
import { OpenAPIV3 } from 'openapi-types'
import { diffsMatcher } from './helper/matchers'

import updatePathItemParameterNameBefore from './helper/resources/update-path-item-parameter-name/before.json'
import updatePathItemParameterNameAfter from './helper/resources/update-path-item-parameter-name/after.json'

import updateOperationParameterNameBefore from './helper/resources/update-operation-parameter-name/before.json'
import updateOperationParameterNameAfter from './helper/resources/update-operation-parameter-name/after.json'

import addParameterBefore from './helper/resources/add-parameter/before.json'
import addParameterAfter from './helper/resources/add-parameter/after.json'

import updateParameterBefore from './helper/resources/update-parameter/before.json'
import updateParameterAfter from './helper/resources/update-parameter/after.json'

import ResponsesObject = OpenAPIV3.ResponsesObject

export function compareSpecs(before: unknown, after: unknown, customNormalizeOptions?: CompareOptions): Array<Diff> {
  const { diffs } = apiDiff(before, after, {
    ...TEST_NORMALIZE_OPTIONS,
    beforeSource: before,
    afterSource: after,
    ...customNormalizeOptions,
  })
  return diffs
}

const TEST_NORMALIZE_OPTIONS: CompareOptions = {
  validate: true,
  liftCombiners: true,
  syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  unify: true,
  allowNotValidSyntheticChanges: true,
}

describe('Openapi3 operation changes', () => {
  let openapiBuilder: OpenapiBuilder

  beforeEach(() => {
    openapiBuilder = new OpenapiBuilder()
  })

  it('Should find remove operation change for compare operation mode', () => {
    const responses: ResponsesObject = {
      '200': {
        description: 'test',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              description: 'Request Pet description',
              title: 'Request Pet',
            },
          },
        },
      },
    }

    const before = openapiBuilder
      .addPath({ path: '/api/v1/test', responses: responses })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder.getSpec()

    const { diffs } = apiDiff(before, after, { mode: COMPARE_MODE_OPERATION })

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/api/v1/test']],
        type: breaking,
      }),
    ]))
  })

  it('Should find add operation change for compare operation mode', () => {
    const responses: ResponsesObject = {
      '200': {
        description: 'test',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              description: 'Request Pet description',
              title: 'Request Pet',
            },
          },
        },
      },
    }

    const before = openapiBuilder.getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({ path: '/api/v1/test', responses: responses })
      .getSpec()

    const { diffs } = apiDiff(before, after, { mode: COMPARE_MODE_OPERATION })

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/api/v1/test']],
        type: nonBreaking,
      }),
    ]))
  })

  it('Should compare operations with different paths', () => {
    const responses: ResponsesObject = {
      '200': {
        description: 'test',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              description: 'Request Pet description',
              title: 'Request Pet',
            },
          },
        },
      },
    }

    const before = openapiBuilder
      .addPath({ path: '/api/v1/test', method: 'get', responses: responses })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({ path: '/api/v2/test', method: 'post', responses: responses })
      .getSpec()

    const { diffs, merged } = apiDiff(before, after, { mode: COMPARE_MODE_OPERATION })

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.rename,
        beforeKey: '/api/v1/test',
        afterKey: '/api/v2/test',
        beforeDeclarationPaths: [['paths', '/api/v1/test']],
        afterDeclarationPaths: [['paths', '/api/v2/test']],
      }),
      expect.objectContaining({
        action: DiffAction.rename,
        beforeKey: 'get',
        afterKey: 'post',
        beforeDeclarationPaths: [['paths', '/api/v1/test', 'get']],
        afterDeclarationPaths: [['paths', '/api/v2/test', 'post']],
      }),
    ]))

    expect(merged).toHaveProperty(['paths', DIFF_META_KEY, '/api/v2/test', 'beforeKey'], '/api/v1/test')
    expect(merged).toHaveProperty(['paths', '/api/v2/test', DIFF_META_KEY, 'post', 'beforeKey'], 'get')
  })

  test('Update path item parameter name', async () => {
    const result = compareSpecs(
      updatePathItemParameterNameBefore,
      updatePathItemParameterNameAfter,
      {
        unify: false, // leaves parameters on the path item level
      },
    )
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.rename,
        beforeDeclarationPaths: [['paths', '/path1/{param1}/{anotherParam1}']],
        afterDeclarationPaths: [['paths', '/path1/{param2}/{anotherParam2}']],
        type: annotation, // Only parameter names changed, unified paths are the same
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/path1/{param1}/{anotherParam1}', 'parameters', 0, 'name']],
        afterDeclarationPaths: [['paths', '/path1/{param2}/{anotherParam2}', 'parameters', 1, 'name']],
        type: annotation,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/path1/{param1}/{anotherParam1}', 'parameters', 1, 'name']],
        afterDeclarationPaths: [['paths', '/path1/{param2}/{anotherParam2}', 'parameters', 0, 'name']],
        type: annotation,
      }),
    ]))
  })

  test('Update operation parameter name', async () => {
    const result = compareSpecs(updateOperationParameterNameBefore, updateOperationParameterNameAfter)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.rename,
        beforeDeclarationPaths: [['paths', '/path1/{param1}/{anotherParam1}']],
        afterDeclarationPaths: [['paths', '/path1/{param2}/{anotherParam2}']],
        type: annotation, // Only parameter names changed, unified paths are the same
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/path1/{param1}/{anotherParam1}', 'get', 'parameters', 0, 'name']],
        afterDeclarationPaths: [['paths', '/path1/{param2}/{anotherParam2}', 'get', 'parameters', 1, 'name']],
        type: annotation,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/path1/{param1}/{anotherParam1}', 'get', 'parameters', 1, 'name']],
        afterDeclarationPaths: [['paths', '/path1/{param2}/{anotherParam2}', 'get', 'parameters', 0, 'name']],
        type: annotation,
      }),
    ]))
  })

  test('Add parameter', async () => {
    const result = compareSpecs(addParameterBefore, addParameterAfter)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/path1/qwe']],
        // todo fix
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/path1/{param1}']],
        type: nonBreaking,
      }),
    ]))
  })

  test('Update parameter', async () => {
    const result = compareSpecs(updateParameterBefore, updateParameterAfter)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.rename,
        beforeDeclarationPaths: [['paths', '/path1/{param1}']],
        afterDeclarationPaths: [['paths', '/path1/{param2}']],
        type: annotation, // Only parameter name changed, unified paths are the same
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/path1/{param1}', 'get', 'parameters', 0, 'name']],
        afterDeclarationPaths: [['paths', '/path1/{param2}', 'get', 'parameters', 0, 'name']],
        type: annotation,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/path1/{param2}', 'get', 'parameters', 1]],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/path1/{param2}', 'get', 'parameters', 2]],
        type: nonBreaking,
      }),
    ]))
  })

})
