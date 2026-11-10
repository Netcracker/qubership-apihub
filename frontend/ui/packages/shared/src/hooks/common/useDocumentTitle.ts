import { useEffect } from 'react'

import { buildDocumentTitle, type DocumentTitleFormat, type DocumentTitleSegments } from '../../utils/document-title'

/**
 * Sets the browser tab title, which is also the label of the page in the browser history.
 *
 * Call it once per route, in the component that owns the route (the leaf page),
 * and never in its parents: child effects run before parent ones, so a parent
 * would overwrite the title set by its child.
 */
export function useDocumentTitle(
  segments: DocumentTitleSegments,
  format: DocumentTitleFormat,
): void {
  const title = buildDocumentTitle(segments, format)
  const { appName } = format

  useEffect(() => {
    document.title = title
    // Cleanup of the previous page runs before the effect of the next one in the same commit,
    // so there is no flicker, and a page without its own title falls back to the app name.
    return () => {
      document.title = appName
    }
  }, [title, appName])
}
