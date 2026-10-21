---
name: postman-e2e-followup
description: Decide whether a backend change requires updates in the Newman E2E collections under tests/postman-collections and list the concrete requests and assertions to add or change. Use after REST or OpenAPI contract changes in backend/portal-backend, not when authoring collections themselves (use postman-e2e-authoring then).
---

# Postman E2E follow-up (from the backend)

The E2E collections are in this repository (`tests/postman-collections`), so the follow-up belongs in the same change
as the backend edit. Decide whether the backend change touches them and name the edits.

## Where things are

| Field | Value |
|-------|-------|
| **Collections** | `tests/postman-collections/e2e/`, `Syntetic_test_data.postman_collection.json`, `use_cases/` |
| **Backend docs** | `backend/portal-backend/docs/postman_collections.md`, `backend/portal-backend/docs/postman/` (examples) |
| **OpenAPI contract** | `backend/portal-backend/docs/api/` |
| **CI wiring** | `.github/workflows/e2e-tests-*.yml` and `tools/ci/e2e-collections.sh` |

## Check these when the backend change includes any of

- New or changed **REST endpoints** (method, path, query, headers).
- Changed **request or response** JSON shape or status codes.
- New **auth** or permission behaviour worth asserting in integration tests.
- New **error codes** or validation rules that E2E suites should cover.

## Output

When a criterion matches, finish your message with a short section:

```markdown
### E2E follow-up
- Collection: <file under tests/postman-collections/e2e/>
- Requests and assertions: <what to add or update; align with the OpenAPI in backend/portal-backend/docs/api/>
```

Then apply the `postman-e2e-authoring` skill to make the edits. Omit the section when no E2E impact is likely
(internal refactors, non-REST changes).
