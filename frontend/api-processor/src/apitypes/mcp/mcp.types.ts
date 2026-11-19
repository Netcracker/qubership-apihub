import { McpKind } from '../../types/package/mcp'

export interface McpEntityRaw {
  kind: McpKind
  name: string
  description?: string
  data: Record<string, unknown>
}

export interface ParsedMcpData {
  // flat, kind-agnostic projection of the document used to build MCP entities
  entities: McpEntityRaw[]
  // the parsed document preserved verbatim; dumped as-is by dumpMcpDocument (analogous to a
  // rest document's full OpenAPI in VersionDocument.data) and the source of init capabilities.
  // entities are slices of this, so it is not reconstructable from them without losing top-level fields.
  originalDocument: Record<string, unknown>
}
