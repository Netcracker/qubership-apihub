import { useMemo } from 'react'

import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import type { McpCollection } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import {
  MCP_COLLECTION_INIT,
  parseMcpCollectionParam,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'

export const MCP_ENTITY_SEARCH_PARAM = 'mcpEntity'

type SetMcpEntity = (value: McpCollection | undefined) => void

export function useMcpEntitySearchParam(): [McpCollection | undefined, SetMcpEntity] {
  const param = useSearchParam<string>(MCP_ENTITY_SEARCH_PARAM)
  const setSearchParams = useSetSearchParams()

  return useMemo(() => {
    const mcpEntity = parseMcpCollectionParam(param ?? undefined)
    return [
      mcpEntity,
      value => setSearchParams({ [MCP_ENTITY_SEARCH_PARAM]: value ?? MCP_COLLECTION_INIT }, { replace: true }),
    ]
  }, [param, setSearchParams])
}
