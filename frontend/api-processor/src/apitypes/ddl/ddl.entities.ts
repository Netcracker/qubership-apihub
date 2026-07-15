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

import { AttrKind, findAttr, Realm, Table } from '@netcracker/qubership-apihub-ddlapi'
import { DDL_KIND, DdlEntitiesBuilder, DdlEntityDescriptor, DdlEntityId, DdlKind } from '../../types'
import { SLUG_OPTIONS_OPERATION_ID, slugify } from '../../utils'
import { ParsedDdlData } from './ddl.types'

/**
 * The single source of truth for a DDL entity id (the `ddl/` filename, cross-file changelog pairing,
 * and the changelog change identity). Each segment is slugified independently and joined with `-`
 * (mirrors `calculateMcpEntityId`). The id is opaque — produced once, never parsed back into parts.
 *
 * - `schemaName` — schema resolved by ddlapi (qualified schema, else `public`). Slugified.
 * - `kind` — a literal `DdlKind` value (`'table'`); controlled vocabulary, NOT slugified.
 * - `name` — the table name resolved by ddlapi. Slugified.
 */
export function calculateDdlEntityId(schemaName: string, kind: DdlKind, name: string): DdlEntityId {
  return `${slugify(schemaName, SLUG_OPTIONS_OPERATION_ID)}-${kind}-${slugify(name, SLUG_OPTIONS_OPERATION_ID)}`
}

/**
 * Walk the raw Realm (OQ3) `schemas[] → tables[]` and emit one `DdlEntity` per table. Detects
 * **intra-document** duplicate ids only (this builder sees one document); cross-document collisions are
 * `processDdlDocument`'s job. Mirrors MCP: `buildMcpEntities` dedups within a doc, `processMcpDocument`
 * across docs.
 */
export const buildDdlEntities: DdlEntitiesBuilder<ParsedDdlData> = (document) => {
  const { realm, extractor } = document.data
  const documentId = document.fileId
  const versionInternalDocumentId = document.versionInternalDocument.versionDocumentId

  // intra-document duplicate detection (incl. post-slugify collisions — D10), id -> table name for the
  // error text; mirrors the `mcpEntityIdMap` guard in buildMcpEntities
  const seen = new Map<DdlEntityId, string>()

  return (realm.schemas ?? []).flatMap((schema) =>
    (schema.tables ?? []).map((table) => {
      const ddlEntityId = calculateDdlEntityId(schema.name, DDL_KIND.TABLE, table.name)

      const previous = seen.get(ddlEntityId)
      if (previous !== undefined) {
        throw new Error(
          `Duplicate DDL entity ID '${ddlEntityId}': '${table.name}' conflicts with '${previous}' in document '${documentId}'`,
        )
      }
      seen.set(ddlEntityId, table.name)

      // Realm identifiers are already model-normalized, exactly what extractTable expects. Every Realm
      // table came from a CREATE TABLE the extractor indexed too, so a miss is an internal inconsistency.
      const tableSlice = extractor.extractTable({ schema: schema.name, name: table.name })
      if (!tableSlice) {
        throw new Error(
          `No slice for table '${schema.name}.${table.name}' in document '${documentId}' (extractor/Realm mismatch)`,
        )
      }

      return {
        ...tableProperties(schema.name, table),
        ddlEntityId,
        search: { useEntityDataAsSearchText: true },
        documentId,
        versionInternalDocumentId,
        data: tableSlice.sql,
      }
    }),
  )
}

/** Common table properties: kind, name, schema, and COMMENT ON text (`''` if none). */
function tableProperties(schemaName: string, table: Table): DdlEntityDescriptor {
  return {
    kind: DDL_KIND.TABLE,
    name: table.name,
    schemaName,
    description: findAttr(table.attrs, AttrKind.Comment)?.text ?? '',
  }
}

/**
 * Walk a Realm and collect `ddlEntityId → descriptor` for every table. Used by the changelog
 * (Task 9) to populate `metadata`/`previousMetadata` on each change from the prev/curr Realm.
 */
export function collectTableDescriptors(realm: Realm): Map<DdlEntityId, DdlEntityDescriptor> {
  const result = new Map<DdlEntityId, DdlEntityDescriptor>()
  for (const schema of realm.schemas ?? []) {
    for (const table of schema.tables ?? []) {
      result.set(calculateDdlEntityId(schema.name, DDL_KIND.TABLE, table.name), tableProperties(schema.name, table))
    }
  }
  return result
}
