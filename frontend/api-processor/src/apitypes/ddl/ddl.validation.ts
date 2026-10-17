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

import { DdlErrorKind } from '@netcracker/qubership-apihub-ddlapi'
import type { DdlNonFatalError } from '@netcracker/qubership-apihub-ddlapi/parser'
import { VersionDocument } from '../../types'
import { MessageCategory, NotificationMessage } from '../../types/package/notifications'
import { MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../../consts'
import { ParsedDdlData } from './ddl.types'

// A duplicate object is its own diagnostic; every other parse issue shares one category
function categoryOf(kind: DdlNonFatalError['kind']): MessageCategory {
  return kind === DdlErrorKind.DuplicateObject
    ? MESSAGE_CATEGORY.DdlDuplicateObject
    : MESSAGE_CATEGORY.DdlParseIssue
}

/**
 * Report a DDL document's parse issues, one notification per issue, against the document's slug.
 *
 * Every one of them is an `Error`: an out-of-scope statement or an unresolved reference leaves the built
 * Realm incomplete, and a release must not ship an incomplete DDL contract. Nothing here aborts the publish,
 * and the partial entity is kept with no `incomplete` flag.
 */
export function validateDdlDocument(document: VersionDocument<ParsedDdlData>, notifications: NotificationMessage[]): void {
  const issues = document.data.issues ?? []

  for (const issue of issues) {
    notifications.push({
      category: categoryOf(issue.kind),
      severity: MESSAGE_SEVERITY.Error,
      message: issue.message,
      documentId: document.slug,
    })
  }
}
