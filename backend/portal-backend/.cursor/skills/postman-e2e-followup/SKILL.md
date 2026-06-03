---
name: postman-e2e-followup
description: Decide whether a backend change requires follow-up in qubership-apihub-postman-collections (Newman E2E) and remind the developer with concrete actions. Use after REST or OpenAPI contract changes in the backend — not when authoring collections inside the Postman repo itself.
---

# Postman E2E follow-up (from backend)

**Do not edit** `qubership-apihub-postman-collections` unless that repository is open
in the workspace. Remind the developer when backend work likely needs E2E collection
updates.

## Repository

| Field | Value |
|-------|--------|
| **Repo** | https://github.com/Netcracker/qubership-apihub-postman-collections |
| **Backend docs** | `docs/postman_collections.md`, `docs/postman/` (examples; canonical collections are external) |
| **CI wiring** | `postman-collections-list` in `qubership-apihub-ci` `run-e2e-tests.yml` |

## Remind when the backend change includes any of

- New or changed **REST endpoints** (method, path, query, headers).
- Changed **request or response** JSON shape or status codes.
- New **auth** or permission behaviour worth asserting in integration tests.
- New **error codes** or validation rules that E2E suites should cover.

## Reminder format

When criteria match, end your message with:

```markdown
### Related repositories (follow-up outside this repo)
- **E2E Postman** ([qubership-apihub-postman-collections](https://github.com/Netcracker/qubership-apihub-postman-collections)): <concrete requests/tests to add or update; align with OpenAPI in docs/api/> 
```

Omit the section when no E2E impact is likely (internal refactors, non-REST changes).

## For authors working inside the Postman repo

Use the `postman-e2e-authoring` skill in that repository instead — this skill only
covers **cross-repo reminders** from backend work.
