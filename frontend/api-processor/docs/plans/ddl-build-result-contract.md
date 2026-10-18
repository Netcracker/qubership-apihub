# External Contract: DDL Build Result Shape

Status: **Draft for review** · 2026-06-12 · Companion to [`ddl-contract-support.md`](./ddl-contract-support.md)

This describes the **output package (zip) layout** api-processor produces for DDL content, for the
`build` and `changelog` build types, and reviews it for consistency with the existing REST and MCP
contracts. It is the consumer-facing contract (apihub backend / UI), not the internal types.

All file names below are the `PACKAGE.*` constants in `src/consts.ts`. DDL adds four files/dirs
(`ddl.json`, `ddl/`, `ddl-comparisons.json`, `ddl-comparisons/`) and otherwise reuses the existing
shared files.

## File map by build type

| Path | `build` | `changelog` | Owner | Notes |
|------|:------:|:-----------:|-------|-------|
| `info.json` | ✓ | ✓ | shared | build config + `builderVersion` |
| `notifications.json` | ✓ | ✓ | shared | parse/validation messages |
| `documents.json` | ✓ | — | shared | one entry per DDL document |
| `documents/<slug>.sql` | ✓ | — | shared | original SQL, verbatim |
| `version-internal-documents.json` | ✓ | — | shared | index of internal docs |
| `version-internal-documents/<id>.json` | ✓ | — | shared | normalized→denormalized→serialized `Realm` |
| `ddl.json` | ✓ | — | **DDL** | table entity index (grouped by kind) |
| `ddl/<ddlEntityId>` | ✓ | — | **DDL** | minimal SQL per table (no extension) |
| `ddl-comparisons.json` | ✓¹ | ✓ | **DDL** | DDL comparison index |
| `ddl-comparisons/<comparisonFileId>` | ✓¹ | ✓ | **DDL** | per-pair DDL change data |
| `comparison-internal-documents.json` | ✓¹ | ✓ | shared | index (REST + DDL merged docs) |
| `comparison-internal-documents/<id>.json` | ✓¹ | ✓ | shared | merged `Realm` per document pair |

¹ Emitted by a `build` only when `previousVersion` is set (the build strategy runs the comparison at
the end, exactly as REST does). A pure `changelog` emits **only** the comparison files (+ `info` /
`notifications`); it does not re-emit `documents.json` / `ddl.json` / entity files.

---

## `build` artifacts

### `documents.json` — one entry per `.sql` file

Reuses the shared `PackageDocument` shape (no DDL-specific fields today — see **C3**):

```jsonc
{
  "documents": [
    {
      "fileId": "ddl/shop.sql",
      "filename": "shop.sql",
      "slug": "shop",
      "type": "ddl",            // DDL_DOCUMENT_TYPE.DDL
      "format": "sql",
      "title": "shop",
      "description": "",
      "operationIds": [],       // DDL has no operations (see C3)
      "metadata": { /* passthrough from buildConfig.files */ }
    }
  ]
}
```

`documents/shop.sql` holds the **original SQL verbatim** (the dumped document = applicable,
correctly-ordered SQL). `version-internal-documents/<id>.json` holds the normalized→denormalized→
serialized `Realm` for that document.

### `ddl.json` — table entity index

