import { MessageCategory, MessageSeverity, NotificationMessage } from '../types/package/notifications'

/** Everything that claimed one id, keyed by it. A document claiming an id twice is its own diagnostic. */
export type Claims<T> = Map<string, T[]>

export function collectClaim<T>(claims: Claims<T>, key: string, claimant: T): void {
  const claimants = claims.get(key)
  if (claimants) { claimants.push(claimant) } else { claims.set(key, [claimant]) }
}

/**
 * Report every id two or more documents claimed, one message per document.
 *
 * One message naming them all would leave every document but one unflagged, so each claimant gets its own,
 * carrying the same text. A document claiming one id twice is its own diagnostic, not a collision.
 *
 * The severity belongs to the collision, not to a claimant: every claimant is graded and the strictest grade
 * wins (`Error` is 0, `Warning` is 1). Taking one claimant's grade would let `config.files` order decide the
 * answer for any `severityOf` that ever tells two claimants apart.
 */
export function reportCollisions<T extends { documentId: string }>(
  claims: Claims<T>,
  notifications: NotificationMessage[],
  category: MessageCategory,
  severityOf: (claimant: T) => MessageSeverity,
  describe: (key: string, documentIds: string[]) => string,
): void {
  for (const [key, claimants] of claims) {
    const documentIds = [...new Set(claimants.map(({ documentId }) => documentId))].sort()
    if (documentIds.length < 2) { continue }

    const severity = Math.min(...claimants.map(severityOf)) as MessageSeverity
    const message = describe(key, documentIds)
    for (const documentId of documentIds) {
      notifications.push({ category, severity, message, documentId })
    }
  }
}

/** `'a' and 'b'` for a pair, `'a', 'b', 'c'` beyond it. */
export function listDocuments(documentIds: string[]): string {
  const quoted = documentIds.map(documentId => `'${documentId}'`)
  return quoted.length === 2 ? `${quoted[0]} and ${quoted[1]}` : quoted.join(', ')
}
