import { INodeVariable } from '@stoplight/types'
import { renderHook } from '@testing-library/react-hooks'

import type { IServer } from '../utils/http-spec/IServer'
import { useCombinedServers, useProcessedCustomServers, useProcessedSpecServers } from './useServerProcessing'

describe('useServerProcessing hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useProcessedSpecServers', () => {
    const mockSpecServers: IServer[] = [
      {
        url: 'https://api.example.com',
        description: 'Production API',
      },
      {
        url: 'https://{env}.example.com',
        description: 'Environment API',
        variables: {
          env: {
            default: 'staging',
            enum: ['staging', 'dev'],
          } as INodeVariable,
        },
      },
      {
        url: '/relative/path',
        description: 'Relative URL',
      },
    ]

    it('should return empty array when specServers is undefined', () => {
      const { result } = renderHook(() => useProcessedSpecServers(undefined))

      expect(result.current).toEqual([])
    })

    it('should return empty array when specServers is empty', () => {
      const { result } = renderHook(() => useProcessedSpecServers([]))

      expect(result.current).toEqual([])
    })

    it('should process spec servers and filter out relative URLs by default', () => {
      const { result } = renderHook(() => useProcessedSpecServers(mockSpecServers))

      // Should have 3 servers: 1 absolute + 2 expanded from template
      expect(result.current).toHaveLength(3)
      expect(result.current[0]).toEqual({
        url: 'https://api.example.com',
        description: 'Production API',
        custom: false,
        shouldUseProxyEndpoint: true,
      })

      // Should include expanded servers from enum variables
      expect(result.current[1]).toEqual({
        url: 'https://staging.example.com',
        description: 'Environment API',
        variables: expect.any(Object),
        custom: false,
        shouldUseProxyEndpoint: true,
      })
      expect(result.current[2]).toEqual({
        url: 'https://dev.example.com',
        description: 'Environment API',
        variables: expect.any(Object),
        custom: false,
        shouldUseProxyEndpoint: true,
      })
    })

    it('should include relative URLs when withRelativeUrls is true', () => {
      const { result } = renderHook(() => useProcessedSpecServers(mockSpecServers, true))

      // Should include the relative URL
      const relativeServer = result.current.find(s => s.url === '/relative/path')
      expect(relativeServer).toBeDefined()
      expect(relativeServer).toEqual({
        url: '/relative/path',
        description: 'Relative URL',
        custom: false,
        shouldUseProxyEndpoint: true,
      })
    })

    it('should handle servers without variables', () => {
      const simpleServers: IServer[] = [
        { url: 'https://simple.example.com', description: 'Simple API' },
      ]

      const { result } = renderHook(() => useProcessedSpecServers(simpleServers))

      expect(result.current).toEqual([{
        url: 'https://simple.example.com',
        description: 'Simple API',
        custom: false,
        shouldUseProxyEndpoint: true,
      }])
    })

    it('should replace variables with default values', () => {
      const serversWithDefaults: IServer[] = [
        {
          url: 'https://{env}.{region}.example.com',
          description: 'API with defaults',
          variables: {
            env: { default: 'prod' } as INodeVariable,
            region: { default: 'us' } as INodeVariable,
          },
        },
      ]

      const { result } = renderHook(() => useProcessedSpecServers(serversWithDefaults))

      expect(result.current[0].url).toBe('https://prod.us.example.com')
    })

    it('should memoize results when servers do not change', () => {
      const { result, rerender } = renderHook(() => useProcessedSpecServers(mockSpecServers))

      const firstResult = result.current
      rerender()

      expect(result.current).toBe(firstResult) // Same reference
    })

    describe('variable expansion', () => {
      it('should expand enum variables into multiple servers', () => {
        const serversWithEnums: IServer[] = [
          {
            url: 'https://{env}.{region}.example.com',
            description: 'Multi-variable API',
            variables: {
              env: {
                enum: ['prod', 'staging'],
              } as INodeVariable,
              region: {
                enum: ['us', 'eu'],
              } as INodeVariable,
            },
          },
        ]

        const { result } = renderHook(() => useProcessedSpecServers(serversWithEnums))

        // Should create 4 combinations (2 envs × 2 regions)
        expect(result.current).toHaveLength(4)
        expect(result.current.map(s => s.url)).toEqual([
          'https://prod.us.example.com',
          'https://prod.eu.example.com',
          'https://staging.us.example.com',
          'https://staging.eu.example.com',
        ])
      })

      it('should handle mixed enum and non-enum variables', () => {
        const mixedVariables: IServer[] = [
          {
            url: 'https://{env}.{region}.example.com/{version}',
            description: 'Mixed variables',
            variables: {
              env: {
                enum: ['prod', 'dev'],
              } as INodeVariable,
              region: {
                default: 'us',
              } as INodeVariable,
              version: {
                default: 'v1',
              } as INodeVariable,
            },
          },
        ]

        const { result } = renderHook(() => useProcessedSpecServers(mixedVariables))

        // Should create 2 servers (only enum variable expands)
        expect(result.current).toHaveLength(2)
        expect(result.current.map(s => s.url)).toEqual([
          'https://prod.us.example.com/v1',
          'https://dev.us.example.com/v1',
        ])
      })

      it('should handle servers without enum variables', () => {
        const noEnumServers: IServer[] = [
          {
            url: 'https://{env}.example.com',
            description: 'Default only',
            variables: {
              env: {
                default: 'prod',
              } as INodeVariable,
            },
          },
        ]

        const { result } = renderHook(() => useProcessedSpecServers(noEnumServers))

        expect(result.current).toHaveLength(1)
        expect(result.current[0].url).toBe('https://prod.example.com')
      })
    })
  })

  describe('useProcessedCustomServers', () => {
    const mockCustomServers: IServer[] = [
      {
        url: 'https://custom.example.com',
        description: 'Custom API',
        shouldUseProxyEndpoint: true,
      },
      {
        url: 'http://localhost:3000',
        description: 'Local API',
        shouldUseProxyEndpoint: false,
      },
    ]

    it('should return empty array when customServers is undefined', () => {
      const { result } = renderHook(() => useProcessedCustomServers(undefined))

      expect(result.current).toEqual([])
    })

    it('should return empty array when customServers is empty', () => {
      const { result } = renderHook(() => useProcessedCustomServers([]))

      expect(result.current).toEqual([])
    })

    it('should process custom servers and mark them as custom', () => {
      const { result } = renderHook(() => useProcessedCustomServers(mockCustomServers))

      expect(result.current).toHaveLength(2)
      expect(result.current[0]).toEqual({
        url: 'https://custom.example.com',
        description: 'Custom API',
        custom: true,
        shouldUseProxyEndpoint: true,
      })
      expect(result.current[1]).toEqual({
        url: 'http://localhost:3000',
        description: 'Local API',
        custom: true,
        shouldUseProxyEndpoint: false,
      })
    })

    it('should memoize results when servers do not change', () => {
      const { result, rerender } = renderHook(() => useProcessedCustomServers(mockCustomServers))

      const firstResult = result.current
      rerender()

      expect(result.current).toBe(firstResult) // Same reference
    })
  })

  describe('useCombinedServers', () => {
    const specServers: IServer[] = [
      { url: 'https://spec.example.com', description: 'Spec API' },
    ]

    const customServers: IServer[] = [
      { url: 'https://custom.example.com', description: 'Custom API' },
    ]

    it('should combine spec and custom servers when custom servers exist', () => {
      const { result } = renderHook(() => useCombinedServers(specServers, customServers))

      expect(result.current).toHaveLength(2)
      expect(result.current[0]).toEqual(specServers[0])
      expect(result.current[1]).toEqual(customServers[0])
    })

    it('should use only spec servers when no custom servers', () => {
      const { result } = renderHook(() => useCombinedServers(specServers, []))

      expect(result.current).toEqual(specServers)
    })

    it('should use only custom servers when no spec servers', () => {
      const { result } = renderHook(() => useCombinedServers([], customServers))

      expect(result.current).toEqual(customServers)
    })

    it('should handle all empty inputs', () => {
      const { result } = renderHook(() => useCombinedServers([], []))

      expect(result.current).toEqual([])
    })

    it('should add mock server when mockUrl is provided', () => {
      const mockUrl = 'https://mock.example.com'

      const { result } = renderHook(() => useCombinedServers(specServers, customServers, mockUrl))

      expect(result.current).toHaveLength(3)
      expect(result.current[2]).toEqual({
        description: 'Mock Server',
        url: mockUrl,
      })
    })

    it('should memoize results correctly', () => {
      const { result, rerender } = renderHook(() => useCombinedServers(specServers, customServers))

      const firstResult = result.current
      rerender()

      expect(result.current).toBe(firstResult) // Same reference
    })
  })

  describe('URL validation and security filtering (unified tests)', () => {
    const dangerousServers: IServer[] = [
      { url: 'javascript:alert(1)', description: 'XSS attempt' },
      { url: 'data:text/html,<script>alert(1)</script>', description: 'Data URI XSS' },
      { url: 'vbscript:msgbox(1)', description: 'VBScript injection' },
      { url: 'file:///etc/passwd', description: 'File access attempt' },
      { url: 'https://safe.example.com', description: 'Safe URL' },
    ]

    const malformedServers: IServer[] = [
      { url: 'https://[invalid-ipv6', description: 'Malformed IPv6' },
      { url: 'https://valid.example.com', description: 'Valid URL' },
    ]

    const invalidSchemeServers: IServer[] = [
      { url: 'ftp://invalid.example.com', description: 'Invalid scheme' },
      { url: 'https://valid.example.com', description: 'Valid URL' },
    ]

    describe('useProcessedSpecServers security filtering', () => {
      it('should filter out dangerous URLs (SECURITY BUG - currently fails)', () => {
        const { result } = renderHook(() => useProcessedSpecServers(dangerousServers, true))

        expect(result.current).toHaveLength(1)
        expect(result.current[0].url).toBe('https://safe.example.com')
      })

      it('should handle malformed URLs gracefully (SECURITY BUG - currently fails)', () => {
        const { result } = renderHook(() => useProcessedSpecServers(malformedServers, true))

        expect(result.current).toHaveLength(1)
        expect(result.current.map(s => s.url)).toEqual([
          'https://valid.example.com',
        ])
      })

      it('should filter out servers with invalid schemes (SECURITY BUG - currently fails)', () => {
        const { result } = renderHook(() => useProcessedSpecServers(invalidSchemeServers, true))

        expect(result.current).toHaveLength(1)
        expect(result.current[0].url).toBe('https://valid.example.com')
      })
    })

    describe('useProcessedCustomServers security filtering', () => {
      it('should filter out dangerous URLs', () => {
        const { result } = renderHook(() => useProcessedCustomServers(dangerousServers))

        expect(result.current).toHaveLength(1)
        expect(result.current[0].url).toBe('https://safe.example.com')
      })

      it('should handle malformed URLs gracefully', () => {
        const { result } = renderHook(() => useProcessedCustomServers(malformedServers))

        expect(result.current).toHaveLength(1)
        expect(result.current.map(s => s.url)).toEqual([
          'https://valid.example.com',
        ])
      })

      it('should filter out servers with invalid schemes', () => {
        const { result } = renderHook(() => useProcessedCustomServers(invalidSchemeServers))

        expect(result.current).toHaveLength(1)
        expect(result.current[0].url).toBe('https://valid.example.com')
      })
    })
  })
})
