import { useQuery } from '@tanstack/react-query'

import type { LibrariesDto, MavenLibraryDto } from '@portal/entities/libraries'
import { fetchAllPages } from '@portal/utils/pagination'
import { LIBRARIES_API_BASE_PATH, portalRequestJson } from '@portal/utils/requests'

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
      { basePath: LIBRARIES_API_BASE_PATH },
      signal,
    )
    return result.libraries
  }, signal)
}
