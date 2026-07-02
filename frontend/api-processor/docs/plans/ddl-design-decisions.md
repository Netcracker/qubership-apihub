# DDL Support — Design Decisions (Interview Spec)

Status: **Decided 2026-06-12** · Companion to [`ddl-contract-support.md`](./ddl-contract-support.md)
and [`ddl-build-result-contract.md`](./ddl-build-result-contract.md)

This records the non-obvious decisions taken in the design interview. Each is **Decision → Rationale
→ Implications** (which plan task / contract aspect it touches). These override the corresponding
"recommended" notes in the companion docs.

---

## 1. Changelog semantics

### D1 — Table/column renames surface as remove + add
**Decision:** No rename detection. A renamed table or column is a removed entity plus an added one.
**Rationale:** Entity identity is `{schemaName}-{kind}-{name}` and api-diff maps tables/columns by
name; rename detection would mean overriding api-diff's name-keyed mapping with structural
heuristics — large, ambiguous, out of proportion for v1.
**Implications:** Changelog shows a full removal + full addition for a rename. Document this as
expected behavior. No work beyond the default. (Plan Task 7/9.)

### D2 — Type/enum/domain changes are attributed only to referencing tables
**Decision:** A schema-level type change surfaces on every table that uses it. A type referenced by
**no** table produces **no** changelog entry (orphan diffs are not separately reported).
**Rationale:** The table is the only contract unit in v1; there is no entity to host an orphan-type
diff, and a synthetic version-level bucket would expand the contract prematurely.
**Implications:** Task 7's per-table aggregation must follow referential equality from a column's
type back to the shared type instance (ddlapi shares references) and fan a shared-type diff out to
all referencing tables. Unreferenced-type diffs are intentionally dropped. (Plan Task 7.)

### D3 — Changelog compares across ddlapi version skew without gating
**Decision:** Ignore the `Realm.ddlapi` spec-version stamp difference between the two compared
versions; compare anyway. No warning, no block.
**Rationale:** Lowest friction; api-diff is expected to absorb shape differences. (Contrast: the
api-processor builderVersion guard still applies — this decision is only about the *ddlapi* stamp.)
**Implications:** No version-skew check in `compareVersionsDdl`. Accept the small risk of
misclassification if a future ddlapi major reshapes the Realm; revisit then. (Plan Task 9.)

### D4 — Mirror REST bwc semantics for classification — **REVERTED**
**Original decision:** apiKind (`bwc`/`no-bwc`/`experimental`) relaxes DDL breaking-change classification
the same way it does for REST: a `no-bwc`/`experimental` document softens breaking → semi-breaking.
**Reverted:** apiKind-driven bwc-mode reclassification is **not** supported for DDL. DDL changes are
classified with default severity regardless of apiKind. The DDL compatibility-scope function and its
wiring into the ddl `apiDiff` call were removed; no `apiCompatibilityScopeFunction` is passed for DDL.

### D5 — Merged comparison document matches the REST convention
**Decision:** Serialize api-diff's merged Realm with `normalizedResult: false` plus the
before/after-normalized diff annotations — the exact convention REST uses for its merged comparison
document.
**Rationale:** Maximizes consumer reuse and cross-contract consistency for whoever renders the merged
diff.
**Implications:** `comparison-internal-documents/<id>.json` for DDL holds the merged-not-re-normalized
Realm. (Plan Task 9; contract doc §changelog.)

---

## 2. Build & parsing

### D6 — Per-file, self-sufficient parsing
**Decision:** Each `.sql` file is parsed into its own `Realm` independently. A table and all its
parts (indexes, comments, triggers) **must** live in the same file as its `CREATE TABLE`. A part in
another file referencing a table elsewhere is an `unresolved-reference`.
**Rationale:** Matches the spec ("a single file is self-sufficient"); keeps `documentId` unambiguous
(one file owns each entity); avoids a merged-Realm model that breaks the document-ownership link.
**Implications:** `buildFromDdl` is called per file; no package-wide concatenation. (Plan Task 2.)

### D7 — One notification per out-of-scope statement
**Decision:** Emit a Warning per out-of-scope statement (ALTER/DROP/VIEW/SEQUENCE/FUNCTION/DML/…),
with its location — not aggregated.
**Rationale:** Maximum actionability; authors can see exactly which statements were skipped.
**Implications:** Map each `out-of-scope-statement` issue from `buildFromDdl`'s `onError` to its own
notification with `fileId` + location. (Plan Task 2/12.)

