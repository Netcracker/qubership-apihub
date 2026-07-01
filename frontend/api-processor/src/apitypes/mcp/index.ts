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

import { ApiBuilder } from '../../types'
import { MCP_DOCUMENT_TYPE } from './mcp.consts'
import { MCP_API_TYPE } from '../../consts'
import { parseMcpFile } from './mcp.parser'
import { buildMcpDocument, dumpMcpDocument } from './mcp.document'
import { buildMcpEntities } from './mcp.entities'
import { ParsedMcpData } from './mcp.types'

export * from './mcp.consts'
export * from './mcp.entities'
export * from './mcp.parser'
export * from './mcp.types'

export const mcpBuilder: ApiBuilder<ParsedMcpData> = {
  apiType: MCP_API_TYPE,
  types: Object.values(MCP_DOCUMENT_TYPE),
  parser: parseMcpFile,
  buildDocument: buildMcpDocument,
  dumpDocument: dumpMcpDocument,
  buildMcpEntities,
}
