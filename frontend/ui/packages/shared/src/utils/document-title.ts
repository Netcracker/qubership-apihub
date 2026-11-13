import { DOCUMENT_TITLE_APP_NAME_SEPARATOR, DOCUMENT_TITLE_SEGMENT_SEPARATOR } from './document-title-labels'

export type DocumentTitleSegment = string | null | undefined

export type DocumentTitleSegments = ReadonlyArray<DocumentTitleSegment>

export type DocumentTitleFormat = Readonly<{
  appName: string
  segmentSeparator: string
  appNameSeparator: string
}>

/** The title format of an app: the separators are common to all apps, only the app name differs. */
export function createDocumentTitleFormat(appName: string): DocumentTitleFormat {
  return {
    appName: appName,
    segmentSeparator: DOCUMENT_TITLE_SEGMENT_SEPARATOR,
    appNameSeparator: DOCUMENT_TITLE_APP_NAME_SEPARATOR,
  }
}

/**
 * Builds a browser tab title from the most specific segment to the least specific one,
 * with the application name at the end: browsers truncate long titles from the end,
 * so the part that tells pages apart has to come first.
 * Empty segments (data that is not loaded yet) are skipped, so a page gets a partial title
 * right away and the full one once its data arrives.
 */
export function buildDocumentTitle(
  segments: DocumentTitleSegments,
  format: DocumentTitleFormat,
): string {
  const { appName, segmentSeparator, appNameSeparator } = format
  const meaningfulSegments = segments
    .map(segment => segment?.trim())
    .filter((segment): segment is string => !!segment)

  return meaningfulSegments.length
    ? `${meaningfulSegments.join(segmentSeparator)}${appNameSeparator}${appName}`
    : appName
}
