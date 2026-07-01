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

/**
 * Serializes an MCP document's raw `originalDocument` to its canonical on-disk JSON Blob. Shared by the
 * document dumper and the parser (JSON-RPC unwrap) so the stored source and the published document match.
 */
export function serializeMcpDocument(originalDocument: Record<string, unknown>): Blob {
  return new Blob([JSON.stringify(originalDocument, null, 2)], { type: 'application/json' })
}
