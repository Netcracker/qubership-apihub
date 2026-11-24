import { KeyOfConstType } from '../external'
import { MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../../consts'

export type MessageSeverity = KeyOfConstType<typeof MESSAGE_SEVERITY>

export type MessageCategory = typeof MESSAGE_CATEGORY[keyof typeof MESSAGE_CATEGORY]

export interface PackageNotifications {
  notifications: NotificationMessage[]
}

export interface PackageComparisonNotifications {
  comparisons: PackageComparisonNotificationsEntry[]
}

export interface PackageComparisonNotificationsEntry {
  packageId: string
  version: string
  revision?: number
  previousVersionPackageId: string
  previousVersion: string
  previousVersionRevision?: number
  notifications: NotificationMessage[]
}

/**
 * The messages a failed `build` or `changelog` build had collected: what a `NotificationsError` carries and what
 * the `notifications` part of the `status=error` request sends.
 */
export interface FailedBuildNotifications {
  notifications: NotificationMessage[]
  comparisonNotifications: NotificationMessage[]
}

/**
 * One problem the build found, in the shape both notification files carry.
 *
 * `category` is the stable code a consumer filters on; `message` is written for a human and its wording is
 * not a contract.
 */
export interface NotificationMessage {
  category: MessageCategory
  severity: MessageSeverity
  message: string
  // the document slug, never a fileId — see `createFileSlugs`. Absent when the message is not about a document
  documentId?: string
}
