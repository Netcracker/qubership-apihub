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

import { ApiBuilder, BuildConfigFile, VersionDocument } from '../types'
import {
  DDL_KIND,
  DdlEntity,
  DdlEntityIndex,
  DdlKind,
  PackageDdlEntity,
  PackageDdlFile,
} from '../types/package/ddl'
import { setReportingDuplicate } from '../utils'
import { Claims, listDocuments, reportCollisions } from './duplicate-resolution'
import { MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../consts'
import { NotificationMessage } from '../types/package'

export interface DdlBuildContext {
  ddlEntities: DdlEntityIndex
}

export function createDdlBuildContext(): DdlBuildContext {
  return {
    ddlEntities: new Map(),
  }
}

/** Cross-document DDL entity collisions, one message per claimant — see `reportCollisions`. */
export function reportDdlCollisions(claims: Claims<DdlEntity>, notifications: NotificationMessage[]): void {
  reportCollisions(
    claims,
    notifications,
    MESSAGE_CATEGORY.DdlDuplicateEntity,
    () => MESSAGE_SEVERITY.Error,
    (ddlEntityId, documentIds) =>
      `Duplicate DDL entity ID '${ddlEntityId}' found in different documents: ${listDocuments(documentIds)}`,
  )
}

/** Everything the document builds, claimed by nobody yet — see `indexDdlEntities`. */
export function buildDocumentDdlEntities(
  file: BuildConfigFile,
  document: VersionDocument,
  builder: ApiBuilder,
  notifications?: NotificationMessage[],
): DdlEntity[] {
  return builder.buildDdlEntities ? builder.buildDdlEntities(document, file, notifications) : []
}

/**
 * Merge a document's DDL entities into the build's flat entity index. Cross-document collisions are reported
 * by `reportDdlCollisions` before anything is indexed; intra-document ones are caught per entity in
 * `buildDdlEntities`. Mirrors `indexMcpEntities`, except that the document does not track which entities it
 * owns — there is no incremental DDL rebuild for `reconcileOwnedIds` to serve.
 */
export function indexDdlEntities(
  entities: DdlEntity[],
  ctx: DdlBuildContext,
): void {
  for (const entity of entities) {
    setReportingDuplicate(ctx.ddlEntities, entity.ddlEntityId, entity)
  }
}

export const KIND_TO_FIELD: Record<DdlKind, keyof PackageDdlFile> = {
  [DDL_KIND.TABLE]: 'tables',
}

/** Group the flat entity index into the per-kind shape written to `ddl.json`, keyed by `KIND_TO_FIELD`. */
export function groupDdlEntitiesByKind(entities: DdlEntityIndex): PackageDdlFile {
  const grouped: PackageDdlFile = { tables: [] }
  for (const { data: _data, ...index } of entities.values()) {
    // ddl.json is the lightweight index; payloads live in ddl/<id>
    grouped[KIND_TO_FIELD[index.kind]].push(index as PackageDdlEntity)
  }
  return grouped
}
