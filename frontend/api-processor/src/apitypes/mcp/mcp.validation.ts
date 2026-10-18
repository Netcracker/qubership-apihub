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

import Ajv, { ValidateFunction } from 'ajv'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'

import { MCP_KIND, McpKind } from '../../types'

// Official MCP schemas, vendored verbatim (1:1 with upstream; source and checksums in
// schemas/PROVENANCE.md, refreshed via scripts/fetch-mcp-schemas.mjs). `draft` is excluded.
// Older revisions use JSON Schema draft-07 (`definitions`); 2025-11-25 uses draft 2020-12 (`$defs`).
import schema20241105 from './schemas/2024-11-05.json'
import schema20250326 from './schemas/2025-03-26.json'
import schema20250618 from './schemas/2025-06-18.json'
import schema20251125 from './schemas/2025-11-25.json'

const FULL_SCHEMAS: Record<string, object> = {
  '2024-11-05': schema20241105,
  '2025-03-26': schema20250326,
  '2025-06-18': schema20250618,
  '2025-11-25': schema20251125,
}

// Document kind → the official definition it is validated against. List documents have the collection
// form (`{ tools: [...] }`), matching the List…Result definitions; init is a raw InitializeResult.
const KIND_TO_DEFINITION: Record<McpKind, string> = {
  [MCP_KIND.INIT]: 'InitializeResult',
  [MCP_KIND.TOOL]: 'ListToolsResult',
  [MCP_KIND.RESOURCE]: 'ListResourcesResult',
  [MCP_KIND.PROMPT]: 'ListPromptsResult',
}

/** Protocol versions we ship a schema for (oldest → newest). `draft` is not supported. */
export const SUPPORTED_MCP_VERSIONS: string[] = Object.keys(FULL_SCHEMAS)

export const isSupportedMcpVersion = (version: string): boolean => version in FULL_SCHEMAS

// draft-07 instance for the 2024/2025-early revisions, draft-2020-12 instance for 2025-11-25.
// `strict: false` tolerates the spec's vendor keywords and formats; `allErrors` reports every violation.
const ajv07 = addFormats(new Ajv({ strict: false, allErrors: true }))
const ajv2020 = addFormats(new Ajv2020({ strict: false, allErrors: true }))

const SCHEMA_ID = (version: string): string => `mcp:${version}`

// A version is keyed to a single ajv instance (instanceFor is deterministic) and to a unique schema id,
// so tracking "already registered" globally by version cannot collide across the two instances.
const registeredVersions = new Set<string>()
const validatorCache = new Map<string, ValidateFunction>()

// The ajv instance and the $ref pointer are chosen from the schema's DECLARED draft (`$schema`), not
// from its structure: draft 2020-12 keeps definitions under `$defs`, draft-07 under `definitions`.
function isDraft2020(schema: object): boolean {
  return '$schema' in schema && typeof schema.$schema === 'string' && schema.$schema.includes('2020-12')
}

function instanceFor(schema: object): Ajv | Ajv2020 {
  return isDraft2020(schema) ? ajv2020 : ajv07
}

function definitionRef(version: string, schema: object, definition: string): string {
  return `${SCHEMA_ID(version)}#/${isDraft2020(schema) ? '$defs' : 'definitions'}/${definition}`
}

/**
 * Compiled validator for one MCP document kind under one protocol version, or `undefined` when the
 * version is not supported (the caller treats an unsupported version as a hard publish failure).
 */
export function getMcpSchemaValidator(version: string, kind: McpKind): ValidateFunction | undefined {
  const schema = FULL_SCHEMAS[version]
  if (!schema) { return undefined }

  const cacheKey = `${version}#${kind}`
  let validate = validatorCache.get(cacheKey)
  if (validate) { return validate }

  const ajv = instanceFor(schema)
  if (!registeredVersions.has(version)) {
    // lazy: only the definitions resolved below are compiled, not the whole document
    ajv.addSchema(schema, SCHEMA_ID(version))
    registeredVersions.add(version)
  }

  validate = ajv.getSchema(definitionRef(version, schema, KIND_TO_DEFINITION[kind]))
  if (!validate) { return undefined }
  validatorCache.set(cacheKey, validate)
  return validate
}