Grouped by kind (mirrors MCP's `{ inits, tools, resources, prompts }`); v1 has only `tables`.
Payload (`data`) is **stripped** — it lives in `ddl/<ddlEntityId>`.

```jsonc
{
  "tables": [
    {
      "ddlEntityId": "public-table-users",   // `${schemaName}-${kind}-${name}`, slugified
      "kind": "table",
      "name": "users",                        // table name
      "schemaName": "public",                 // entity scope (mcpEndpoint analog)
      "description": "Registered users",      // COMMENT ON TABLE, "" if none
      "search": { "useEntityDataAsSearchText": true },
      "documentId": "ddl/shop.sql",
      "versionInternalDocumentId": "shop"
    }
  ]
}
```

### `ddl/<ddlEntityId>` — per-table SQL

One file per entity, named by `ddlEntityId`, **no extension** (as `operations/` and `mcp/`). Content
is the minimal valid SQL for that table (`CREATE TABLE` + its `CREATE INDEX` + `COMMENT ON`). v1 emits
a stub (see plan AD4 / Task 5).

```sql
CREATE TABLE public.users (
  id    bigint       PRIMARY KEY,
  email varchar(255) NOT NULL
);
COMMENT ON TABLE  public.users       IS 'Registered users';
COMMENT ON COLUMN public.users.email IS 'Primary contact email';
```

---

## `changelog` artifacts

### `ddl-comparisons.json` — DDL comparison index

Sibling of `comparisons.json`; same envelope, but each comparison carries **`contractsChangesSummary`** —
an object keyed by contract type (`ddl`), the DDL analog of REST's `operationTypes` array — and the
per-pair change data is stripped (it lives in `ddl-comparisons/`). Because the key already carries the
contract type, there is no per-entry `contractType` field:

```jsonc
{
  "comparisons": [
    {
      "comparisonFileId": "shop_1.0.0_shop-pkg_shop_2.0.0_shop-pkg",
      "packageId": "shop-pkg",
      "version": "2.0.0",
      "revision": 1,
      "previousVersion": "1.0.0",
      "previousVersionPackageId": "shop-pkg",
      "previousVersionRevision": 1,
      "fromCache": false,
      "contractsChangesSummary": {
        "ddl": {
          "changesSummary":          { "breaking": 1, "non-breaking": 2, "semi-breaking": 0, "deprecated": 0, "annotation": 0, "unclassified": 0 },
          "numberOfImpactedEntities":{ "breaking": 1, "non-breaking": 1, "semi-breaking": 0, "deprecated": 0, "annotation": 0, "unclassified": 0 }
        }
      }
    }
  ]
}
```

### `ddl-comparisons/<comparisonFileId>` — per-pair DDL changes

Sibling of `comparisons/<comparisonFileId>`. The wrapper key is **`entities`** (the DDL analog of
REST's `operations`), each element a `DdlChangesDto`:

No `contractType` (redundant — the whole file is DDL). Each side is a self-contained object: the current
side under **`ddlEntityData`** and the previous side under **`previousDdlEntityData`**, each carrying that
side's `ddlEntityId` and descriptor (`kind`/`name`/`schemaName`/`description`). `apiKind` is not surfaced
per DDL entity. `ddlEntityData` is omitted for a pure remove; `previousDdlEntityData` for a pure add.

```jsonc
{
  "entities": [
    {
      "ddlEntityData": {                 // omitted for a pure remove
        "ddlEntityId": "public-table-users",
        "kind": "table",
        "name": "users",
        "schemaName": "public",
        "description": "Registered users"
      },
      "previousDdlEntityData": {         // omitted for a pure add
        "ddlEntityId": "public-table-users",
        "kind": "table",
        "name": "users",
        "schemaName": "public",
        "description": "Users"
      },
      "changeSummary": { "breaking": 1, "non-breaking": 0, "semi-breaking": 0, "deprecated": 0, "annotation": 0, "unclassified": 0 },
      "comparisonInternalDocumentId": "shop_1.0.0_shop-pkg_shop_2.0.0_shop-pkg",
      "changes": [ /* ChangeMessage<DiffTypeDto>[] — same shape as REST */ ]
    }
  ]
}
```

`comparisonInternalDocumentId` points into the **shared** `comparison-internal-documents.json` /
`comparison-internal-documents/<id>.json`, where the merged `Realm` for the document pair lives
(alongside REST merged docs).

## Consistency review vs REST and MCP

| Aspect | REST | MCP | DDL | Verdict |
|--------|------|-----|-----|---------|
| **Entity/operation index file** | `operations.json` (flat list) | `mcp.json` (grouped by kind, payload stripped) | `ddl.json` (grouped by kind, payload stripped) | ✓ DDL follows **MCP** |
| **Per-entity data file** | `operations/<operationId>` (JSON, no ext) | `mcp/<mcpEntityId>` (JSON, no ext) | `ddl/<ddlEntityId>` (SQL text, no ext) | ✓ consistent (id, no extension); payload type differs by nature (SQL vs JSON) |
| **Id format** | path/method-derived | `{endpoint}-{kind}-{name}` slugified | `{schemaName}-{kind}-{name}` slugified | ✓ DDL mirrors **MCP** |
| **`search` block** | `useOperationDataAsSearchText` | `useEntityDataAsSearchText` | `useEntityDataAsSearchText` | ✓ DDL mirrors **MCP** |
| **`versionInternalDocumentId` on the entity** | yes (on each operation) | **no** | **yes** | ⚠ DDL mirrors **REST**, diverges from MCP — see **C4** |
| **Changelog participation** | `comparisons.json` + `comparisons/` | none | `ddl-comparisons.json` + `ddl-comparisons/` | ✓ DDL like REST, in sibling files (no cross-talk) |
| **Comparison summary type** | `operationTypes` array (`apiType`, `changesSummary`, `numberOfImpactedOperations`, `tags`, `apiAudienceTransitions`) | n/a | `contractsChangesSummary` object keyed by contract type → `{ changesSummary, numberOfImpactedEntities }` | ✓ object-keyed/subset; `tags` + `apiAudienceTransitions` dropped (n/a for DDL) |
| **Per-pair change wrapper key** | `operations` | n/a | `entities` | △ deliberate rename for consistency with `numberOfImpactedEntities` — see **C2** |
| **Change entry id** | `operationId` / `previousOperationId` | n/a | `ddlEntityId` / `previousDdlEntityId` | ✓ consistent rename |
| **Comparison-internal documents** | shared file/dir | n/a | shared file/dir | ✓ DDL reuses, no new file |
| **Document `type` / `format`** | `openapi-3-*` / `json`,`yaml` | `mcp-*` / `json` | `ddl` / `sql` | ✓ consistent pattern |

### Open consistency points (need a decision)

- **C2 — per-pair wrapper key.** REST writes `{ operations: [...] }` into `comparisons/<id>`. DDL is
  specced as `{ entities: [...] }` in `ddl-comparisons/<id>`. This is intentional (DDL units are
  "entities", consistent with `numberOfImpactedEntities`), but confirm the backend reader expects
  `entities` here and not `operations`.
- **C3 — `ddlEntityIds` on the document entry. RESOLVED (2026-06-12): option (a).** `ddlEntityIds`
  are **not** serialized into `documents.json` — `PackageDocument` is left unchanged. DDL follows MCP:
  `document.ddlEntityIds` is tracked in-memory only (for granular incremental drop), and the
  consumer's reverse link is `ddl.json[*].documentId`. (The rejected option (b) was to add
  `ddlEntityIds` to `PackageDocument` and backfill `mcpEntityIds` for a uniform document entry.)
- **C4 — `versionInternalDocumentId` placement.** DDL puts it on each entity (like REST operations);
  MCP has no per-entity internal-document reference. This is acceptable (DDL needs the link for the
  table→normalized-Realm view), just noted as a deliberate REST-alignment rather than MCP-alignment.

### Confirmed-consistent (no action)

- DDL never writes into REST's `operations.json` / `comparisons.json` / `comparisons/` — those are
  byte-unchanged, so mixed REST+DDL packages produce both sets independently.
- Comparison-internal documents are shared; a DDL change references them by id exactly as REST does.
- `info.json` / `notifications.json` are build-type/contract-type agnostic and unchanged.
