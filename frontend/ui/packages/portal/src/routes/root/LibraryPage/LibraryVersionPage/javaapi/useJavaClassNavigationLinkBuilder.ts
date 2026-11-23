import { useCallback } from 'react'
import { createPath, useParams } from 'react-router-dom'

import type { JavaApiNavigationLinkBuilder } from '@netcracker/qubership-apihub-api-doc-viewer'

import { getJavaClassPageLink, type JavaApiDocumentKind, type PreviousLibraryVersion } from './javaApi'

export function useJavaClassNavigationLinkBuilder(
  kind: JavaApiDocumentKind = 'report',
  previous?: PreviousLibraryVersion,
): JavaApiNavigationLinkBuilder {
  const { libraryId, versionId } = useParams()
  const { previousLibraryId, previousVersion } = previous ?? {}

  return useCallback((className: string) => {
    if (!libraryId || !versionId) return '#'
    return createPath(getJavaClassPageLink(libraryId, versionId, className, kind, {
      previousLibraryId,
      previousVersion,
    }))
  }, [libraryId, versionId, kind, previousLibraryId, previousVersion])
}
