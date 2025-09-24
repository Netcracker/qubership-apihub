import { annotation, apiDiff, DiffAction } from '../src'
import { OpenapiBuilder } from './helper'
import { diffsMatcher } from './helper/matchers'

describe('Path and method mapping', () => {
  let openapiBuilder: OpenapiBuilder

  beforeEach(() => {
    openapiBuilder = new OpenapiBuilder()
  })

  it('Move prefix from server to path', () => {
    const before = openapiBuilder
      .addServer('https://example1.com/api/v2')
      .addPath({
        path: '/path1',
        responses: {
          '200': {
            description: 'OK',
          },
        },
      })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addServer('https://example1.com')
      .addPath({
        path: '/api/v2/path1', responses: {
          '200': {
            description: 'not OK',
          },
        },
      })
      .getSpec()

    const { diffs } = apiDiff(before, after)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/path1']],
        afterDeclarationPaths: [['paths', '/api/v2/path1']],
        action: DiffAction.rename,
        type: annotation,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/path1', 'get', 'responses', '200', 'description']],
        afterDeclarationPaths: [['paths', '/api/v2/path1', 'get', 'responses', '200', 'description']],
        action: DiffAction.replace,
        type: annotation,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['servers', 0, 'url']],
        action: DiffAction.replace,
        type: annotation,
      }),
    ]))
  })

  it('Remove mistyped slashes', () => {
    const before = openapiBuilder
      .addPath({
        path: '//path1/',
        responses: { '200': { description: 'OK' } },
      })
      .getSpec()

    openapiBuilder.reset()

    const after = openapiBuilder
      .addPath({
        path: '/path1',
        responses: { '200': { description: 'OK' } },
      })
      .getSpec()

    const { diffs } = apiDiff(before, after)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '//path1/']],
        afterDeclarationPaths: [['paths', '/path1']],
        action: DiffAction.rename,
        type: breaking, // todo should be annotation
      })
    ]))
  })
})
