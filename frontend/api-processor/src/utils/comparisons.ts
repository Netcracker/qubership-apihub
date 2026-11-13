import { MESSAGE_SEVERITY } from '../consts'
import { NotificationMessage } from '../types/package/notifications'

export interface ComparisonErrorSource {
  fromCache: boolean
  hasErrors?: boolean
  notifications: NotificationMessage[]
}

/**
 * Whether a comparison is known to be wrong.
 *
 * A comparison calculated here answers from its own notifications. A cached one was not calculated, so
 * deriving `false` from its empty list would be a lie — the flag is a property of the comparison that the
 * host already holds and the resolver returned, and it travels through unchanged.
 */
export const comparisonHasErrors = ({ fromCache, hasErrors, notifications }: ComparisonErrorSource): boolean =>
  (fromCache
    ? hasErrors === true
    : notifications.some(({ severity }) => severity === MESSAGE_SEVERITY.Error))
