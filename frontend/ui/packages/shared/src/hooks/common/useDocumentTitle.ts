import { createContext, useContext, useEffect } from 'react'

import {
  buildDocumentTitle,
  createDocumentTitleFormat,
  type DocumentTitleFormat,
  type DocumentTitleSegments,
} from '../../utils/document-title'
import { APIHUB_APP_NAME } from '../../utils/document-title-labels'

/**
 * The title format of the app. Each app provides it once at its root, so pages and shared components
 * (the login and error pages) pass only their segments and get the name of the app they run in.
 */
export const DocumentTitleFormatContext = createContext<DocumentTitleFormat>(createDocumentTitleFormat(APIHUB_APP_NAME))

/**
 * Sets the browser tab title, which is also the label of the page in the browser history.
 *
 * Call it once per route, in the component that owns the route (the leaf page),
 * and never in its parents: child effects run before parent ones, so a parent
 * would overwrite the title set by its child.
 */
export function useDocumentTitle(segments: DocumentTitleSegments): void {
  const format = useContext(DocumentTitleFormatContext)
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
