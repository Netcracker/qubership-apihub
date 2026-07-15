import { useMemo } from 'react'

import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'

export const MCP_ENDPOINT_SEARCH_PARAM = 'mcpEndpoint'

type SetMcpEndpoint = (value: string | undefined) => void

export function useMcpEndpointSearchParam(): [string | undefined, SetMcpEndpoint] {
  const param = useSearchParam<string>(MCP_ENDPOINT_SEARCH_PARAM)
  const setSearchParams = useSetSearchParams()

  return useMemo(() => {
    const mcpEndpoint = param ?? undefined
    return [
      mcpEndpoint,
      value => setSearchParams({ [MCP_ENDPOINT_SEARCH_PARAM]: value ?? '' }, { replace: true }),
    ]
  }, [param, setSearchParams])
}
