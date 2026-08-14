import { useLayoutEffect, useMemo, useRef } from 'react'

import {
  MCP_COLLECTION_INIT,
  MCP_COLLECTION_PROMPTS,
  MCP_COLLECTION_RESOURCES,
  MCP_COLLECTION_TOOLS,
  type McpCollection,
  type McpContractsSummary,
  type McpEndpointSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'

import { usePackageVersionContent } from '@apihub/routes/root/usePackageVersionContent'
import { usePackageParamsWithRef } from '../usePackageParamsWithRef'
import { useMcpCollectionSearchParam } from './useMcpCollectionSearchParam'
import { useMcpEndpointSearchParam } from './useMcpEndpointSearchParam'

type McpToolbarSnapshot = Readonly<{
  endpointOptions: ReadonlyArray<string>
  mcpSummary: McpContractsSummary | undefined
}>

type UseMcpContractsScopeResult = Readonly<{
  mcpEndpoint: string | undefined
  mcpCollection: McpCollection | undefined
  endpointOptions: ReadonlyArray<string>
  mcpSummary: McpContractsSummary | undefined
  isEmptyMcpScope: boolean
}>

/**
 * MCP toolbar scope from contractsSummary.mcp (?ref=-aware):
 * keep last settled options while summary reloads; sync endpoint/collection before paint.
 */
export function useMcpContractsScope(enabled: boolean): UseMcpContractsScopeResult {
  const [mcpEndpoint, setMcpEndpoint] = useMcpEndpointSearchParam()
  const [mcpCollection, setMcpCollection] = useMcpCollectionSearchParam()
  const [summaryPackageKey, summaryVersionKey] = usePackageParamsWithRef()

  const { versionContent, isLoading: isSummaryLoading } = usePackageVersionContent({
    packageKey: summaryPackageKey,
    versionKey: summaryVersionKey,
    includeSummary: true,
    enabled: enabled,
  })

  const mcpSummary = versionContent?.contractsSummary?.mcp
  const endpointOptions = useMemo(
    () => Object.keys(mcpSummary?.byEndpoint ?? {}),
    [mcpSummary?.byEndpoint],
  )

  // Keys undefined while ?ref= resolves. Do not use usePackageRef isLoading when ?ref= is unset.
  const summaryScopeReady = !!summaryPackageKey && !!summaryVersionKey && !isSummaryLoading

  const previousToolbarRef = useRef<McpToolbarSnapshot>({
    endpointOptions: [],
    mcpSummary: undefined,
  })
  if (summaryScopeReady) {
    previousToolbarRef.current = {
      endpointOptions,
      mcpSummary,
    }
  }

  const displayEndpointOptions = summaryScopeReady
    ? endpointOptions
    : previousToolbarRef.current.endpointOptions
  const displayMcpSummary = summaryScopeReady
    ? mcpSummary
    : previousToolbarRef.current.mcpSummary

  useLayoutEffect(() => {
    if (!enabled || !summaryScopeReady) {
      return
    }

    if (endpointOptions.length === 0) {
      if (mcpEndpoint) {
        setMcpEndpoint(undefined)
      }
      if (mcpCollection !== undefined && mcpCollection !== MCP_COLLECTION_INIT) {
        setMcpCollection(MCP_COLLECTION_INIT)
      }
      return
    }

    const nextEndpoint = mcpEndpoint && endpointOptions.includes(mcpEndpoint)
      ? mcpEndpoint
      : endpointOptions[0]
    if (nextEndpoint !== mcpEndpoint) {
      setMcpEndpoint(nextEndpoint)
    }

    const nextCollection = resolveMcpCollection(mcpCollection, mcpSummary?.byEndpoint[nextEndpoint])
    if (nextCollection !== (mcpCollection ?? MCP_COLLECTION_INIT)) {
      setMcpCollection(nextCollection)
    }
  }, [
    enabled,
    endpointOptions,
    mcpEndpoint,
    mcpCollection,
    mcpSummary,
    setMcpEndpoint,
    setMcpCollection,
    summaryScopeReady,
  ])

  return {
    mcpEndpoint: mcpEndpoint,
    mcpCollection: mcpCollection,
    endpointOptions: displayEndpointOptions,
    mcpSummary: displayMcpSummary,
    isEmptyMcpScope: summaryScopeReady && endpointOptions.length === 0,
  }
}

function resolveMcpCollection(
  mcpCollection: McpCollection | undefined,
  endpointSummary: McpEndpointSummary | undefined,
): McpCollection {
  const current = mcpCollection ?? MCP_COLLECTION_INIT
  if (current === MCP_COLLECTION_INIT) {
    return MCP_COLLECTION_INIT
  }
  if (current === MCP_COLLECTION_TOOLS && (endpointSummary?.toolsCount ?? 0) > 0) {
    return current
  }
  if (current === MCP_COLLECTION_PROMPTS && (endpointSummary?.promptsCount ?? 0) > 0) {
    return current
  }
  if (current === MCP_COLLECTION_RESOURCES && (endpointSummary?.resourcesCount ?? 0) > 0) {
    return current
  }
  return MCP_COLLECTION_INIT
}
