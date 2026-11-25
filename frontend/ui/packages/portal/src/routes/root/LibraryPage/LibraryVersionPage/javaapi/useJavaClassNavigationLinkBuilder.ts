import { useCallback } from 'react'
import { createPath, useParams } from 'react-router-dom'

import type { JavaApiNavigationLinkBuilder } from '@netcracker/qubership-apihub-api-doc-viewer'

import { getJavaReferenceLink } from './javaApi'
import { useJavaTypeFilter } from './JavaTypeFilter'

// A type link opens the type in the API Reference of this version, also from the compare page, as a table link of
// the package table comparison opens the table page
export function useJavaClassNavigationLinkBuilder(): JavaApiNavigationLinkBuilder {
  const { libraryId, versionId } = useParams()
  const [javaType] = useJavaTypeFilter()

  return useCallback((className: string) => {
    if (!libraryId || !versionId) return '#'
    return createPath(getJavaReferenceLink(libraryId, versionId, className, javaType))
  }, [libraryId, versionId, javaType])
}
