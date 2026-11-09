import { useQuery } from '@tanstack/react-query'

import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import type { LibraryClassesDto, LibraryClassKind } from '@portal/entities/libraries'
import { portalRequestJson } from '@portal/utils/requests'

type ClassesOptions = {
  libraryId: string
  version: string
  textFilter: string
  kind?: LibraryClassKind
  page: number
  limit: number
}
type ClassesResult = { data: LibraryClassesDto | undefined; isLoading: boolean; error: Error | null }

export function useLibraryClasses(options: ClassesOptions): ClassesResult {
  const { data, isLoading, error } = useQuery<LibraryClassesDto, Error>({
    queryKey: ['library-classes', options],
    queryFn: ({ signal }) => getLibraryClasses(options, signal),
  })
  return { data: data, isLoading: isLoading, error: error }
}

async function getLibraryClasses(options: ClassesOptions, signal?: AbortSignal): Promise<LibraryClassesDto> {
  const query = new URLSearchParams()
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value))
  })
  return portalRequestJson<LibraryClassesDto>(
    `/search/classes?${query}`,
    { method: 'GET' },
    { basePath: API_V1 },
    signal,
  )
}
