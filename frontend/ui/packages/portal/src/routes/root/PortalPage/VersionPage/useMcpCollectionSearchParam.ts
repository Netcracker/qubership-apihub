import { useMemo } from 'react'

import {
  MCP_COLLECTION_INIT,
  type McpCollection,
  parseMcpCollectionParam,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'

// Query key stays `mcpEntity`: the name is a poor fit for a collection selector,
// but renaming it to `mcpCollection` breaks existing bookmarks and browser history.
export const MCP_COLLECTION_SEARCH_PARAM = 'mcpEntity'

type SetMcpCollection = (value: McpCollection | undefined) => void

export function useMcpCollectionSearchParam(): [McpCollection | undefined, SetMcpCollection] {
  const param = useSearchParam<string>(MCP_COLLECTION_SEARCH_PARAM)
  const setSearchParams = useSetSearchParams()

  return useMemo(() => {
    const mcpCollection = parseMcpCollectionParam(param ?? undefined)
    return [
      mcpCollection,
      value => setSearchParams({ [MCP_COLLECTION_SEARCH_PARAM]: value ?? MCP_COLLECTION_INIT }, { replace: true }),
    ]
  }, [param, setSearchParams])
}
