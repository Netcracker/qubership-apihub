import { ApiCompatibilityScopeFunction, apiDiff, breaking, DiffAction, risky } from '../src'

import singleMethodResponseBefore from './helper/resources/backward-compatibility/single-method-response/before.json'
import singleMethodResponseAfter from './helper/resources/backward-compatibility/single-method-response/after.json'

import singleMethodRequestResponseBefore
  from './helper/resources/backward-compatibility/single-method-request-response/before.json'
import singleMethodRequestResponseAfter
  from './helper/resources/backward-compatibility/single-method-request-response/after.json'

import multipleMethodsResponseBefore
  from './helper/resources/backward-compatibility/multiple-methods-response/before.json'
import multipleMethodsResponseAfter
  from './helper/resources/backward-compatibility/multiple-methods-response/after.json'

import multipleMethodsResponseRefBefore
  from './helper/resources/backward-compatibility/multiple-methods-response-ref/before.json'
import multipleMethodsResponseRefAfter
  from './helper/resources/backward-compatibility/multiple-methods-response-ref/after.json'

import multipleMethodsRequestResponseRefBefore
  from './helper/resources/backward-compatibility/multiple-methods-request-response-ref/before.json'
import multipleMethodsRequestResponseRefAfter
  from './helper/resources/backward-compatibility/multiple-methods-request-response-ref/after.json'

import { diffsMatcher } from './helper/matchers'
import { API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE } from '../src/types'

type PATH_ENTRY = [string, string, string]

const GET_PATH1: PATH_ENTRY = ['paths', '/path1', 'get']
const POST_PATH1: PATH_ENTRY = ['paths', '/path1', 'post']

function createApiCompatibilityScopeFunction(data: PATH_ENTRY[]): ApiCompatibilityScopeFunction {
  return (path?: PropertyKey[]) => {
    if (path?.length !== 3) {
      return undefined
    }
    return data.some(entry =>
      entry.every((el, i) => path?.[i] === el),
    ) ? API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE : undefined
  }
}

describe('Backward compatibility tests', () => {
  it('should diff from GET has risky type with not backward compatible', async () => {
    const { diffs } = apiDiff(
      singleMethodResponseBefore,
      singleMethodResponseAfter,
      { apiCompatibilityScopeFunction: () => API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE },
    )
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
    ]))
  })

  it('should mark both request and response as risky for single method with not backward compatible', async () => {
    const { diffs } = apiDiff(
      singleMethodRequestResponseBefore,
      singleMethodRequestResponseAfter,
      { apiCompatibilityScopeFunction: () => API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE },
    )
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
      expect.objectContaining({
        scope: 'request',
        action: DiffAction.replace,
        type: risky,
      }),
    ]))
  })

  it('should mark GET method as risky and POST as breaking when only GET is in scope', async () => {
    const { diffs } = apiDiff(
      multipleMethodsResponseBefore,
      multipleMethodsResponseAfter,
      { apiCompatibilityScopeFunction: createApiCompatibilityScopeFunction([GET_PATH1]) })
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...GET_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        beforeDeclarationPaths: [[...GET_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        scope: 'response',
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...POST_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        beforeDeclarationPaths: [[...POST_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        scope: 'response',
        type: breaking,
      }),
    ]))
  })

  it('should mark both GET and POST methods as risky when both are in scope', async () => {
    const { diffs } = apiDiff(
      multipleMethodsResponseBefore,
      multipleMethodsResponseAfter,
      { apiCompatibilityScopeFunction: createApiCompatibilityScopeFunction([GET_PATH1, POST_PATH1]) })
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...POST_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        beforeDeclarationPaths: [[...POST_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        scope: 'response',
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...GET_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        beforeDeclarationPaths: [[...GET_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        scope: 'response',
        type: risky,
      }),
    ]))
  })

  it('should have two response diffs and one components diff when only GET is in scope with refs', async () => {
    const { diffs } = apiDiff(
      multipleMethodsResponseRefBefore,
      multipleMethodsResponseRefAfter,
      { apiCompatibilityScopeFunction: createApiCompatibilityScopeFunction([GET_PATH1]) })
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'response',
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'response',
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'components',
        type: breaking,
      }),
    ]))
  })

  it('should have one response diff and one components diff when both methods are in scope with refs', async () => {
    const { diffs } = apiDiff(
      multipleMethodsResponseRefBefore,
      multipleMethodsResponseRefAfter,
      { apiCompatibilityScopeFunction: createApiCompatibilityScopeFunction([GET_PATH1, POST_PATH1]) })
    expect(diffs).toEqual(diffsMatcher([
      // get + post
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'response',
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'components',
        type: breaking,
      }),
    ]))
  })

  it('should mark POST as breaking and GET as risky for both request and response when only GET is in scope with refs', async () => {
    const { diffs } = apiDiff(
      multipleMethodsRequestResponseRefBefore,
      multipleMethodsRequestResponseRefAfter,
      { apiCompatibilityScopeFunction: createApiCompatibilityScopeFunction([GET_PATH1]) })
    expect(diffs).toEqual(diffsMatcher([
      // post
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'request',
        type: breaking,
      }),
      // post
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'response',
        type: breaking,
      }),
      // get
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'request',
        type: risky,
      }),
      // get
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'response',
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'components',
        type: breaking,
      }),
    ]))
  })

  it('should mark both request and response as risky when both methods are in scope with refs', async () => {
    const { diffs } = apiDiff(
      multipleMethodsRequestResponseRefBefore,
      multipleMethodsRequestResponseRefAfter,
      { apiCompatibilityScopeFunction: createApiCompatibilityScopeFunction([GET_PATH1, POST_PATH1]) })
    expect(diffs).toEqual(diffsMatcher([
      // get + post
      expect.objectContaining({
        scope: 'request',
        action: DiffAction.replace,
        type: risky,
      }),
      // get + post
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
      expect.objectContaining({
        scope: 'components',
        action: DiffAction.replace,
        type: breaking,
      }),
    ]))
  })
})
