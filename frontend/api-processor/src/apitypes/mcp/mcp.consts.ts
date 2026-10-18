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

import { ZippableDocument } from '../../types'
import { ResolvedVersionDocument } from '../../types/external'

export const MCP_DOCUMENT_TYPE = {
  MCP_INIT: 'mcp-init',
  MCP_TOOLS: 'mcp-tools',
  MCP_RESOURCES: 'mcp-resources',
  MCP_PROMPTS: 'mcp-prompts',
} as const

export type McpDocumentType = typeof MCP_DOCUMENT_TYPE[keyof typeof MCP_DOCUMENT_TYPE]

export function isMcpDocument(document: ZippableDocument | ResolvedVersionDocument): boolean {
  return Object.values(MCP_DOCUMENT_TYPE).some(type => document.type === type)
}
