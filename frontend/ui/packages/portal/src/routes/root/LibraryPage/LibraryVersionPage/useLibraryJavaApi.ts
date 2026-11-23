import { useQuery, useQueryClient } from '@tanstack/react-query'

import { JavaApiClassListBuilder, type JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import type { LibraryJavaApiDocumentDto } from '@portal/entities/libraries'
import { requestJsonWithError } from '@portal/utils/requestJsonWithError'
import { LIBRARIES_API_BASE_PATH } from '@portal/utils/requests'
import { type JavaApiDocumentKind, type PreviousLibraryVersion, setPreviousLibraryVersion } from './javaapi/javaApi'
import { useInvalidateLibraryChanges } from './useLibraryChanges'

type LibraryJavaApiData = {
  document: LibraryJavaApiDocumentDto
  classes: ReadonlyArray<JavaApiClassListItem>
}

type LibraryJavaApiResult = {
  data: LibraryJavaApiData | null | undefined
  isLoading: boolean
  error: Error | null
}

type InvalidateLibraryJavaApi = (libraryId: Key) => Promise<void>

const libraryJavaApiReportQueryKey = (
  libraryId: Key | undefined,
): readonly ['library-java-api-report', Key | undefined] => ['library-java-api-report', libraryId]

const libraryJavaApiDiffQueryKey = (
  libraryId: Key | undefined,
): readonly ['library-java-api-diff', Key | undefined] => ['library-java-api-diff', libraryId]

export function useLibraryJavaApiReport(
  libraryId: Key | undefined,
  version: string | undefined,
): LibraryJavaApiResult {
  const { data, isLoading, error } = useQuery<LibraryJavaApiData | null, Error>({
    queryKey: [...libraryJavaApiReportQueryKey(libraryId), version],
    queryFn: ({ signal }) => getLibraryJavaApi(libraryId!, version!, 'report', undefined, signal),
    enabled: !!libraryId && !!version,
    staleTime: Infinity,
  })
  return { data, isLoading, error }
}

export function useLibraryJavaApiDiff(
  libraryId: Key | undefined,
  version: string | undefined,
  previous?: PreviousLibraryVersion,
): LibraryJavaApiResult {
  const { data, isLoading, error } = useQuery<LibraryJavaApiData | null, Error>({
    queryKey: [
      ...libraryJavaApiDiffQueryKey(libraryId),
      version,
      previous?.previousLibraryId,
      previous?.previousVersion,
    ],
    queryFn: ({ signal }) => getLibraryJavaApi(libraryId!, version!, 'diff', previous, signal),
    enabled: !!libraryId && !!version,
    staleTime: Infinity,
  })
  return { data, isLoading, error }
}

export function useInvalidateLibraryJavaApi(): InvalidateLibraryJavaApi {
  const queryClient = useQueryClient()
  const invalidateLibraryChanges = useInvalidateLibraryChanges()
  return async libraryId => {
    const queryKeys = [libraryJavaApiReportQueryKey(libraryId), libraryJavaApiDiffQueryKey(libraryId)]
    // Remove inactive entries first: refetchOnMount is off, so a cache that only went stale would be shown again
    queryKeys.forEach(queryKey => queryClient.removeQueries({ queryKey: queryKey, type: 'inactive' }))
    await Promise.all(queryKeys.map(queryKey => queryClient.invalidateQueries({ queryKey })))
    await invalidateLibraryChanges(libraryId)
  }
}

async function getLibraryJavaApi(
  libraryId: Key,
  version: string,
  kind: JavaApiDocumentKind,
  previous?: PreviousLibraryVersion,
  signal?: AbortSignal,
): Promise<LibraryJavaApiData | null> {
  const query = new URLSearchParams()
  setPreviousLibraryVersion(query, previous)
  // TODO(libraries-backend): The service serves no jdiff report/diff document or class content.
  // API Reference and the class page show "not available" on 404/421 until these are served.
  const path = `/libraries/${encodeURIComponent(libraryId)}/versions/${encodeURIComponent(version)}/java-api/${kind}`
  let document: LibraryJavaApiDocumentDto
  try {
    document = await requestJsonWithError<LibraryJavaApiDocumentDto>(
      query.size ? `${path}?${query}` : path,
      { method: 'GET' },
      { basePath: LIBRARIES_API_BASE_PATH },
      signal,
    )
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 421)) return null
    throw error
  }
  const classes = new JavaApiClassListBuilder({ source: document }).build()
  return { document, classes }
}
