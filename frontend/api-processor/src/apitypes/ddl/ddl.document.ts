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

import { DocumentBuilder, DocumentDumper, VersionDocument } from '../../types'
import { createVersionInternalDocument, getDocumentTitle } from '../../utils'
import { ParsedDdlData } from './ddl.types'
import { serializeDdlInternalDocument } from './ddl.utils'

export const buildDdlDocument: DocumentBuilder<ParsedDdlData> = async (parsedFile, file): Promise<VersionDocument<ParsedDdlData>> => {
  // `apiKind` is the label-derived compatibility kind set by the buildDocument component (D9 — SQL has
  // no native api-kind). Pull `metadata` out separately so its keys land directly under document.metadata
  // (mirrors the MCP builder), the rest spreads through as passthrough config.
  const { fileId, slug = '', publish = true, apiKind, metadata: fileMetadata, ...passThroughFields } = file
  const { data, format, source, errors } = parsedFile

  const document: VersionDocument<ParsedDdlData> = {
    fileId,
    type: parsedFile.type,
    format,
    apiKind,
    data,
    slug,
    publish,
    filename: `${slug}.${format}`,
    title: getDocumentTitle(fileId),
    dependencies: [],
    description: '', // table-level COMMENT lives on the entities, not the document
    operationIds: [], // DDL has no operations
    metadata: { ...passThroughFields, ...fileMetadata },
    source,
    version: undefined,
    errors: errors?.length ?? 0,
    versionInternalDocument: createVersionInternalDocument(slug),
  }

  // Attach the normalize→denormalize→serialize internal document (AD3). DDL has no operations builder,
  // so unlike REST this happens here in the document builder rather than in buildOperations.
  serializeDdlInternalDocument(document, data.realm)

  return document
}

// The dumped DDL document is the original SQL verbatim — the applicable, correctly ordered statements.
export const dumpDdlDocument: DocumentDumper<ParsedDdlData> = (document) => {
  return new Blob([document.data.originalSql])
}
