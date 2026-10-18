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
