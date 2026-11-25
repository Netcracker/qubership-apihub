import { normalize } from '../../src'

describe('OpenAPI 3.1 schema $defs', () => {
  it('preserves nested schemas and their specification extensions during validation', () => {
    const source = {
      openapi: '3.1.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Schema: {
            $defs: {
              Definition: {
                type: 'object',
                'x-definition-extension': { nested: true },
                discriminator: {
                  propertyName: 'kind',
                  'x-discriminator-extension': { nested: true },
                },
                externalDocs: {
                  url: 'https://example.com/docs',
                  'x-external-docs-extension': 'value',
                },
              },
            },
          },
        },
      },
    }

    const result = normalize(source, { validate: true })

    expect(result).toHaveProperty(
      ['components', 'schemas', 'Schema', '$defs', 'Definition', 'x-definition-extension', 'nested'],
      true,
    )
    expect(result).toHaveProperty(
      ['components', 'schemas', 'Schema', '$defs', 'Definition', 'externalDocs', 'x-external-docs-extension'],
      'value',
    )
    expect(result).toHaveProperty(
      ['components', 'schemas', 'Schema', '$defs', 'Definition', 'discriminator', 'x-discriminator-extension', 'nested'],
      true,
    )
  })
})
