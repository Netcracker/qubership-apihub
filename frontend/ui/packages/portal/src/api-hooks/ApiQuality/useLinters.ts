import type { LinterApiType } from '@apihub/entities/api-quality/linter-api-types'
import type { Linters, LintersDto } from '@apihub/entities/api-quality/linters'
import { requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { API_LINTER_API_V1 } from './constants'

const QUERY_KEY_LINTERS = 'linters'

type Result = {
  data: Linters | undefined
  isLoading: boolean
  error: Error | null
}

export function useLinters(apiType?: LinterApiType): Result {
  const { data, isLoading, error } = useQuery<LintersDto, Error, Linters>({
    queryKey: [QUERY_KEY_LINTERS],
    queryFn: () => getLinters(),
    select: (data) => (
      apiType
        ? data.filter(linter => linter.apiTypes.includes(apiType))
        : data
    ),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  })

  return { data, isLoading, error }
}

function getLinters(): Promise<LintersDto> {
  return requestJson<LintersDto>(
    '/linters',
    { method: 'GET' },
    { basePath: API_LINTER_API_V1 },
  )
}
