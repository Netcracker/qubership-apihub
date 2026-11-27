import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { JavaApiClassListBuilder, type JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import type {
  LibraryChangeDto,
  LibraryChangesDto,
  LibraryClassDetailsDto,
  LibraryJavaApiDocumentDto,
  LibraryNestedClassChangeDto,
} from '@portal/entities/libraries'
import { useAutoFetchInfinitePages } from '@portal/routes/root/PortalPage/VersionPage/useAutoFetchInfinitePages'
import { requestJsonWithError } from '@portal/utils/requestJsonWithError'
import { LIBRARIES_API_BASE_PATH } from '@portal/utils/requests'
import type { JavaApiDocumentKind, PreviousLibraryVersion } from './javaapi/javaApi'
import { toClassReportRows, toDiffRows, toJavaApiDocument } from './javaapi/libraryClassDocument'
import { getLibraryChanges } from './useLibraryChanges'
import { useLibraryClasses } from './useLibraryClasses'

export const LIBRARY_CLASS_QUERY_KEY = 'library-class'
export const LIBRARY_CLASS_CHANGES_QUERY_KEY = 'library-class-changes'
const PAGE_SIZE = 100

type LibraryClassDetailsResult = {
  data: LibraryClassDetailsDto | null | undefined
  isLoading: boolean
  error: Error | null
}

type LibraryClassChangesResult = {
  data: Pick<LibraryChangesDto, 'changes' | 'nestedChanges'> | null | undefined
  isLoading: boolean
  error: Error | null
}

// What the service returned for the class, shown as is in Raw view
type LibraryJavaClassRaw = {
  class: LibraryClassDetailsDto | null
  changes?: readonly LibraryChangeDto[]
  nestedChanges?: readonly LibraryNestedClassChangeDto[]
}

type LibraryJavaClassData = {
  document: LibraryJavaApiDocumentDto
  javaClass: JavaApiClassListItem | undefined
  raw: LibraryJavaClassRaw
}

type LibraryJavaClassResult = {
  data: LibraryJavaClassData | null | undefined
  isLoading: boolean
  error: Error | null
}

export function useLibraryClassDetails(
  libraryId: Key | undefined,
  version: string | undefined,
  classId: string | undefined,
): LibraryClassDetailsResult {
  const { data, isInitialLoading, error } = useQuery<LibraryClassDetailsDto | null, Error>({
    queryKey: [LIBRARY_CLASS_QUERY_KEY, libraryId, version, classId],
    queryFn: ({ signal }) => getLibraryClassDetails(libraryId!, version!, classId!, signal),
    enabled: !!libraryId && !!version && !!classId,
    staleTime: Infinity,
  })
  return { data: data, isLoading: isInitialLoading, error: error }
}

function useLibraryClassChanges(
  libraryId: Key | undefined,
  version: string | undefined,
  previous: PreviousLibraryVersion | undefined,
  classId: string | undefined,
): LibraryClassChangesResult {
  const { data, isLoading, error, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteQuery<
    LibraryChangesDto | null,
    Error
  >({
    queryKey: [
      LIBRARY_CLASS_CHANGES_QUERY_KEY,
      libraryId,
      version,
      previous?.previousLibraryId,
      previous?.previousVersion,
      classId,
    ],
    queryFn: ({ pageParam = 0, signal }) =>
      getLibraryChanges<LibraryChangesDto>(libraryId!, version!, 'changes', previous, signal, pageParam, classId!),
    enabled: !!libraryId && !!version && !!classId,
    staleTime: Infinity,
    getNextPageParam: (lastPage, allPages) => (lastPage?.changes.length === PAGE_SIZE ? allPages.length : undefined),
  })
  useAutoFetchInfinitePages({
    isLoading: isLoading,
    isFetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
    fetchNextPage: fetchNextPage,
    enabled: !error,
  })
  const result = useMemo(() => {
    if (!data) return undefined
    if (data.pages.some(page => page === null)) return null
    return {
      changes: data.pages.flatMap(page => page?.changes ?? []),
      nestedChanges: data.pages[0]?.nestedChanges ?? [],
    }
  }, [data])
  const hasPendingPages = !!hasNextPage && !error
  return {
    data: result,
    isLoading: isLoading || isFetchingNextPage || hasPendingPages,
    error: error,
  }
}

export function useLibraryJavaClass(
  libraryId: Key | undefined,
  version: string | undefined,
  className: string,
  kind: JavaApiDocumentKind,
  previous?: PreviousLibraryVersion,
): LibraryJavaClassResult {
  const { data: details, isLoading: isDetailsLoading, error: detailsError } = useLibraryClassDetails(
    libraryId,
    version,
    className,
  )
  // Load class names in the background to link signature types; the query is shared across class previews.
  const { data: classes } = useLibraryClasses(
    kind === 'report' ? libraryId : undefined,
    kind === 'report' ? version : undefined,
  )
  const { data: classChanges, isLoading: isChangesLoading, error: changesError } = useLibraryClassChanges(
    kind === 'diff' ? libraryId : undefined,
    kind === 'diff' ? version : undefined,
    previous,
    kind === 'diff' ? className : undefined,
  )
  const result = useMemo((): LibraryJavaClassData | null | undefined => {
    let document: LibraryJavaApiDocumentDto
    let raw: LibraryJavaClassRaw
    if (kind === 'report') {
      if (details === undefined) return undefined
      document = toJavaApiDocument(toClassReportRows(classes ?? [], details))
      raw = { class: details }
    } else {
      if (classChanges === undefined || details === undefined) return undefined
      if (classChanges === null) return null
      const { changes, nestedChanges = [] } = classChanges
      if (!details && !changes.length && !nestedChanges.length) return null
      document = toJavaApiDocument(toDiffRows(details ?? undefined, changes, nestedChanges))
      raw = { class: details, changes: changes, nestedChanges: nestedChanges }
    }
    return {
      document: document,
      javaClass: new JavaApiClassListBuilder({ source: document })
        .build()
        .find((item: JavaApiClassListItem) => item.className === className),
      raw: raw,
    }
  }, [kind, classes, details, classChanges, className])
  const isLoading = isDetailsLoading || (kind === 'diff' && isChangesLoading)
  return {
    data: isLoading ? undefined : result,
    isLoading: isLoading,
    error: detailsError ?? (kind === 'diff' ? changesError : null),
  }
}

async function getLibraryClassDetails(
  libraryId: Key,
  version: string,
  classId: string,
  signal?: AbortSignal,
): Promise<LibraryClassDetailsDto | null> {
  try {
    return await requestJsonWithError<LibraryClassDetailsDto>(
      `/libraries/${encodeURIComponent(libraryId)}/versions/${encodeURIComponent(version)}/classes/${
        encodeURIComponent(classId)
      }`,
      { method: 'GET' },
      { basePath: LIBRARIES_API_BASE_PATH },
      signal,
    )
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null
    throw error
  }
}
