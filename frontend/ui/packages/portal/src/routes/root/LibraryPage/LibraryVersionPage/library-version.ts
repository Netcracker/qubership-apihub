import { generatePath } from 'react-router-dom'

import type { LibraryVersion, MavenLibraryDto } from '@portal/entities/libraries'
import {
  type API_CHANGES_PAGE,
  type CONTRACTS_PAGE,
  LIBRARY_JAVA_CLASS_PAGE_PATH_PATTERN,
  LIBRARY_VERSION_PAGE_PATH_PATTERN,
  OVERVIEW_PAGE,
  SUMMARY_PAGE,
} from '../../../../routes'

export type LibraryVersionPageRoute = typeof OVERVIEW_PAGE | typeof CONTRACTS_PAGE | typeof API_CHANGES_PAGE
export type LibraryVersionPageProps = Readonly<{ library: MavenLibraryDto; version: LibraryVersion }>

export function getLibraryVersionPath(
  libraryId: string,
  versionId: string,
  tab = `${OVERVIEW_PAGE}/${SUMMARY_PAGE}`,
): string {
  return `${
    generatePath(LIBRARY_VERSION_PAGE_PATH_PATTERN, {
      libraryId: encodeURIComponent(libraryId),
      versionId: encodeURIComponent(versionId),
    })
  }/${tab}`
}

export function getLibraryJavaClassPath(libraryId: string, versionId: string, className: string): string {
  return generatePath(LIBRARY_JAVA_CLASS_PAGE_PATH_PATTERN, {
    libraryId: encodeURIComponent(libraryId),
    versionId: encodeURIComponent(versionId),
    className: encodeURIComponent(className),
  })
}
