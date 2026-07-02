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
import { MessageSeverity, NotificationMessage } from '../../types/package/notifications'
import { MESSAGE_SEVERITY } from '../../consts'
import { ParsedDdlData } from './ddl.types'

/**
 * Map a single non-fatal `buildFromDdl` issue to its notification severity (Task 12):
 * - `out-of-scope-statement` → Warning (one per statement — D7)
 * - `unresolved-reference` / `unresolved-like-source` → Warning (the partial entity is still built — D8)
 * - `duplicate-object` → Error (breaks the publish, like an MCP duplicate id)
 */
function severityOf(kind: DdlNonFatalError['kind']): MessageSeverity {
  return kind === DdlErrorKind.DuplicateObject ? MESSAGE_SEVERITY.Error : MESSAGE_SEVERITY.Warning
}

/**
 * Validate a built DDL document's parse issues: push one notification per issue (severity by kind,
 * carrying `fileId`), and **throw** if any `duplicate-object` is present so the publish breaks. Warnings
 * (out-of-scope / unresolved) never abort — the partial entity is kept (D8), no `incomplete` flag.
 */
export function validateDdlDocument(document: VersionDocument<ParsedDdlData>, notifications: NotificationMessage[]): void {
  const issues = document.data.issues ?? []

  for (const issue of issues) {
    notifications.push({
      severity: severityOf(issue.kind),
      message: issue.message,
      fileId: document.fileId,
    })
  }

  const duplicate = issues.find(issue => issue.kind === DdlErrorKind.DuplicateObject)
  if (duplicate) {
    // breaks the publish; the Error notification was already recorded above
    throw new Error(`DDL document '${document.fileId}' contains a duplicate object: ${duplicate.message}`)
  }
}
