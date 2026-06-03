---
name: apihub-backend-developer
description: "Implements and modifies the APIHub Go backend (qubership-apihub-service): controllers, services, repositories, entities, migrations, Service.go wiring, ErrorCodes, and OpenAPI specs. Use when adding or changing backend features, REST endpoints, SQL migrations, repository queries, or Go code in qubership-apihub-backend."
---

# APIHub Backend Developer

**Follow `apihub-go-developer` first** — this skill adds backend-specific rules for `qubership-apihub-backend` only.

Follow `AGENTS.md` and project rules. For examples and doc routing, see [reference.md](reference.md).

## Backend-specific workflow

1. **Errors** — new API error codes/messages as constants in `exception/ErrorCodes.go`.
2. **Wiring** — new repos/services/controllers at the **end** of their section in `Service.go`; `log.Fatalf` for fatal startup wiring errors.
3. **Migrations** — files in `qubership-apihub-service/resources/migrations/`; run validation script (below).
4. **OpenAPI** — update `docs/api/*.yaml` per the file list in deployed rules.
5. **Related repos** — before finishing, apply `apihub-deployment-followup` and
   `postman-e2e-followup` skills when the change may affect deployment or E2E tests
   (installed from sibling repositories via APM).

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

## Completion checklist (backend additions)

In addition to the `apihub-go-developer` checklist:

- [ ] Go conventions and `Service.go` / `ErrorCodes.go` rules followed.
- [ ] REST changes reflected in `docs/api/*.yaml`.
- [ ] Migrations use unique prefix (script passed).
- [ ] **Related repositories** — deployment and Postman follow-up skills applied when applicable (`apihub-deployment-followup`, `postman-e2e-followup`).

Suggest invoking `apihub-backend-self-review` in a **new chat** or with a **different model** for an independent pass over the diff.
