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

/** Slugs a build-phase Error names. Only these documents are flagged; a comparison error flags no document. */
export function erroredDocumentSlugs(notifications: NotificationMessage[]): Set<string> {
  const slugs = new Set<string>()
  for (const { severity, documentId } of notifications) {
    if (severity === MESSAGE_SEVERITY.Error && documentId) { slugs.add(documentId) }
  }
  return slugs
}
