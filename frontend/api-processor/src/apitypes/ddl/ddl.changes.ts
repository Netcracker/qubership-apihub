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

import { Realm } from '@netcracker/qubership-apihub-ddlapi'
import {
  aggregateDiffsWithRollup,
  apiDiff,
  Diff,
  DIFF_META_KEY,
  DIFFS_AGGREGATED_META_KEY,
} from '@netcracker/qubership-apihub-api-diff'
import {
  AFTER_VALUE_NORMALIZED_PROPERTY,
  BEFORE_VALUE_NORMALIZED_PROPERTY,
} from '../../consts'
import { DDL_KIND, DdlDiffResult, DdlDocumentsCompare, DdlEntityId, WithAggregatedDiffs, WithDiffMetaRecord } from '../../types'
import { isEmpty } from '../../utils'
import { DDL_EFFECTIVE_NORMALIZE_OPTIONS } from './ddl.consts'
import { calculateDdlEntityId } from './ddl.entities'

/**
 * Empty counterpart for a one-sided pair (a whole `.sql` added or removed). Mirrors the present Realm's
 * **schemas with empty tables** — the DDL analog of REST's `createCopyWithEmptyPathItems` — so every
 * table surfaces as a clean per-table add/remove diff on the `tables[]` meta, rather than a single
 * whole-schema diff that would never reach a table node.
 */
function emptyRealmLike(present: Realm): Realm {
  return {
    ddlapi: present.ddlapi,
    schemas: (present.schemas ?? []).map((schema) => ({ name: schema.name, tables: [] })),
  }
}

/**
 * Per-pair DDL comparison (Task 7). Given **one already-paired** `(prevRealm, currRealm)` — pairing
 * (incl. cross-file moves) is the caller's job (Task 9) — run `apiDiff` (auto-dispatched to
 * `SPEC_TYPE_DDL_API_1` by the Realm shape), then attribute each diff to its owning table's
 * `ddlEntityId` by walking the merged Realm.
 *
 * Attribution relies on api-diff's `aggregateDiffsWithRollup`, which rolls every diff under a table
 * (columns, indexes, FKs, comments, table attrs) up onto the table node's `DIFFS_AGGREGATED_META_KEY`
 * **Set** — and, crucially, fans a **shared schema-level type** change (enum/domain/…) onto every table
 * whose column references it (D2: the per-table aggregation is automatic via the column→type reference;
 * a type referenced by no table never reaches a table node, so orphan-type diffs yield nothing). An
 * added/removed whole table is a single diff on the parent `tables[]` array's `DIFF_META_KEY`.
 */
export const compareDdlDocuments: DdlDocumentsCompare = (prevRealm, currRealm): DdlDiffResult => {
  const present = currRealm ?? prevRealm
  if (!present) {
    // both sides empty — nothing to compare; return an empty (but valid) merged realm
    return { changesByEntityId: new Map(), mergedRealm: { ddlapi: '', schemas: [] } }
  }

  const before = prevRealm ?? emptyRealmLike(present)
  const after = currRealm ?? emptyRealmLike(present)

  // No custom scope elements and no reclassification rules: DDL changes are classified with default severity.
  // apiKind-driven reclassification (softening breaking → risky for no-bwc documents) is not applied to DDL.
  const { merged, diffs } = apiDiff(before, after, {
    ...DDL_EFFECTIVE_NORMALIZE_OPTIONS,
    metaKey: DIFF_META_KEY,
    // not re-normalized: the merged Realm is serialized as the comparison-internal document (D5)
    normalizedResult: false,
    afterValueNormalizedProperty: AFTER_VALUE_NORMALIZED_PROPERTY,
    beforeValueNormalizedProperty: BEFORE_VALUE_NORMALIZED_PROPERTY,
  }) as { merged: Realm; diffs: Diff[] }

  const changesByEntityId = new Map<DdlEntityId, Diff[]>()
  if (isEmpty(diffs)) {
    return { changesByEntityId, mergedRealm: merged }
  }

  aggregateDiffsWithRollup(merged, DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY)

  for (const schema of merged.schemas ?? []) {
    const tables = schema.tables ?? []
    const tablesMeta = (tables as WithDiffMetaRecord<typeof tables>)[DIFF_META_KEY] ?? {}
    tables.forEach((table, index) => {
      // changed table → its rolled-up child diffs (incl. fanned shared-type diffs — D2), read via the
      // same WithAggregatedDiffs helper REST uses (api-diff rolls them into a Set).
      const childDiffs = [...((table as WithAggregatedDiffs<typeof table>)[DIFFS_AGGREGATED_META_KEY] ?? [])]
      // added/removed whole table → a single diff on the parent tables[] array meta
      const addRemoveDiff = tablesMeta[index] as Diff | undefined
      const tableDiffs = addRemoveDiff ? [...childDiffs, addRemoveDiff] : childDiffs
      if (isEmpty(tableDiffs)) { return }
      changesByEntityId.set(calculateDdlEntityId(schema.name, DDL_KIND.TABLE, table.name), tableDiffs)
    })
  }

  return { changesByEntityId, mergedRealm: merged }
}
