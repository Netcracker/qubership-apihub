/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { MESSAGE_SEVERITY, VERSION_STATUS } from '../consts'
import { NotificationsError } from '../errors'
import { NotificationMessage } from '../types/package/notifications'
import { buildNotifications } from './build-result-index'

const DRAFT_HINT = 'You can publish version in draft status for troubleshooting'

/**
 * Every comparison-phase message of the build, wherever it was raised.
 *
 * Most live on the pair that produced them, and a pair's operation and DDL comparisons share one array, so
 * the arrays are collected by identity rather than concatenated. The build-level array holds only what was
 * raised before any pair existed: resolving the previous version, enumerating references.
 */
export function comparisonPhaseNotifications(buildResult: {
  comparisonNotifications: NotificationMessage[]
  comparisons: Array<{ notifications: NotificationMessage[] }>
  ddlComparisons: Array<{ notifications: NotificationMessage[] }>
}): NotificationMessage[] {
  const arrays = new Set<NotificationMessage[]>([buildResult.comparisonNotifications])
  for (const { notifications } of [...buildResult.comparisons, ...buildResult.ddlComparisons]) {
    arrays.add(notifications)
  }
  return [...arrays].flat()
}

/**
 * A `release` does not publish while anything is known to be wrong. There is no downgrade: the build throws.
 *
 * Both streams block. Build-phase errors mean the version's own documents are unsound; comparison-phase ones
 * mean the changelog is unreliable, and a release that declares a `previousVersion` is expected to ship
 * trustworthy changes. Which stream a message came from still decides what gets flagged — a comparison error
 * marks the comparison, never the version — but not whether the release publishes.
 */
export function assertReleaseIsPublishable(
  status: string,
  notifications: NotificationMessage[],
  comparisonNotifications: NotificationMessage[],
): void {
  if (status !== VERSION_STATUS.RELEASE) { return }

  const isError = ({ severity }: NotificationMessage): boolean => severity === MESSAGE_SEVERITY.Error
  const buildErrors = notifications.filter(isError)
  const changelogErrors = comparisonNotifications.filter(isError)

  const total = buildErrors.length + changelogErrors.length
  if (total === 0) { return }

  throw new Error(releaseFailureMessage(buildErrors, changelogErrors, total))
}

/**
 * Wrap a fatal failure of a `build` or `changelog` build in a `NotificationsError` with the messages both streams
 * had collected.
 *
 * The lists are new arrays, because the next `run()` empties the builder's arrays in place. One message can sit
 * in two of the arrays passed in: with no comparison, `BuildStrategy` copies its root array into
 * `comparisonNotifications`. Each message is kept once, by identity.
 */
export function toNotificationsError(
  error: unknown,
  notifications: NotificationMessage[],
  comparisonArrays: NotificationMessage[][],
): NotificationsError {
  return new NotificationsError(
    error,
    buildNotifications(notifications).notifications,
    buildNotifications([...new Set(comparisonArrays.flat())]).notifications,
  )
}

/**
 * The text of the refusal: a single failure reports itself verbatim, several are summarised with the
 * documents to open.
 *
 * The publisher must not have to republish as a draft to find out what is wrong. Every branch ends on the
 * same hint, so the way forward is discoverable however many errors there are.
 */
function releaseFailureMessage(
  buildErrors: NotificationMessage[],
  changelogErrors: NotificationMessage[],
  total: number,
): string {
  if (total === 1) {
    const [only] = [...buildErrors, ...changelogErrors]
    const document = only.documentId ? ` (document: ${only.documentId})` : ''
    return `${only.message}${document}. ${DRAFT_HINT}`
  }

  const documentIds = [...new Set([...buildErrors, ...changelogErrors]
    .map(({ documentId }) => documentId)
    .filter((documentId): documentId is string => !!documentId))].sort()

  const prefix = `Cannot publish version in release status: ${total} critical errors`
  // the branch is chosen by the absence of build errors, not of slugs: a comparison error may name a document
  if (!buildErrors.length) {
    return `${prefix} in the changelog. ${DRAFT_HINT}`
  }

  // naming the changelog share keeps a mixed failure from sending the publisher hunting through documents
  const changelogShare = changelogErrors.length
    ? `, including ${changelogErrors.length} changelog errors`
    : ''
  // the clause is dropped when nothing named a document, so the message never ends in an empty list
  const documents = documentIds.length ? ` in following documents: ${documentIds.join(', ')}` : ''
  return `${prefix}${documents}${changelogShare}. ${DRAFT_HINT}`
}
