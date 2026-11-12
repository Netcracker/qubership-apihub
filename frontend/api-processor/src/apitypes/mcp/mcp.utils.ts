/**
 * Serializes an MCP document's raw `originalDocument` to its canonical on-disk JSON Blob. Shared by the
 * document dumper and the parser (JSON-RPC unwrap) so the stored source and the published document match.
 */
export function serializeMcpDocument(originalDocument: Record<string, unknown>): Blob {
  return new Blob([JSON.stringify(originalDocument, null, 2)], { type: 'application/json' })
}
