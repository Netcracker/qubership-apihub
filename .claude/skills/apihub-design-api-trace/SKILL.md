---
name: apihub-design-api-trace
description: >-
  Trace REST endpoints and UI logic for APIHUB functional designs: search OpenAPI and Portal UI hooks, fill Related
  API and API / Logic columns, and flag Draft/TBD when no contract exists. Use when the user asks to fill API/Logic,
  trace endpoints, Related API, or map use cases to backend API.
---

# FD API trace

Connect **functional design** rows to **real contracts** in the monorepo. Default: **trace report** in chat. Change the
FD only when the user asks to update or fill the API fields.

Read `references/api-sources.md` for search order and citation format.

## Inputs

| Input | Purpose |
| ----- | ------- |
| FD path | File to read or update |
| Scope | Whole document, one `### Use Case`, or listed row labels |
| Mode | **report** (default) or **update** |

## Workflow

### 1. Parse the FD

1. Collect targets: metadata **Related API**; T1 **Execution** API bullets; T2/T3 **API / Logic** cells.
2. Note empty cells, `TBD`, invented paths, or verbs that do not match any OpenAPI operation.
3. Skim **Summary** and **Assumptions** for feature area (package version, library, linter, agent, settings).

### 2. Trace each row

For each target row:

1. Derive search terms from Description (entity, action, tab).
2. Search `backend/portal-backend/docs/api/APIHUB_API.yaml` (and other sources from `api-sources.md`).
3. Confirm with the Portal UI callers or the Go handler when two operations tie (locations in `api-sources.md`).
4. Assign **confidence**: Verified, Inferred, Draft, Client-only (see reference).

Record: `operationId` or path, one-line evidence (e.g. OpenAPI `summary`, hook file name).

### 3. Trace report (always)

Output a table:

| FD location | Row summary | Proposed API / Logic | Confidence | Evidence |

Then:

- **Related API** draft: deduplicated bullet list for the metadata table.
- **Gaps:** rows that stay Draft/TBD with suggested OpenAPI search terms or questions for the user.
- **Conflicts:** FD names a path that does not exist — show closest matches, do not silently substitute.

### 4. Update mode (only on request)

1. Write **Related API** and per-row **API / Logic** / Execution bullets using:

   - `GET /api/v2/...` style in tables, or
   - `<Human name> (METHOD /path)` in metadata, matching nearby designs in `docs/design/`.

2. Prefix unimplemented behaviour with **`Draft:`** or **`TBD:`** — never present a guessed path as Verified.

3. **Client-only** rows: one sentence (validation rule, permission gate, navigation) without a fake endpoint.

4. Do not expand **Backend** schema tables unless the user asked; this skill focuses on traceable REST and logic refs.

Do not commit unless the user asks.

## Quality rules

- **Never invent** `/api/...` paths. If not found after search, mark Draft/TBD.
- Prefer **v2/v3** paths as in OpenAPI; do not mix deprecated paths from old wiki copies without checking YAML.
- Plugin-only features: say which service (portal-backend vs linter) and trace extension config if REST is indirect.
- After a large update, suggest `postman-e2e-followup` only when the user cares about E2E impact.

## Related skills

- `apihub-functional-design` — document structure and Backend sections.
- `apihub-design-mockup-sync` — UI column links; run before or after API trace independently.
- `apihub-backend-developer` — when trace shows missing API and the user moves to implementation.

## Output checklist

- [ ] Every targeted row appears in the trace report
- [ ] Related API draft when metadata was empty or stale
- [ ] No new paths without Verified or Inferred evidence
- [ ] FD edited only in **update** mode and only in API-related cells/sections