### D8 — unresolved-reference is Warning-only (no completeness flag, no escalation)
**Decision:** Build the partial table, emit the Warning, and do **not** mark the entity as incomplete
or escalate unresolved FKs to Error.
**Rationale:** Matches the spec severity mapping; keeps the entity contract minimal.
**Implications:** No extra `partial`/`incomplete` field on the DDL entity. The entity looks complete
in `ddl.json` despite the warning. (Plan Task 12; contract doc — no entity-shape change.)

### D9 — apiKind sourced from document metadata — **NO LONGER USED FOR DDL COMPARISON**
**Original decision:** DDL's apiKind comes from the `.sql` document's passthrough metadata / label
(e.g. `apihub/x-api-kind`) set by the publisher — mirroring REST's label fallback. SQL has no native
api-kind.
**Current state:** apiKind is not surfaced per DDL entity (see DTO change) and no longer drives DDL
classification (D4 reverted). The generic document builder may still carry the document-level `apiKind`
metadata field (as for any document type), but the DDL compare path neither reads it nor emits it. Entity
*scope* comes only from the SQL.

---

## 3. Identity, contract, scope

### D10 — Slugified ids; collisions are duplicate-object Errors
**Decision:** Keep the MCP-style slugified `{schemaName}-{kind}-{name}` id. If two distinct tables
collide after slugify (e.g. `"Users"` vs `users`), it is reported as the publish-breaking
`duplicate-object` Error.
**Rationale:** Case-distinct identical names are rare and arguably bad practice; matches MCP's
existing slugify behavior; avoids unreadable hash-encoded ids.
**Implications:** Duplicate detection in `buildDdlEntities` operates on the slugified id. (Plan Task 4.)

### D11 — `ddlEntityIds` are NOT serialized to documents.json (C3, confirmed)
**Decision:** Follow MCP — the reverse link is `ddl.json[*].documentId`; `PackageDocument` is
unchanged.
**Rationale:** Consistency with MCP; smaller contract surface.
**Implications:** See contract doc C3 and Plan Task 6.

### D12 — Per-contract summaries only; the host rolls up
**Decision:** api-processor emits `operationTypes` (REST) and `contractsChangesSummary` (DDL) independently; it
does **not** produce a combined version-level rollup across contract types.
**Rationale:** Keeps api-processor output orthogonal; avoids owning a cross-contract aggregation/dedup.
**Implications:** Diff dedup for summaries is per-contract only. No unified summary file. (Contract
doc §changelog; Plan Task 9.)

---

## 4. Scope boundaries (Non-Goals for v1)

### D13 — No DDL export
**Decision:** Export build types do not handle DDL. `EXPORT_VERSION` omits `.sql`; there is no
DDL-specific export type and no HTML/template rendering for DDL.
**Rationale:** Keep v1 to build + changelog; export is unproven demand.
**Implications:** `ddlBuilder` omits `createExportDocument`. (Plan Task 11/12 — out of scope.)

### D14 — No incremental rebuild for DDL
**Decision:** Out of scope. Incremental rebuild is no longer used in production and is planned for
removal, so DDL does not wire into the granular-drop mechanism. Full rebuild only.
**Rationale:** Building for a mechanism slated for removal is wasted effort.
**Implications:** `processDdlDocument` need not record `document.ddlEntityIds` for incremental drop;
drop that rationale from Plan Task 6. (Plan Task 6.)

### D15 — Dashboards rely on host cache invalidation (R7)
**Decision:** On a dashboard cache hit whose cached ref comparison lacks a DDL section,
api-processor trusts the host: it does **not** recompute DDL. The backend is responsible for
invalidating/rebuilding ref comparisons when DDL support lands.
**Rationale:** Simplest; avoids a recompute-on-miss path. Accepts that dashboards over stale ref
caches under-report DDL changes until caches refresh.
**Implications:** R7 mitigation changes from "cover hit and miss / recompute" to "document the host
invalidation requirement; cover the cache-miss path only." (Plan Task 11; Risk R7.)

---

## Decision → companion-doc reconciliation

| Decision | Changes |
|----------|---------|
| D4 | **Reverted** — DDL compatibility-scope function + `mode` wiring removed; no apiKind-driven reclassification for DDL. |
| D5 | Plan Task 9 / contract doc: merged DDL Realm uses REST's `normalizedResult:false` convention. |
| D9 | apiKind no longer used for DDL comparison (DTO field removed, D4 reverted). |
| D14 | Plan Task 6: drop the incremental-drop rationale for `ddlEntityIds`. |
| D15 | Plan Risk R7 / Task 11: rely on host invalidation; cover cache-miss only. |
| D13 | `ddlBuilder` has no `createExportDocument`; export out of scope. |

All other decisions confirm choices already reflected in the companion docs.

## Still open

- **C2** — per-pair wrapper key `entities` vs `operations` in `ddl-comparisons/<id>` — pending
  backend-consumer confirmation (not a blocker for implementation).
