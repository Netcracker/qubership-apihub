import { Dictionary, INodeVariable } from '@stoplight/types'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'

import { IServer } from '../utils/http-spec/IServer'
import { replacePlaceholders } from '../utils/string'
import { isAbsoluteHttpUrl, isProperUrl } from '../utils/urls'

/**
 * Hook for processing servers from OpenAPI specification.
 */
export const useProcessedSpecServers = (specServers: IServer[] | undefined, withRelativeUrls = false): IServer[] => {
  return useMemo(() => {
    if (isEmpty(specServers)) {
      return []
    }

    const filteredServers = withRelativeUrls
      ? specServers!
      : specServers!.filter(server => isAbsoluteHttpUrl(server.url))
    const validServers = filterValidServers(filteredServers)
    const expandedServers = expandSpecServersWithEnumVariables(validServers)

    return processServers(expandedServers)
  }, [specServers, withRelativeUrls])
}

/**
 * Hook for processing custom servers.
 */
export const useProcessedCustomServers = (customServers: IServer[] | undefined): IServer[] => {
  return useMemo(() => {
    if (isEmpty(customServers)) {
      return []
    }

    const validServers = filterValidServers(customServers!)

    return processServers(validServers, true)
  }, [customServers])
}

/**
 * Hook for combining processed servers and adding mock server.
 */
export const useCombinedServers = (
  processedSpecServers: IServer[],
  processedCustomServers: IServer[],
  mockUrl?: string,
): IServer[] => {
  return useMemo(() => {
    const combinedServers = processedCustomServers.length > 0
      ? [...processedSpecServers, ...processedCustomServers]
      : [...processedSpecServers]

    if (mockUrl) {
      combinedServers.push({
        description: 'Mock Server',
        url: mockUrl,
      })
    }

    return combinedServers
  }, [processedSpecServers, processedCustomServers, mockUrl])
}

// Helper functions

/**
 * Adds default descriptions, and sets proxy endpoint usage.
 */
function processServers(servers: IServer[], isCustom = false): IServer[] {
  return servers.map((server) => {
    return {
      ...server,
      url: isCustom ? server.url : getServerUrlWithDefaultValues(server),
      description: server.description || '-',
      custom: isCustom,
      shouldUseProxyEndpoint: !isCustom || server.shouldUseProxyEndpoint,
    }
  })
}

/**
 * Expands servers that have enum variables into multiple server entries.
 * Each combination of enum values creates a separate server entry.
 */
function expandSpecServersWithEnumVariables(specServers: IServer[]): IServer[] {
  return specServers?.flatMap(specServer => {
    if (specServer?.variables) {
      const formattedUrls = generateUrlCombinationsFromEnumVariables(specServer.url, specServer.variables)
      return formattedUrls.map(formattedUrl => ({
        ...specServer,
        url: formattedUrl,
      }))
    }
    return [specServer]
  }) ?? []
}

/**
 * Generates all possible URL combinations from enum variables
 */
function generateUrlCombinationsFromEnumVariables(
  url: string,
  variables: Dictionary<INodeVariable, string>,
): string[] {
  const enumVariables = Object.entries(variables || {})
    .filter(([_, variable]) => Array.isArray(variable.enum))
    .map(([key, variable]) => ({ key, values: variable.enum! }))

  if (isEmpty(enumVariables)) {
    return [url]
  }

  const combinations = enumVariables.reduce<{ [key: string]: string }[]>((acc, { key, values }) => {
    return acc.flatMap(combination => values.map(value => ({ ...combination, [key]: value })))
  }, [{}])

  return combinations.map(combination => replacePlaceholders(url, combination))
}

/**
 * Replaces variable placeholders in server URL with their default values.
 */
function getServerUrlWithDefaultValues(server: IServer): string {
  const defaultValues = Object.fromEntries(
    Object.entries(server.variables ?? {}).map(([key, variable]) => [key, variable.default ?? '']),
  )

  if (isEmpty(defaultValues)) {
    return server.url
  }

  return replacePlaceholders(server.url, defaultValues)
}

/**
 * Filters servers to only include those with valid URLs.
 * This function helps protect against malicious URLs by filtering out null/empty URLs
 * and using isProperUrl which validates URL format and prevents dangerous schemes.
 */
function filterValidServers(servers: IServer[]): IServer[] {
  return servers.filter(isValidServer)
}

/**
 * Type guard to check if a server has a valid URL.
 */
function isValidServer(server: IServer): server is IServer {
  return isProperUrl(server.url)
}
