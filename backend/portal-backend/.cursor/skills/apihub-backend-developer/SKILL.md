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
5. **Bug fixes:** trace root cause (logs, call chain, repro); never ship swallow-and-default patches unless the user explicitly asked for a documented workaround.

## Implementation workflow

1. **API-first** — If REST contract changes, update OpenAPI under `docs/api/` before or alongside code (`docs/development_guide.md`).
2. **Layers** — controller → service → repository; entity/view DTOs as per existing patterns.
3. **Conventions** — no magic numbers; no duplicate config defaults (viper + `validate` tags only); `http.StatusXXX` instead of raw status integers; repeated strings as constants; minimal comments; no route-mapping comments.
4. **Converters** — dependency-free `Make{Name}View` in `entity/` next to the struct.
5. **Wiring** — new repos/services/controllers at the **end** of their section in `Service.go`; `log.Fatalf` for fatal startup wiring errors.
6. **Errors** — new API error codes/messages as constants in `exception/ErrorCodes.go`.
7. **Migrations** — next unique numeric prefix; paired up/down SQL; run validation script (below).
8. **SQL** — for non-trivial repository SQL, review indexes, joins, cardinality, N+1.
9. **Docs** — update the appropriate doc per `docs/README.md`; do not pollute root `README.md` for small features.
10. **CI linters** — follow `.cursor/rules/ci-linters.mdc` (EditorConfig tabs in Go strings, Markdown ≤400 chars, textlint terms, valid relative links, OpenAPI hygiene).
11. **GitHub** — use `gh` for issues/PRs; recommend install if missing.
12. **Related repos** — if the change touches deploy config, env vars, or REST contracts, remind the developer about Helm charts and/or Postman E2E repos per [docs/agent/related-repositories.md](../../../docs/agent/related-repositories.md) (no clone required).

## Migration validation

After adding or renaming migration files, from the **repository root**:

**Linux / WSL / Git Bash:**

```bash
bash .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.sh
```

**Windows PowerShell (native):**

```powershell
powershell -File .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.ps1
```

Fix any reported duplicate numbers before finishing.

## Completion checklist

Before telling the user the task is done, verify:

- [ ] Requirements met; assumptions stated if any remain.
- [ ] **Root cause** addressed (bug fixes); no error swallowing or unapproved silent fallbacks.
- [ ] Go conventions and `Service.go` / `ErrorCodes.go` rules followed.
- [ ] REST changes reflected in `docs/api/*.yaml`.
- [ ] Migrations use unique prefix (script passed).
- [ ] Documentation updated in the correct file (not root README for minor items).
- [ ] CI linter rules applied (`.cursor/rules/ci-linters.mdc`): line length, links, Go tab indentation in strings.
- [ ] Complex SQL performance considered.
- [ ] **Related repositories** — if applicable, reminded developer about Helm and/or Postman E2E updates (see `docs/agent/related-repositories.md`).
- [ ] Proposed **one** concise conventional-commit message (subject + optional body).

### Related repositories (reminder block)

When the feature matches criteria in `docs/agent/related-repositories.md`, end your message with:

```markdown
### Related repositories (follow-up outside this repo)
- **Helm**: <what to check + repo URL from related-repositories.md>
- **E2E Postman**: <what to add/update + repo URL>
```

Omit sections that do not apply.

Suggest invoking `apihub-self-review` in a **new chat** or with a **different model** for an independent pass over the diff.
