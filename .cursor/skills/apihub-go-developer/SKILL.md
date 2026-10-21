---
name: apihub-go-developer
description: Implements and modifies Go backend services in the APIHub ecosystem (controllers, services, repositories, entities, migrations, wiring, and OpenAPI). Use when adding or changing backend features, REST endpoints, SQL migrations, repository queries, or Go code in APIHub Go repositories.
---

# APIHub Go Developer

Follow the repository's `AGENTS.md` and deployed project rules. For examples, see [reference.md](reference.md).

## Before coding

1. Confirm requirements are clear; ask the user if not.
2. For GitHub tickets, use a ticket-planning skill first when planning from an issue.
3. Read relevant existing code paths before adding new types or endpoints.
4. Prefer established libraries over custom implementations.
5. **Bugfixes:** trace root cause (logs, call chain, repro); never ship swallow-and-default patches unless the user explicitly asked for a documented workaround.

## Implementation workflow

1. **API-first** — If REST contract changes, update OpenAPI under the repository's API docs before or alongside code.
2. **Layers** — controller → service → repository; entity/view DTOs as per existing patterns.
3. **Conventions** — no magic numbers; `http.StatusXXX` instead of raw status integers; repeated strings as constants; minimal comments; no route-mapping comments.
4. **Converters** — dependency-free `Make{Name}View` in `entity/` next to the struct.
5. **Wiring** — new repos/services/controllers at the **end** of their section in the service entry file; `log.Fatalf` for fatal startup wiring errors.
6. **Migrations** — next unique numeric prefix; paired up/down SQL when rollback is required; run the migration validation script if the repository provides one.
7. **SQL** — for non-trivial repository SQL, review indices, joins, cardinality, N+1.
8. **Docs** — update the appropriate doc per the repository documentation index; do not pollute root `README.md` for small features.
9. **CI linters** — follow deployed CI linter rules (EditorConfig tabs in Go strings, Markdown line length, textlint terms, valid relative links, OpenAPI hygiene).
10. **GitHub** — use `gh` for issues/PRs; recommend install if missing.

## Migration validation

When the repository ships a migration check script under this skill's directory, run it from the **repository root** after adding or renaming migration files:

**Linux / WSL / Git Bash:**

```bash
bash .cursor/skills/<skill-name>/scripts/check_migration_numbers.sh
```

**Windows PowerShell (native):**

```powershell
powershell -File .cursor/skills/<skill-name>/scripts/check_migration_numbers.ps1
```

Replace `<skill-name>` with the repository-specific skill that bundles the script (for example `apihub-backend-developer`). Fix any reported duplicate numbers before finishing.

## Completion checklist

Before telling the user the task is done, verify:

- [ ] Requirements met; assumptions stated if any remain.
- [ ] **Root cause** addressed (bugfixes); no error swallowing or unapproved silent fallbacks.
- [ ] Go conventions followed.
- [ ] REST changes reflected in OpenAPI specs when applicable.
- [ ] Migrations use unique prefix (validation script passed when available).
- [ ] Documentation updated in the correct file (not root readme for minor items).
- [ ] CI linter rules applied: line length, links, Go tab indentation in strings.
- [ ] Complex SQL performance considered.
- [ ] Proposed **one** concise conventional-commit message (subject + optional body).

Suggest invoking a self-review skill in a **new chat** or with a **different model** for an independent pass over the diff.
