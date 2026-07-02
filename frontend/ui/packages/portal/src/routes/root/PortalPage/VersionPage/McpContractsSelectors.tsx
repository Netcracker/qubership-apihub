import type { SelectChangeEvent } from '@mui/material'
import { MenuItem } from '@mui/material'
import type { ChangeEvent, FC } from 'react'
import { memo, useEffect, useMemo } from 'react'

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

import { useMcpEndpointSearchParam } from './useMcpEndpointSearchParam'
import { useMcpEntitySearchParam } from './useMcpEntitySearchParam'

export type McpContractsSelectorsProps = Readonly<{
  endpointOptions: ReadonlyArray<string>
  mcpSummary?: McpContractsSummary
}>

export const McpContractsSelectors: FC<McpContractsSelectorsProps> = memo<McpContractsSelectorsProps>(({
  endpointOptions,
  mcpSummary,
}) => {
  const [mcpEndpoint, setMcpEndpoint] = useMcpEndpointSearchParam()
  const [mcpEntity, setMcpEntity] = useMcpEntitySearchParam()

  const endpointSummary = mcpEndpoint ? mcpSummary?.byEndpoint[mcpEndpoint] : undefined

  const entityCounts = useMemo<Record<McpCollection, number>>(() => ({
    [MCP_COLLECTION_INIT]: 0,
    [MCP_COLLECTION_TOOLS]: endpointSummary?.toolsCount ?? 0,
    [MCP_COLLECTION_PROMPTS]: endpointSummary?.promptsCount ?? 0,
    [MCP_COLLECTION_RESOURCES]: endpointSummary?.resourcesCount ?? 0,
  }), [endpointSummary])

  const visibleCollections = useMemo(
    () => MCP_COLLECTIONS.filter(collection => collection === MCP_COLLECTION_INIT || entityCounts[collection] > 0),
    [entityCounts],
  )

  useEffect(() => {
    const currentEntity = mcpEntity ?? MCP_COLLECTION_INIT
    if (currentEntity !== MCP_COLLECTION_INIT && !visibleCollections.includes(currentEntity)) {
      setMcpEntity(MCP_COLLECTION_INIT)
    }
  }, [mcpEntity, setMcpEntity, visibleCollections])

  const handleEndpointChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent,
  ): void => {
    setMcpEndpoint(event.target.value)
  }

  const handleEntityChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent,
  ): void => {
    setMcpEntity(event.target.value as McpCollection)
  }

  return (
    <>
      <FilledSelectField
        value={mcpEndpoint ?? ''}
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
        value={mcpEntity ?? MCP_COLLECTION_INIT}
        onChange={handleEntityChange}
        data-testid="McpEntitySelector"
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
