/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
})

