import { normalize } from '../../src'

describe('OpenAPI callbacks', () => {
  const callback = {
    '{$request.body#/callbackUrl}': {
      'x-path-item-extension': { nested: true },
      post: {
        'x-operation-extension': 'value',
        responses: { '200': { description: 'OK' } },
      },
    },
  }

  it('preserves operation and component callbacks during validation', () => {
    const source = {
      openapi: '3.1.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            callbacks: { callback: structuredClone(callback) },
            responses: { '200': { description: 'OK' } },
          },
        },
      },
      components: {
        callbacks: { callback: structuredClone(callback) },
      },
    }

    const result = normalize(source, { validate: true })

    expect(result).toMatchObject({
      paths: { '/test': { get: { callbacks: { callback } } } },
      components: { callbacks: { callback } },
    })
  })
})
