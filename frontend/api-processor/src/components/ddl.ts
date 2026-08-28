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
import { DuplicateHandler, setReportingDuplicate } from '../utils'

export interface DdlBuildContext {
  ddlEntities: DdlEntityIndex
}

export function createDdlBuildContext(): DdlBuildContext {
  return {
    ddlEntities: new Map(),
  }
}

export type DuplicateDdlEntityHandler = DuplicateHandler<DdlEntity>

export const createDuplicateDdlEntityHandler = (): DuplicateDdlEntityHandler => (existing, duplicate) => {
  // the same document re-processed is not a cross-document duplicate
  if (existing.documentId === duplicate.documentId) { return }
  throw new Error(
    `Duplicate DDL entity ID '${duplicate.ddlEntityId}' found in different documents: '${existing.documentId}' and '${duplicate.documentId}'`,
  )
}

/**
 * Merge a document's DDL entities into the build's flat entity index. This is where **cross-document**
 * `ddlEntityId` collisions are detected (Error, breaks publish — D10); intra-document collisions are
 * already caught in `buildDdlEntities`. Mirrors `processMcpDocument`. Per D14 (no incremental rebuild),
 * the document does not track which entities it owns.
 */
export function processDdlDocument(
  file: BuildConfigFile,
  document: VersionDocument,
  builder: ApiBuilder,
  ctx: DdlBuildContext,
  onDuplicate?: DuplicateDdlEntityHandler,
): void {
  if (!builder.buildDdlEntities) { return }
  const entities: DdlEntity[] = builder.buildDdlEntities(document, file)
  for (const entity of entities) {
    setReportingDuplicate(ctx.ddlEntities, entity.ddlEntityId, entity, onDuplicate)
  }
}

export const KIND_TO_FIELD: Record<DdlKind, keyof PackageDdlFile> = {
  [DDL_KIND.TABLE]: 'tables',
}

/** Group the flat entity index into the `{ tables }` shape written to `ddl.json` (payload stripped). */
export function groupDdlEntitiesByKind(entities: DdlEntityIndex): PackageDdlFile {
  const grouped: PackageDdlFile = { tables: [] }
  for (const { data: _data, ...index } of entities.values()) {
    // strip the payload (`data`) — ddl.json is the lightweight index; payloads live in ddl/<id>
    grouped[KIND_TO_FIELD[index.kind]].push(index as PackageDdlEntity)
  }
  return grouped
}
