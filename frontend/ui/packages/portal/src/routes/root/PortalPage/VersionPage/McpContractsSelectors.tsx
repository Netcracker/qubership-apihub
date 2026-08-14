import type { SelectChangeEvent } from '@mui/material'
import { MenuItem } from '@mui/material'
import type { ChangeEvent, FC } from 'react'
import { memo, useMemo } from 'react'

import { FilledSelectField } from '@netcracker/qubership-apihub-ui-shared/components/FilledSelectField'
import {
  MCP_COLLECTION_INIT,
  MCP_COLLECTION_LABELS,
  MCP_COLLECTION_PROMPTS,
  MCP_COLLECTION_RESOURCES,
  MCP_COLLECTION_TOOLS,
  MCP_COLLECTIONS,
  type McpCollection,
  type McpContractsSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'

import { useMcpCollectionSearchParam } from './useMcpCollectionSearchParam'
import { useMcpEndpointSearchParam } from './useMcpEndpointSearchParam'

export type McpContractsSelectorsProps = Readonly<{
  endpointOptions: ReadonlyArray<string>
  mcpSummary?: McpContractsSummary
}>

export const McpContractsSelectors: FC<McpContractsSelectorsProps> = memo<McpContractsSelectorsProps>(({
  endpointOptions,
  mcpSummary,
}) => {
  const [mcpEndpoint, setMcpEndpoint] = useMcpEndpointSearchParam()
  const [mcpCollection, setMcpCollection] = useMcpCollectionSearchParam()

  // Prefer URL value when it is still in options; otherwise first option (URL syncs in layout effect).
  const endpointValue = endpointOptions.find(endpoint => endpoint === mcpEndpoint) ??
    endpointOptions[0] ?? ''
  const hasMcpEndpoints = endpointOptions.length > 0

  const endpointSummary = endpointValue ? mcpSummary?.byEndpoint[endpointValue] : undefined

  const entityCounts = useMemo<Record<McpCollection, number>>(() => ({
    [MCP_COLLECTION_INIT]: 0,
    [MCP_COLLECTION_TOOLS]: endpointSummary?.toolsCount ?? 0,
    [MCP_COLLECTION_PROMPTS]: endpointSummary?.promptsCount ?? 0,
    [MCP_COLLECTION_RESOURCES]: endpointSummary?.resourcesCount ?? 0,
  }), [endpointSummary])

  const visibleCollections = useMemo(() => {
    if (!hasMcpEndpoints) {
      return []
    }
    return MCP_COLLECTIONS.filter(collection => collection === MCP_COLLECTION_INIT || entityCounts[collection] > 0)
  }, [entityCounts, hasMcpEndpoints])

  const collectionValue = visibleCollections.find(collection =>
    collection === (mcpCollection ?? MCP_COLLECTION_INIT),
  ) ??
    visibleCollections[0] ?? ''

  const handleEndpointChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent,
  ): void => {
    setMcpEndpoint(event.target.value)
  }

  const handleCollectionChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent,
  ): void => {
    setMcpCollection(event.target.value as McpCollection)
  }

  return (
    <>
      <FilledSelectField
        value={endpointValue}
        onChange={handleEndpointChange}
        data-testid="McpEndpointSelector"
      >
        {endpointOptions.map(endpoint => (
          <MenuItem key={endpoint} value={endpoint} data-testid={`MenuItem-${endpoint}`}>
            {endpoint}
          </MenuItem>
        ))}
      </FilledSelectField>

      <FilledSelectField
        value={collectionValue}
        onChange={handleCollectionChange}
        data-testid="McpCollectionSelector"
      >
        {visibleCollections.map(collection => (
          <MenuItem key={collection} value={collection} data-testid={`MenuItem-${collection}`}>
            {formatCollectionLabel(collection, entityCounts[collection])}
          </MenuItem>
        ))}
      </FilledSelectField>
    </>
  )
})

McpContractsSelectors.displayName = 'McpContractsSelectors'

function formatCollectionLabel(collection: McpCollection, count: number): string {
  const label = MCP_COLLECTION_LABELS[collection]
  if (collection === MCP_COLLECTION_INIT) {
    return label
  }
  return `${label} (${count})`
}
