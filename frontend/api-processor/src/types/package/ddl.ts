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

export const DDL_KIND = {
  TABLE: 'table',
  // VIEW: 'view' — reserved for a later version (v1 ships `table` only)
} as const

export type DdlKind = typeof DDL_KIND[keyof typeof DDL_KIND]

/**
 * Stable identifier of a DDL entity: `{schemaName}-{kind}-{name}`, each segment
 * slugified independently (see `calculateDdlEntityId`). Opaque — never parsed back into parts.
 */
export type DdlEntityId = string

export interface DdlEntitySearch {
  useEntityDataAsSearchText: boolean
}

/**
 * The human-facing identity of a DDL entity. Defined once and reused by both the build index
 * row (`PackageDdlEntity`) and the changelog metadata (`DdlChangesMetadata`).
 */
export interface DdlEntityDescriptor {
  kind: DdlKind // 'table' (v1)
  name: string // table name
  schemaName: string // entity scope (mcpEndpoint analog)
  description: string // COMMENT ON TABLE, '' if none
}

/** The `ddl.json` index row (payload stripped — `data` lives in `ddl/<ddlEntityId>`). */
export interface PackageDdlEntity extends DdlEntityDescriptor {
  ddlEntityId: DdlEntityId
  search: DdlEntitySearch
  documentId: string
  versionInternalDocumentId: string
}

/** An in-memory DDL entity carrying its per-entity SQL (`data`). */
export interface DdlEntity extends PackageDdlEntity {
  data: string // minimal SQL for the table (see plan AD4)
}

/** DDL entities kept flat, keyed by entity id (grouped by kind into `ddl.json` only at serialization). */
export type DdlEntityIndex = Map<DdlEntityId, DdlEntity>

/** Serialized `ddl.json` shape — grouped by kind (v1 has only `tables`; `views` added later). */
export interface PackageDdlFile {
  tables: PackageDdlEntity[]
}

/** Changelog metadata == the descriptor (kind, name, schemaName, description), nothing more. */
export type DdlChangesMetadata = DdlEntityDescriptor
