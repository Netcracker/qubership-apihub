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
import { FILE_FORMAT_JSON } from '../../consts'
import { ParsedMcpData } from './mcp.types'
import { serializeMcpDocument } from './mcp.utils'
import { createVersionInternalDocument, getDocumentTitle } from '../../utils'

export const buildMcpDocument: DocumentBuilder<ParsedMcpData> = async (parsedFile, file): Promise<VersionDocument<ParsedMcpData>> => {
  // pull the file's `metadata` object out of the rest-spread and merge its contents onto the document's
  // metadata AFTER the other pass-through fields, so its keys (e.g. mcpEndpoint) live directly under
  // document.metadata rather than nested as document.metadata.metadata
  const { fileId, slug = '', publish = true, metadata: fileMetadata, ...passThroughFields } = file
  const { data } = parsedFile
  return {
    fileId,
    type: parsedFile.type,
    format: FILE_FORMAT_JSON,
    data,
    slug,
    publish,
    filename: `${slug}.${FILE_FORMAT_JSON}`,
    title: getDocumentTitle(fileId),
    dependencies: [],
    description: '',
    operationIds: [],
    metadata: { ...passThroughFields, ...fileMetadata },
    source: parsedFile.source,
    version: undefined,
    errors: 0,
    versionInternalDocument: createVersionInternalDocument(slug),
  }
}

export const dumpMcpDocument: DocumentDumper<ParsedMcpData> = (document) => {
  const { data } = document
  return serializeMcpDocument(data.originalDocument)
}
