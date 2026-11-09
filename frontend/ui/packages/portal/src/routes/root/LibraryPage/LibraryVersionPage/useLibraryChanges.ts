import { useQuery } from '@tanstack/react-query'

import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import type {
  LibrariesDto,
  LibraryChangesDto,
  LibraryChangeSeverity,
  LibraryChangeType,
  LibraryComparisonDto,
  MavenLibraryDto,
} from '@portal/entities/libraries'
import { fetchAllPages } from '@portal/utils/pagination'
import { requestJsonWithError } from '@portal/utils/requestJsonWithError'
import { portalRequestJson } from '@portal/utils/requests'

type ComparisonOptions = {
  libraryId: string
  version: string
  previousLibraryId?: string
  previousVersion?: string
}

type ChangesOptions = ComparisonOptions & {
  severity?: LibraryChangeSeverity
  changeType?: LibraryChangeType
  classId?: string
  page: number
  limit: number
}

type ComparisonResult = { comparison: LibraryComparisonDto | null | undefined; isLoading: boolean; error: Error | null }
type ChangesResult = { data: LibraryChangesDto | null | undefined; isLoading: boolean; error: Error | null }
type ComparisonLibrariesResult = { libraries: MavenLibraryDto[]; isLoading: boolean; error: Error | null }

export function useComparisonLibraries(): ComparisonLibrariesResult {
  const { data, isLoading, error } = useQuery<MavenLibraryDto[], Error>({
    queryKey: ['libraries', 'comparison'],
    queryFn: ({ signal }) => getComparisonLibraries(signal),
  })
  return { libraries: data ?? [], isLoading: isLoading, error: error }
}

export function useLibraryComparison(options: ComparisonOptions): ComparisonResult {
  const { data, isLoading, error } = useQuery<LibraryComparisonDto | null, Error>({
    queryKey: ['library-comparison', options],
    queryFn: ({ signal }) => requestComparison<LibraryComparisonDto>(options, '/summary', signal),
  })
  return { comparison: data, isLoading: isLoading, error: error }
}

export function useLibraryChanges(options: ChangesOptions): ChangesResult {
  const { data, isLoading, error } = useQuery<LibraryChangesDto | null, Error>({
    queryKey: ['library-changes', options],
    queryFn: ({ signal }) => requestComparison<LibraryChangesDto>(options, '', signal),
  })
  return { data: data, isLoading: isLoading, error: error }
}

async function requestComparison<T extends object>(
  options: ComparisonOptions | ChangesOptions,
  suffix: string,
  signal?: AbortSignal,
): Promise<T | null> {
  const { libraryId, version, ...filters } = options
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  try {
    return await requestJsonWithError<T>(
      `/libraries/${encodeURIComponent(libraryId)}/versions/${encodeURIComponent(version)}/changes${suffix}?${query}`,
      { method: 'GET' },
      { basePath: API_V1 },
      signal,
    )
  } catch (error) {
    if (error instanceof HttpError && error.status === 404 && error.code === 'LIBRARY_COMPARISON_NOT_FOUND') return null
    throw error
  }
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
