import { extractOperationBasePath } from '../src/utils'

describe('Unit test for extractOperationBasePath', () => {
  test('Should handle Servers with parameters correctly', () => {
    const servers = [{
      url: '{protocol}://{host}/api',
      description: 'Remote server',
      variables: {
        protocol: {
          description: 'Request protocol.',
          enum: ['http', 'https'],
          default: 'https',
        },
        host: {
          description: 'Name of the server, for remote development.',
          enum: ['billing-ui-api.com'],
          default: 'billing-ui-api.com',
        },
      },
    }]

    expect(extractOperationBasePath(servers)).toEqual('/api')
  })

  test('Should handle Servers with absolute url correctly', () => {
    expect(extractOperationBasePath([{ url: 'https://example.com/v1' }])).toEqual('/v1')
    expect(extractOperationBasePath([{ url: 'https://example.com/v1/' }])).toEqual('/v1')
  })

  test('Should handle Servers with relative url correctly', () => {
    expect(extractOperationBasePath([{ url: '/v1' }])).toEqual('/v1')
    expect(extractOperationBasePath([{ url: 'v1' }])).toEqual('/v1')
    expect(extractOperationBasePath([{ url: 'v1/' }])).toEqual('/v1')
    expect(extractOperationBasePath([{ url: '/v1/' }])).toEqual('/v1')
    expect(extractOperationBasePath([{ url: '/' }])).toEqual('')
  })

  // todo: should really handle this case in api-unifier, it returns incorrect object in this case,
  // since url is required for server object
  test('Should handle Servers with empty url correctly', () => {
    // @ts-expect-error - Testing edge case with missing url property
    expect(extractOperationBasePath([{ }])).toEqual('')
  })
})

