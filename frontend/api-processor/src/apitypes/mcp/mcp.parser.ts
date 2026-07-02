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

import { FILE_KIND, MCP_COLLECTION_KEY, MCP_KIND, McpKind, TextFile } from '../../types'
import { getFileExtension, isObject, isString } from '../../utils'
import { FILE_FORMAT_JSON } from '../../consts'
import { MCP_DOCUMENT_TYPE, McpDocumentType } from './mcp.consts'
import { McpEntityRaw, ParsedMcpData } from './mcp.types'
import { serializeMcpDocument } from './mcp.utils'

type McpParseError = { message: string }

// An MCP artifact may arrive as a raw JSON-RPC response (e.g. MCP Inspector output) — `{ jsonrpc, id,
// result }`. Unwrap `result` once, at the entry of parsing, so the rest of the pipeline only handles a
// plain MCP document. A JSON-RPC error response (no `result`) or an already-plain document is returned
// unchanged.
export function unwrapJsonRpc(parsed: Record<string, unknown>): Record<string, unknown> {
  return isString(parsed.jsonrpc) && isObject(parsed.result) ? parsed.result : parsed
}

export function detectMcpDocumentType(obj: Record<string, unknown>): McpDocumentType | undefined {
  // Initialization documents are identified by the presence of `capabilities` and `serverInfo`.
  // Although the MCP specification defines `protocolVersion` as part of InitializeResult,
  // MCP Inspector output currently omits this field. To maintain compatibility, it is not
  // used as a discriminator here. This logic should be reviewed once version information is
  // consistently available from the source.
  if (isObject(obj.capabilities) && isObject(obj.serverInfo)) {
    return MCP_DOCUMENT_TYPE.MCP_INIT
  }
  if (Array.isArray(obj.tools)) { return MCP_DOCUMENT_TYPE.MCP_TOOLS }
  if (Array.isArray(obj.resources)) { return MCP_DOCUMENT_TYPE.MCP_RESOURCES }
  if (Array.isArray(obj.prompts)) { return MCP_DOCUMENT_TYPE.MCP_PROMPTS }
  return undefined
}

const MCP_LIST_TYPE_MAPPING: Record<string, { key: string; kind: McpKind }> = {
  [MCP_DOCUMENT_TYPE.MCP_TOOLS]: { key: MCP_COLLECTION_KEY[MCP_KIND.TOOL], kind: MCP_KIND.TOOL },
  [MCP_DOCUMENT_TYPE.MCP_RESOURCES]: { key: MCP_COLLECTION_KEY[MCP_KIND.RESOURCE], kind: MCP_KIND.RESOURCE },
  [MCP_DOCUMENT_TYPE.MCP_PROMPTS]: { key: MCP_COLLECTION_KEY[MCP_KIND.PROMPT], kind: MCP_KIND.PROMPT },
}

// A list item (tool/resource/prompt) is only usable if it carries a non-empty string `name`:
// the name becomes a segment of the MCP entity id, so an empty one would yield a degenerate id
// and collide with any other nameless entity. Validate it once here instead of casting blindly.
interface McpNamedItem {
  name: string
}

type McpListItemRaw = Record<string, unknown> & McpNamedItem

function hasValidName(item: Record<string, unknown>): item is McpListItemRaw {
  return isString(item.name) && item.name.trim().length > 0
}

interface ExtractEntitiesResult {
  entities: McpEntityRaw[]
  errors: McpParseError[]
}

// returned when the document yields no entities (unknown type or non-array payload);
// never mutated by callers, so a shared constant is safe
const EMPTY_EXTRACTION: ExtractEntitiesResult = { entities: [], errors: [] }

function extractEntities(obj: Record<string, unknown>, docType: string): ExtractEntitiesResult {
  if (docType === MCP_DOCUMENT_TYPE.MCP_INIT) {
    // init is always exactly one entity, but we deliberately wrap it in an array so that
    // ParsedMcpData.entities stays a uniform McpEntityRaw[] across all doc types. This keeps
    // the rest of the pipeline (buildMcpEntities, id/title calc, dedup, grouping) kind-agnostic —
    // a single `.map` over entities, with no init-vs-list branching downstream.
    return { entities: [{ kind: MCP_KIND.INIT, name: 'initialize', data: obj }], errors: [] }
  }

  const mapping = MCP_LIST_TYPE_MAPPING[docType]
  if (!mapping) { return EMPTY_EXTRACTION }

  const arr = obj[mapping.key]
  if (!Array.isArray(arr)) { return EMPTY_EXTRACTION }

  const entities: McpEntityRaw[] = []
  const errors: McpParseError[] = []

  arr.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push({ message: `Skipped ${mapping.kind} at index ${index}: expected an object` })
      return
    }
    if (!hasValidName(item)) {
      errors.push({ message: `Skipped ${mapping.kind} at index ${index}: missing or empty required 'name'` })
      return
    }
    entities.push({
      kind: mapping.kind,
      name: item.name,
      description: isString(item.description) ? item.description : undefined,
      data: item,
    })
  })

  return { entities, errors }
}

export const parseMcpFile = async (fileId: string, source: Blob): Promise<TextFile<ParsedMcpData> | undefined> => {
  const extension = getFileExtension(fileId)
  if (extension !== FILE_FORMAT_JSON) {
    return undefined
  }

  const data = await source.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    // MCP document type is detected from the parsed object's shape, so at this point
    // we don't yet know whether this is an MCP file. Invalid JSON simply means it cannot
    // be one — return undefined to let the next builder in the chain claim the file
    // (parseFile rethrows on a thrown error, which would abort the whole parse chain).
    return undefined
  }

  if (!isObject(parsed) ) {
    return undefined
  }

  // unwrap a JSON-RPC envelope to its `result` (no-op for a plain document); downstream is plain MCP
  const originalDocument: Record<string, unknown> = unwrapJsonRpc(parsed)
  const docType = detectMcpDocumentType(originalDocument)
  if (!docType) {
    return undefined
  }

  // if the envelope was unwrapped, rebuild `source` from the unwrapped document so no JSON-RPC remains;
  // a plain document keeps its original bytes
  const plainSource = originalDocument === parsed ? source : serializeMcpDocument(originalDocument)

  const { entities, errors } = extractEntities(originalDocument, docType)

  return {
    fileId,
    type: docType,
    format: FILE_FORMAT_JSON,
    data: { entities, originalDocument },
    source: plainSource,
    kind: FILE_KIND.TEXT,
    errors: errors.length ? errors : undefined,
  }
}
