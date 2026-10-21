# APIHub Backend Developer — Reference

Read this file when you need backend-specific examples or doc-routing detail. Keep `SKILL.md` as the workflow checklist. Generic patterns are in `apihub-go-developer/reference.md`.

## Doc routing (where to update documentation)

| Change type | Update |
|-------------|--------|
| New or changed REST contract | `docs/api/APIHUB_API.yaml` (+ Admin/Internal specs if applicable) |
| New feature with design notes | `docs/design/<area>/` in the repository root (see `docs/design/README.md`) |
| Operational / migration analysis | `docs/administration/operations-migration-analysis.md` (repository root `docs/`) |
| Local dev setup change | `docs/development/local-run.md` (repository root `docs/`) |
| AI assistant behavior | `docs/design/ai-assistant/` (repository root) or `docs/administration/static-resources-customization.md` (repository root `docs/`) |
| Minor implementation detail | Relevant existing guide only — **not** root `README.md` |

Full index: `docs/README.md`.

## Related repositories (Helm, E2E)

See `backend/README.md`, section "Follow-up in other modules". Agents cannot edit those repos unless they are in the workspace; **remind** the developer with links when:

| Backend change | Likely follow-up |
|----------------|------------------|
| New env var / secret / feature flag | Helm `values.yaml`, templates, ConfigMap/Secret |
| New cron, probe, port, volume | Helm chart templates |
| New/changed REST API | Postman collection repo + `docs/api/*.yaml` |
| New auth or error contract | Postman assertions |

## Error codes (`exception/ErrorCodes.go`)

**Good:**

```go
const ExampleNotFound = "999"
const ExampleNotFoundMsg = "Example with id = $id not found"
```

Use existing patterns for parameter placeholders (`$id`, `$param`, etc.). Do not inline error code strings in controllers or services.

## main.go wiring

- Add `repository.New...` with other repository constructors (end of repository block).
- Add `service.New...` with other services (end of service block).
- Add `controller.New...` with other controllers (end of controller block).
- Use `log.Fatalf` when service construction failure must stop startup (see existing `AiChatService` wiring).

## Migration files

Naming: `{N}_{description}.up.sql` and `{N}_{description}.down.sql` where `N` is the next free integer.
Provide the down file unless the migration is a data fix that cannot be reverted.

Directory: `resources/migrations/`

Validate (from repository root):

```bash
bash .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.sh
```

```powershell
powershell -File .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.ps1
```

## Further reading

- `AGENTS.md` — agent contract (loaded every session)
- `docs/development_guide.md` — API-first, logging, deprecation, PR conventions
