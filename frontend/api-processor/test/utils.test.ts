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

import { findSharedPath, removeObjectDuplicates, removeSecurityDuplicates, slugify } from '../src/utils'
import { getOperationBasePath } from '../src/apitypes/rest/rest.utils'

describe('Utils', () => {
  describe('Unit tests for \'slugify\' function', () => {
    expect(slugify('test/test.json')).toEqual('test-test-json')
    expect(slugify('test 123.json')).toEqual('test-123-json')
  })

  describe('Unit test for getOperationPath', () => {
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

      expect(getOperationBasePath(servers)).toEqual('/api')
    })

    test('Should handle Servers with absolute url correctly', () => {
      expect(getOperationBasePath([{ url: 'https://example.com/v1' }])).toEqual('/v1')
      expect(getOperationBasePath([{ url: 'https://example.com/v1/' }])).toEqual('/v1')
    })

    test('Should handle Servers with relative url correctly', () => {
      expect(getOperationBasePath([{ url: '/v1' }])).toEqual('/v1')
      expect(getOperationBasePath([{ url: 'v1' }])).toEqual('/v1')
      expect(getOperationBasePath([{ url: 'v1/' }])).toEqual('/v1')
      expect(getOperationBasePath([{ url: '/v1/' }])).toEqual('/v1')
      expect(getOperationBasePath([{ url: '/' }])).toEqual('')
    })
  })

  describe('Unit tests for \'findSharedPath\' function', () => {
    test('single path should work correctly', () => {
      expect(findSharedPath(['test/test.json'])).toEqual('test/')
      expect(findSharedPath(['/test.json'])).toEqual('/')
      expect(findSharedPath(['test.json'])).toEqual('')
      expect(findSharedPath(['test'])).toEqual('')
      expect(findSharedPath([])).toEqual('')
    })

    test('multiple paths should work correctly', () => {
      expect(findSharedPath(['test/test.json', 'test/foo/baz', 'test/test/xyz'])).toEqual('test/')
      expect(findSharedPath(['/test.json', '/aaa/foo'])).toEqual('/')
      expect(findSharedPath(['test.json', 'foo/baz/test.json'])).toEqual('')
      expect(findSharedPath(['test', 'foo'])).toEqual('')
    })
  })

  describe('Unit tests for \'removeObjectDuplicates\' function', () => {
    test('should return unique items correctly', () => {
      const array = [
        {},
        {
          'url': 'https://development.gigantic-server.com/v1',
          'description': 'Development server',
        },
        {
          'url': 'https://staging.gigantic-server.com/v1',
          'description': 'Staging server',
        },
        {
          'url': 'https://staging.gigantic-server.com/v1',
          'description': 'Staging server',
        },
      ]

      expect(removeObjectDuplicates(array, 'url')).toHaveLength(2)
    })
  })

  describe('Unit tests for \'removeSecurityDuplicates\' function', () => {
    test('should return unique security items correctly', () => {
      const array = [
        {},
        {
          'petstore_auth': [
            'write:pets',
            'read:pets',
          ],
        },
        {
          'petstore_auth1': [
            'write:pets',
            'read:pets',
          ],
        },
        {
          'petstore_auth': [
            'write:pets',
            'read:pets',
          ],
        },
      ]

      expect(removeSecurityDuplicates(array)).toHaveLength(2)
    })
  })

  describe('Unit tests for \'openApiDocumentMeta\' function', () => {
    describe('Unit tests for \'getValueByPath\' function', () => {
      const obj = {
        a: {
          b: [1, 2, 3],
          c: {
            d: 4,
          },
        },
        e: {
          $ref: '#/a/b/1',
        },
      }
    })
  })
})
