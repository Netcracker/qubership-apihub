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

import type { Realm } from '@netcracker/qubership-apihub-ddlapi'
import type { DdlExtractor, DdlNonFatalError } from '@netcracker/qubership-apihub-ddlapi/parser'

export interface ParsedDdlData {
  // the Realm produced by buildFromDdl for this single `.sql` file (per-file, self-sufficient — D6)
  realm: Realm
  // the original SQL preserved verbatim; dumped as-is by dumpDdlDocument (the applicable, correctly
  // ordered SQL) and the source for per-entity SQL extraction. The Realm is not reconstructable back
  // into the exact source text, so the original bytes are kept alongside it.
  originalSql: string
  // per-table DDL slicer built once over `originalSql` (heavy WASM parse done in parseDdlFile, async).
  // buildDdlEntities calls its synchronous `extractTable` to compute each table's per-entity SQL.
  extractor: DdlExtractor
  // non-fatal buildFromDdl issues (out-of-scope statement, unresolved reference, duplicate object).
  // Carried here rather than on TextFile.errors so the generic parse→Error-notification path is bypassed
  // and severity is mapped per-kind during build validation (Task 12 / D7 / D8).
  issues: DdlNonFatalError[]
}
