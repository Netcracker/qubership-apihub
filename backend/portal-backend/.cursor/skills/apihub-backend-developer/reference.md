# APIHub Backend Developer — Reference

Read this file when you need backend-specific examples or doc-routing detail. Keep `SKILL.md` as the workflow checklist. Generic patterns are in `apihub-go-developer/reference.md`.

## Doc routing (where to update documentation)

| Change type | Update |
|-------------|--------|
| New or changed REST contract | `docs/api/APIHUB_API.yaml` (+ Admin/Internal specs if applicable) |
| New feature with design notes | `docs/feature_design/<area>/` (see `docs/README.md`) |
| Operational / migration analysis | `docs/ops_migration_analysis_guide.md` |
| Local dev setup change | `docs/local_development/` |
| AI assistant behavior | `docs/feature_design/ai_assistant/` or `docs/static_resources_customization.md` |
| Minor implementation detail | Relevant existing guide only — **not** root `README.md` |

Full index: `docs/README.md`.

## Related repositories (Helm, E2E)

See [`docs/agent/related-repositories.md`](../../../docs/agent/related-repositories.md). Agents cannot edit those repos unless they are in the workspace; **remind** the developer with links when:

| Backend change | Likely follow-up |
|----------------|------------------|
| New env var / secret / feature flag | Helm `values.yaml`, templates, ConfigMap/Secret |
| New cron, probe, port, volume | Helm chart templates |
| New/changed REST API | Postman collection repo + `docs/api/*.yaml` |
| New auth or error contract | Postman assertions |

Update placeholder Helm URL in `related-repositories.md` when your team's chart repo is known.

## Error codes (`exception/ErrorCodes.go`)

**Good:**

```go
const ExampleNotFound = "999"
const ExampleNotFoundMsg = "Example with id = $id not found"
```

Use existing patterns for parameter placeholders (`$id`, `$param`, etc.). Do not inline error code strings in controllers or services.

## Service.go wiring

- Add `repository.New...` with other repository constructors (end of repository block).
- Add `service.New...` with other services (end of service block).
- Add `controller.New...` with other controllers (end of controller block).
- Use `log.Fatalf` when service construction failure must stop startup (see existing `AiChatService` wiring).

## Migration files

Naming: `{N}_{description}.up.sql` and `{N}_{description}.down.sql` where `N` is the next free integer.

Directory: `qubership-apihub-service/resources/migrations/`

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
