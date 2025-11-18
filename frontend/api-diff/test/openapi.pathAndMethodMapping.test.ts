import { annotation, apiDiff, DiffAction, nonBreaking } from '../src'
import { loadYamlSample, OpenapiBuilder } from './helper'
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
        path: '//path1',
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
        beforeDeclarationPaths: [['paths', '//path1']],
        afterDeclarationPaths: [['paths', '/path1']],
        action: DiffAction.rename,
        type: annotation,
      })
    ]))
  })

  it('Should distinguish between path with and without trailing slash', () => {
    const before = loadYamlSample('trailing-slash-path-mapping/before.yaml')
    const after = loadYamlSample('trailing-slash-path-mapping/after.yaml')

    const { diffs } = apiDiff(before, after)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        afterDeclarationPaths: [['paths', '/v1/extendedAction/{id}/']],
        action: DiffAction.add,
        type: nonBreaking,
      }),
    ]))
  })

  it('Should match operation when prefix moved from root servers to path', () => {
    const before = loadYamlSample('path-prefix-root-server-to-path/before.yaml')
    const after = loadYamlSample('path-prefix-root-server-to-path/after.yaml')

    const { diffs } = apiDiff(before, after)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/users']],
        afterDeclarationPaths: [['paths', '/api/v1/users']],
        action: DiffAction.rename,
        type: annotation,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['servers', 0, 'url']],
        action: DiffAction.replace,
        type: annotation,
      }),
    ]))
  })

  it('Should match operation when prefix moved from path item object servers to path', () => {
    const before = loadYamlSample('path-prefix-path-item-server-to-path/before.yaml')
    const after = loadYamlSample('path-prefix-path-item-server-to-path/after.yaml')

    const { diffs } = apiDiff(before, after)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/users']],
        afterDeclarationPaths: [['paths', '/api/v1/users']],
        action: DiffAction.rename,
        type: annotation,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/users', 'servers', 0, 'url']],
        afterDeclarationPaths: [['paths', '/api/v1/users', 'servers', 0, 'url']],
        action: DiffAction.replace,
        type: annotation,
      }),
    ]))
  })

  it('Should prioritize prefix specified in path item object servers to root servers', () => {
    const before = loadYamlSample('path-prefix-path-item-priority/before.yaml')
    const after = loadYamlSample('path-prefix-path-item-priority/after.yaml')

    const { diffs } = apiDiff(before, after)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: "rename",
        afterDeclarationPaths: [["paths", "/api/v1/users"]],
        beforeDeclarationPaths: [["paths", "/users"]],
        type: "annotation",
      }),
      expect.objectContaining({
        action: "remove",
        beforeDeclarationPaths: [["paths", "/users", "servers"]],
        type: "annotation",
      }),
      expect.objectContaining({
        action: "remove",
        beforeDeclarationPaths: [["servers"]],
        type: "annotation",
      }),
    ]))
  })

  it.skip('Should match operation when prefix moved from operation object servers to path', () => {
    const before = loadYamlSample('path-prefix-operation-server-to-path/before.yaml')
    const after = loadYamlSample('path-prefix-operation-server-to-path/after.yaml')

    const { diffs } = apiDiff(before, after)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/users']],
        afterDeclarationPaths: [['paths', '/api/v1/users']],
        action: DiffAction.rename,
        type: annotation,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['paths', '/users', 'get', 'servers']],
        action: DiffAction.remove,
        type: annotation,
      }),
    ]))
  })
})
