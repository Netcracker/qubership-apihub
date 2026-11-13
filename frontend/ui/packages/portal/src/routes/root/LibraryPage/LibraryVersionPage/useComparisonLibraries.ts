import { useQuery } from '@tanstack/react-query'

import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import type { LibrariesDto, MavenLibraryDto } from '@portal/entities/libraries'
import { fetchAllPages } from '@portal/utils/pagination'
import { portalRequestJson } from '@portal/utils/requests'

type ComparisonLibrariesResult = { libraries: MavenLibraryDto[]; isLoading: boolean; error: Error | null }

export function useComparisonLibraries(): ComparisonLibrariesResult {
  const { data, isLoading, error } = useQuery<MavenLibraryDto[], Error>({
    queryKey: ['libraries', 'comparison'],
    queryFn: ({ signal }) => getComparisonLibraries(signal),
  })
  return { libraries: data ?? [], isLoading: isLoading, error: error }
}

async function getComparisonLibraries(signal?: AbortSignal): Promise<MavenLibraryDto[]> {
  return fetchAllPages(async (page, limit) => {
    const result = await portalRequestJson<LibrariesDto>(
      `/libraries?language=java&limit=${limit}&page=${page}`,
      { method: 'GET' },
      { basePath: API_V1 },
      signal,
    )
    return result.libraries
  }, signal)
}
