import { useQuery } from '@tanstack/react-query'

import { JavaApiClassListBuilder, type JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import type { LibraryJavaApiDocumentDto } from '@portal/entities/libraries'
import { requestJsonWithError } from '@portal/utils/requestJsonWithError'
import { type JavaApiDocumentKind, type PreviousLibraryVersion, setPreviousLibraryVersion } from './javaapi/java-api'

// The 404 code that means "no such document yet", answered with null instead of an error
const NOT_FOUND_ERROR_CODES: Record<JavaApiDocumentKind, string> = {
  report: 'LIBRARY_JAVA_API_REPORT_NOT_FOUND',
  diff: 'LIBRARY_COMPARISON_NOT_FOUND',
}

type LibraryJavaApiData = {
  document: LibraryJavaApiDocumentDto
  classes: ReadonlyArray<JavaApiClassListItem>
}

type LibraryJavaApiResult = {
  data: LibraryJavaApiData | null | undefined
  isLoading: boolean
  error: Error | null
}

export function useLibraryJavaApiReport(
  libraryId: Key | undefined,
  version: string | undefined,
): LibraryJavaApiResult {
  const { data, isLoading, error } = useQuery<LibraryJavaApiData | null, Error>({
    queryKey: ['library-java-api-report', libraryId, version],
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
    queryKey: ['library-java-api-diff', libraryId, version, previous?.previousLibraryId, previous?.previousVersion],
    queryFn: ({ signal }) => getLibraryJavaApi(libraryId!, version!, 'diff', previous, signal),
    enabled: !!libraryId && !!version,
    staleTime: Infinity,
  })
  return { data, isLoading, error }
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
  const path = `/libraries/${encodeURIComponent(libraryId)}/versions/${encodeURIComponent(version)}/java-api/${kind}`
  let document: LibraryJavaApiDocumentDto
  try {
    document = await requestJsonWithError<LibraryJavaApiDocumentDto>(
      query.size ? `${path}?${query}` : path,
      { method: 'GET' },
      { basePath: API_V1 },
      signal,
    )
  } catch (error) {
    if (error instanceof HttpError && error.status === 404 && error.code === NOT_FOUND_ERROR_CODES[kind]) {
      return null
    }
    throw error
  }
  const classes = new JavaApiClassListBuilder({ source: document }).build()
  return { document, classes }
}
