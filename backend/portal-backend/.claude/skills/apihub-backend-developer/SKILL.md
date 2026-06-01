---
name: apihub-backend-developer
description: Implements and modifies the APIHub Go backend (qubership-apihub-service): controllers, services, repositories, entities, migrations, Service.go wiring, ErrorCodes, and OpenAPI specs. Use when adding or changing backend features, REST endpoints, SQL migrations, repository queries, or Go code in this repository.
---

# APIHub Backend Developer

Follow `AGENTS.md` and project rules. For examples and doc routing, see [reference.md](reference.md).

## Before coding

1. Confirm requirements are clear; ask the user if not.
2. For GitHub tickets, use `github-ticket-implementation-planner` first when planning from an issue.
3. Read relevant existing code paths before adding new types or endpoints.
4. Prefer established libraries over custom implementations.

## Implementation workflow

1. **API-first** — If REST contract changes, update OpenAPI under `docs/api/` before or alongside code (`docs/development_guide.md`).
2. **Layers** — controller → service → repository; entity/view DTOs as per existing patterns.
3. **Conventions** — no magic numbers; no duplicate config defaults (viper + `validate` tags only); repeated strings as constants; minimal comments; no route-mapping comments.
4. **Converters** — dependency-free `Make{Name}View` in `entity/` next to the struct.
5. **Wiring** — new repos/services/controllers at the **end** of their section in `Service.go`; `log.Fatalf` for fatal startup wiring errors.
6. **Errors** — new API error codes/messages as constants in `exception/ErrorCodes.go`.
7. **Migrations** — next unique numeric prefix; paired up/down SQL; run validation script (below).
8. **SQL** — for non-trivial repository SQL, review indexes, joins, cardinality, N+1.
9. **Docs** — update the appropriate doc per `docs/README.md`; do not pollute root `README.md` for small features.
10. **CI linters** — follow `.cursor/rules/ci-linters.mdc` (see `AGENTS.md` § CI linters).
11. **GitHub** — use `gh` for issues/PRs; recommend install if missing.

## Migration validation

After adding or renaming migration files:

```bash
bash .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.sh
```

Fix any reported duplicate numbers before finishing.

## Completion checklist

Before telling the user the task is done, verify:

- [ ] Requirements met; assumptions stated if any remain.
- [ ] Go conventions and `Service.go` / `ErrorCodes.go` rules followed.
- [ ] REST changes reflected in `docs/api/*.yaml`.
- [ ] Migrations use unique prefix (script passed).
- [ ] Documentation updated in the correct file (not root README for minor items).
- [ ] Complex SQL performance considered.
- [ ] Proposed **one** concise conventional-commit message (subject + optional body).

Suggest invoking `apihub-self-review` in a **new chat** or with a **different model** for an independent pass over the diff.
