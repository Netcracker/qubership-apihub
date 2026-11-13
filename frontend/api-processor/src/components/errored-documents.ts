import { MESSAGE_SEVERITY } from '../consts'
import { NotificationMessage } from '../types/package/notifications'

/** Slugs a build-phase Error names. Only these documents are flagged; a comparison error flags no document. */
export function erroredDocumentSlugs(notifications: NotificationMessage[]): Set<string> {
  const slugs = new Set<string>()
  for (const { severity, documentId } of notifications) {
    if (severity === MESSAGE_SEVERITY.Error && documentId) { slugs.add(documentId) }
  }
  return slugs
}
