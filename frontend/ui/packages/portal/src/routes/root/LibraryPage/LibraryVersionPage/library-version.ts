import { generatePath } from 'react-router-dom'

import { LIBRARY_VERSION_PAGE_PATH_PATTERN } from '../../../../routes'

export function getLibraryVersionPath(libraryId: string, versionId: string, tab = 'overview/summary'): string {
  return `${
    generatePath(LIBRARY_VERSION_PAGE_PATH_PATTERN, {
      libraryId: encodeURIComponent(libraryId),
      versionId: encodeURIComponent(versionId),
    })
  }/${tab}`
}

export function getLibraryJavaClassPath(libraryId: string, versionId: string, className: string): string {
  return getLibraryVersionPath(libraryId, versionId, `classes/${encodeURIComponent(className)}`)
}
